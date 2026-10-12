const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const MAX_FILES = 12;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function safeFilename(filename) {
  const cleaned = String(filename || 'reference')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-100);
  return cleaned || 'reference';
}

function asText(value, max = 3000) {
  if (Array.isArray(value)) return value.map((v) => asText(v, max)).join(', ').slice(0, max);
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, max);
}

function sniffContentType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP') return 'image/webp';
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-') return 'application/pdf';
  return '';
}

function toBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function readableSummary(data, storedFiles) {
  const labels = {
    name: 'Client name', email: 'Email', phone: 'Mobile number', contact_preference: 'Preferred contact method',
    project_type: 'Project type', project_location: 'Project location', lot_area_sqm: 'Lot area (m²)',
    lot_shape: 'Lot shape', lot_width_m: 'Lot frontage (m)', lot_depth_m: 'Lot depth (m)', storeys: 'Preferred storeys',
    target_floor_area_sqm: 'Target floor area (m²)', site_conditions: 'Site conditions', site_notes: 'Site notes', spaces: 'Required spaces',
    bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', other_spaces: 'Other spaces / room details',
    style_preferences: 'Style preferences', construction_budget: 'Estimated construction budget',
    target_timeline: 'Target timeline', priorities: 'Design priorities', vision_notes: 'Additional notes'
  };
  const lines = [
    'A new project brief has been submitted through the C + D Architectural Design Services website.',
    '',
    `Submitted: ${new Date().toISOString()}`,
    ''
  ];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'consent' || key === 'website') continue;
    const display = Array.isArray(value) ? value.join(', ') : String(value ?? '').trim();
    if (!display) continue;
    lines.push(`${labels[key] || key.replace(/_/g, ' ')}: ${display}`);
  }
  lines.push('', 'Uploaded references:');
  if (storedFiles.length) storedFiles.forEach((file) => lines.push(`- ${file.originalName} (${file.contentType}, ${Math.ceil(file.size / 1024)} KB)`));
  else lines.push('- No files attached.');
  lines.push('', 'Files are also stored in the configured private R2 bucket; their object keys are recorded with this inquiry.');
  return lines.join('\n');
}

export async function onRequestPost({ request, env }) {
  if (!env.CD_PROJECTS || !env.CD_UPLOADS) {
    return jsonResponse({ ok: false, error: 'The project submission service is not fully configured yet.' }, 503);
  }

  const contentType = request.headers.get('content-type') || '';
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    return jsonResponse({ ok: false, error: 'The upload is too large. Please keep all files under 10 MB total.' }, 413);
  }
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return jsonResponse({ ok: false, error: 'Please submit the inquiry using the website form.' }, 415);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (_) {
    return jsonResponse({ ok: false, error: 'The form data could not be read. Please try again.' }, 400);
  }

  // Honeypot: silently accept bots without storing or notifying on their submissions.
  if (asText(formData.get('website'), 300)) return jsonResponse({ ok: true, notificationSent: true });

  let data;
  try {
    data = JSON.parse(asText(formData.get('submission'), 25000));
  } catch (_) {
    return jsonResponse({ ok: false, error: 'Some form details appear to be missing. Please review your brief and try again.' }, 400);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return jsonResponse({ ok: false, error: 'The submitted project details were not valid.' }, 400);
  }

  data.name = asText(data.name, 120);
  data.email = asText(data.email, 254);
  data.phone = asText(data.phone, 40);
  data.project_type = asText(data.project_type, 100);
  data.project_location = asText(data.project_location, 220);
  if (!data.name || !data.project_type || !data.project_location || data.consent !== true || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return jsonResponse({ ok: false, error: 'Please check your name, email, project type, and project location.' }, 400);
  }
  if (JSON.stringify(data).length > 25000) {
    return jsonResponse({ ok: false, error: 'The text in this brief is too long. Please shorten your notes and try again.' }, 413);
  }

  const candidates = formData.getAll('attachments').filter((entry) => entry && typeof entry === 'object' && 'arrayBuffer' in entry && 'name' in entry && entry.size > 0);
  if (candidates.length > MAX_FILES) {
    return jsonResponse({ ok: false, error: `Please upload no more than ${MAX_FILES} files.` }, 413);
  }
  const totalBytes = candidates.reduce((total, file) => total + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return jsonResponse({ ok: false, error: 'The uploaded files exceed 10 MB in total. Please use smaller files and try again.' }, 413);
  }
  const verifiedCandidates = [];
  for (const file of candidates) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const detectedType = sniffContentType(bytes);
    if (!detectedType || !ALLOWED_TYPES.has(detectedType) || (file.type && file.type !== detectedType)) {
      return jsonResponse({ ok: false, error: 'One of the files is not a supported JPG, PNG, WEBP, or PDF. Please check the file and try again.' }, 415);
    }
    verifiedCandidates.push({ file, bytes, detectedType });
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const storedFiles = [];
  const uploadedKeys = [];

  try {
    for (const item of verifiedCandidates) {
      const { file, bytes, detectedType } = item;
      const originalName = asText(file.name, 180) || 'reference';
      const key = `inquiries/${id}/${crypto.randomUUID()}-${safeFilename(originalName)}`;
      await env.CD_UPLOADS.put(key, bytes, {
        httpMetadata: { contentType: detectedType },
        customMetadata: { inquiryId: id, originalName: originalName.slice(0, 180) }
      });
      uploadedKeys.push(key);
      storedFiles.push({ objectKey: key, originalName: originalName.slice(0, 180), contentType: detectedType, size: file.size, bytes });
    }

    const attachmentRecord = storedFiles.map(({ objectKey, originalName, contentType: type, size }) => ({ objectKey, originalName, contentType: type, size }));
    await env.CD_PROJECTS.prepare(
      `INSERT INTO project_inquiries (id, created_at, client_name, email, phone, project_type, project_location, status, data_json, attachments_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`
    ).bind(
      id, createdAt, data.name, data.email, data.phone, data.project_type, data.project_location,
      JSON.stringify(data), JSON.stringify(attachmentRecord)
    ).run();

    let notificationSent = false;
    if (env.RESEND_API_KEY && env.NOTIFY_EMAIL && env.FROM_EMAIL) {
      try {
        const summary = readableSummary(data, storedFiles);
        const emailAttachments = storedFiles.map((file) => ({
          filename: file.originalName,
          content: toBase64(file.bytes)
        }));
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: env.FROM_EMAIL,
            to: [env.NOTIFY_EMAIL],
            reply_to: data.email,
            subject: `New architectural inquiry: ${asText(data.name, 100).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ')}`,
            text: summary,
            attachments: emailAttachments
          })
        });
        notificationSent = emailResponse.ok;
        if (!emailResponse.ok) console.error('Inquiry saved, but notification email failed:', emailResponse.status, await emailResponse.text());
      } catch (error) {
        console.error('Inquiry saved, but notification email could not be sent:', error);
      }
    }

    return jsonResponse({ ok: true, id, notificationSent });
  } catch (error) {
    console.error('Project brief submission failed:', error);
    await Promise.all(uploadedKeys.map((key) => env.CD_UPLOADS.delete(key).catch(() => undefined)));
    return jsonResponse({ ok: false, error: 'We could not save your brief right now. Please try again shortly.' }, 500);
  } finally {
    // Do not retain uploaded file buffers after the request completes.
    storedFiles.forEach((file) => { file.bytes = null; });
  }
}
