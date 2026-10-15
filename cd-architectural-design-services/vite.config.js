import { defineConfig } from 'vite';
import Busboy from 'busboy';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resolve } from 'node:path';

const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const MAX_FILES = 12;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function safeFilename(value) {
  const cleaned = String(value || 'reference')
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
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.length >= 5 && bytes.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  return '';
}

async function parseMultipart(req) {
  const fields = {};
  const files = [];
  let fileBytes = 0;
  let parseError = null;

  return new Promise((resolve, reject) => {
    let parser;
    try {
      parser = Busboy({
        headers: req.headers,
        limits: { files: MAX_FILES, fields: 30, parts: 45, fieldSize: 30000, fileSize: MAX_TOTAL_BYTES }
      });
    } catch (error) {
      reject(error);
      return;
    }

    parser.on('field', (name, value, info) => {
      if (info.valueTruncated) parseError = 'One of the text fields is too long. Please shorten it and try again.';
      fields[name] = value;
    });

    parser.on('file', (fieldName, stream, info) => {
      const chunks = [];
      let size = 0;
      const originalName = info.filename || 'reference';
      const contentType = (info.mimeType || 'application/octet-stream').toLowerCase();

      stream.on('data', (chunk) => {
        size += chunk.length;
        fileBytes += chunk.length;
        if (fileBytes > MAX_TOTAL_BYTES) parseError = 'Please keep all reference files under 10 MB total.';
        if (size <= MAX_TOTAL_BYTES && fileBytes <= MAX_TOTAL_BYTES) chunks.push(chunk);
      });
      stream.on('limit', () => { parseError = 'One of the files is too large. Please keep all files under 10 MB total.'; });
      stream.on('end', () => {
        if (originalName && size > 0) {
          files.push({ fieldName, originalName, contentType, size, buffer: Buffer.concat(chunks) });
        }
      });
    });

    parser.on('filesLimit', () => { parseError = `Please upload no more than ${MAX_FILES} files.`; });
    parser.on('fieldsLimit', () => { parseError = 'The form contains too many fields.'; });
    parser.on('partsLimit', () => { parseError = 'The form contains too many parts.'; });
    parser.on('error', reject);
    parser.on('finish', () => resolve({ fields, files, fileBytes, parseError }));
    req.pipe(parser);
  });
}

function localInquiryInbox() {
  return {
    name: 'local-inquiry-inbox',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        if (pathname !== '/api/submit') return next();
        if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Use the project inquiry form to submit a brief.' });

        const contentLength = Number(req.headers['content-length'] || 0);
        if (contentLength > MAX_REQUEST_BYTES) {
          return json(res, 413, { ok: false, error: 'The upload is too large. Please keep all reference files under 10 MB total.' });
        }
        if (!(req.headers['content-type'] || '').toLowerCase().includes('multipart/form-data')) {
          return json(res, 415, { ok: false, error: 'Please submit the inquiry using the website form.' });
        }

        let parsed;
        try {
          parsed = await parseMultipart(req);
        } catch (error) {
          console.error('Could not parse local demo inquiry:', error);
          return json(res, 400, { ok: false, error: 'The form data could not be read. Please try again.' });
        }
        const { fields, files, fileBytes, parseError } = parsed;
        if (parseError) return json(res, 413, { ok: false, error: parseError });

        // Match the production honeypot behavior so bots are not recorded during local testing.
        if (asText(fields.website, 300)) return json(res, 200, { ok: true, notificationSent: false, localDemo: true });

        let data;
        try { data = JSON.parse(asText(fields.submission, 25000)); }
        catch (_) { return json(res, 400, { ok: false, error: 'Some form details appear to be missing. Please review your brief and try again.' }); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          return json(res, 400, { ok: false, error: 'The submitted project details were not valid.' });
        }
        data.name = asText(data.name, 120);
        data.email = asText(data.email, 254);
        data.phone = asText(data.phone, 40);
        data.project_type = asText(data.project_type, 100);
        data.project_location = asText(data.project_location, 220);
        if (!data.name || !data.project_type || !data.project_location || data.consent !== true || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          return json(res, 400, { ok: false, error: 'Please check your name, email, project type, and project location.' });
        }
        if (JSON.stringify(data).length > 25000) return json(res, 413, { ok: false, error: 'The text in this brief is too long. Please shorten your notes and try again.' });
        if (files.length > MAX_FILES || fileBytes > MAX_TOTAL_BYTES) return json(res, 413, { ok: false, error: 'Please upload no more than 12 files and keep them under 10 MB total.' });
        for (const file of files) {
          const detectedType = sniffContentType(file.buffer);
          if (!detectedType || !ALLOWED_TYPES.has(detectedType) || (file.contentType !== 'application/octet-stream' && file.contentType !== detectedType)) {
            return json(res, 415, { ok: false, error: 'One of the files is not a supported JPG, PNG, WEBP, or PDF. Please check the file and try again.' });
          }
          file.contentType = detectedType;
        }

        const id = randomUUID();
        const submittedAt = new Date().toISOString();
        const dataDirectory = path.resolve(process.cwd(), '.local-data');
        const uploadsDirectory = path.join(dataDirectory, 'uploads');
        await mkdir(uploadsDirectory, { recursive: true });
        const attachments = [];
        try {
          for (const file of files) {
            const savedName = `${id}-${randomUUID()}-${safeFilename(file.originalName)}`;
            await writeFile(path.join(uploadsDirectory, savedName), file.buffer, { flag: 'wx' });
            attachments.push({
              originalName: file.originalName.slice(0, 180),
              contentType: file.contentType,
              size: file.size,
              localPath: `.local-data/uploads/${savedName}`
            });
          }

          const inboxPath = path.join(dataDirectory, 'inquiries.json');
          let inquiries = [];
          try { inquiries = JSON.parse(await readFile(inboxPath, 'utf8')); }
          catch (error) { if (error.code !== 'ENOENT') throw error; }
          if (!Array.isArray(inquiries)) inquiries = [];
          inquiries.unshift({
            id,
            submittedAt,
            clientName: data.name,
            email: data.email,
            phone: data.phone,
            projectType: data.project_type,
            projectLocation: data.project_location,
            status: 'new-demo-only',
            data,
            attachments
          });
          await writeFile(inboxPath, `${JSON.stringify(inquiries, null, 2)}\n`, 'utf8');
        } catch (error) {
          console.error('Could not save local demo inquiry:', error);
          return json(res, 500, { ok: false, error: 'The local demo could not save this brief. Please check folder permissions and try again.' });
        }

        console.info(`Saved local-only architectural inquiry ${id} to .local-data/inquiries.json`);
        return json(res, 200, { ok: true, id, notificationSent: false, localDemo: true });
      });
    }
  };
}

function copyCloudflareHeaders() {
  return {
    name: 'copy-cloudflare-headers',
    async closeBundle() {
      const outputDirectory = resolve(process.cwd(), 'dist');
      await mkdir(outputDirectory, { recursive: true });
      await copyFile(resolve(process.cwd(), 'public/_headers'), resolve(outputDirectory, '_headers'));
    }
  };
}

export default defineConfig({
  root: 'public',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'public/index.html'),
        approach: resolve(process.cwd(), 'public/approach.html'),
        services: resolve(process.cwd(), 'public/services.html'),
        directions: resolve(process.cwd(), 'public/design-directions.html'),
        process: resolve(process.cwd(), 'public/process.html'),
        buildHome: resolve(process.cwd(), 'public/build-home.html'),
        faq: resolve(process.cwd(), 'public/faq.html'),
        contact: resolve(process.cwd(), 'public/contact.html'),
        brief: resolve(process.cwd(), 'public/project-brief.html'),
        privacy: resolve(process.cwd(), 'public/privacy.html')
      }
    }
  },
  plugins: [localInquiryInbox(), copyCloudflareHeaders()]
});
