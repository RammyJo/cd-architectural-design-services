import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/submit.js';

const validPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/8X8AAAAASUVORK5CYII=',
  'base64'
);

function createEnvironment() {
  const state = { inserts: [], uploads: [], deleted: [] };
  const env = {
    CD_PROJECTS: {
      prepare(sql) {
        return {
          bind(...values) {
            return {
              async run() {
                state.inserts.push({ sql, values });
                return { success: true };
              }
            };
          }
        };
      }
    },
    CD_UPLOADS: {
      async put(key, bytes, options) {
        state.uploads.push({ key, bytes: Buffer.from(bytes), options });
      },
      async delete(key) {
        state.deleted.push(key);
      }
    }
  };
  return { env, state };
}

function createSubmission({ website = '', file = null } = {}) {
  const form = new FormData();
  form.append('submission', JSON.stringify({
    name: 'Sample Client',
    email: 'sample@example.com',
    phone: '',
    project_type: 'New home',
    project_location: 'San Fernando, La Union',
    consent: true
  }));
  form.append('website', website);
  if (file) form.append('attachments', file, 'site-plan.png');
  return new Request('https://cd.example.test/api/submit', {
    method: 'POST',
    body: form
  });
}

test('requires configured storage bindings before accepting inquiries', async () => {
  const response = await onRequestPost({
    request: createSubmission(),
    env: {}
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).ok, false);
});

test('rejects requests that are not multipart form submissions', async () => {
  const { env } = createEnvironment();
  const request = new Request('https://cd.example.test/api/submit', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: 'not a form'
  });
  const response = await onRequestPost({ request, env });
  assert.equal(response.status, 415);
});

test('rejects a file whose content does not match its claimed image type', async () => {
  const { env, state } = createEnvironment();
  const file = new Blob(['not really a PNG'], { type: 'image/png' });
  const response = await onRequestPost({
    request: createSubmission({ file }),
    env
  });
  assert.equal(response.status, 415);
  assert.equal(state.uploads.length, 0);
  assert.equal(state.inserts.length, 0);
});

test('stores a valid inquiry and its verified attachment, without claiming an email was sent', async () => {
  const { env, state } = createEnvironment();
  const file = new Blob([validPng], { type: 'image/png' });
  const response = await onRequestPost({
    request: createSubmission({ file }),
    env
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
  assert.equal(result.notificationSent, false);
  assert.equal(state.inserts.length, 1);
  assert.equal(state.uploads.length, 1);
  assert.equal(state.uploads[0].options.httpMetadata.contentType, 'image/png');
  assert.match(state.uploads[0].key, /^inquiries\/[a-f0-9-]+\//);
  assert.match(state.inserts[0].sql, /INSERT INTO project_inquiries/);
});

test('silently discards honeypot submissions without saving or uploading', async () => {
  const { env, state } = createEnvironment();
  const response = await onRequestPost({
    request: createSubmission({ website: 'bot-filled-this' }),
    env
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
  assert.equal(state.inserts.length, 0);
  assert.equal(state.uploads.length, 0);
});
