'use strict';

const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../../src/app');
const { store } = require('../../src/store');

let server;
let baseUrl;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Scenario: Full Flag Lifecycle', () => {
  beforeEach(async () => {
    store.reset();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  after(() => {
    if (server) server.close();
  });

  it('should support complete flag create-read-update-delete lifecycle', async () => {
    // 1. Create a flag
    const createRes = await request('POST', '/api/flags', {
      name: 'dark-mode',
      description: 'Enable dark mode for users'
    });
    assert.equal(createRes.status, 201);
    const flagId = createRes.body.id;
    assert.ok(flagId);
    assert.equal(createRes.body.name, 'dark-mode');

    // 2. List flags — should contain the new flag
    const listRes = await request('GET', '/api/flags');
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.length, 1);
    assert.equal(listRes.body[0].name, 'dark-mode');

    // 3. Get the specific flag
    const getRes = await request('GET', `/api/flags/${flagId}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.name, 'dark-mode');
    assert.equal(getRes.body.enabled, false);

    // 4. Update the flag
    const updateRes = await request('PUT', `/api/flags/${flagId}`, {
      name: 'dark-mode-v2',
      description: 'Updated dark mode',
      enabled: true
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.name, 'dark-mode-v2');
    assert.equal(updateRes.body.enabled, true);

    // 5. Verify the update persisted
    const verifyRes = await request('GET', `/api/flags/${flagId}`);
    assert.equal(verifyRes.body.name, 'dark-mode-v2');
    assert.equal(verifyRes.body.enabled, true);

    // 6. Delete the flag
    const deleteRes = await request('DELETE', `/api/flags/${flagId}`);
    assert.equal(deleteRes.status, 204);

    // 7. Verify deletion
    const notFoundRes = await request('GET', `/api/flags/${flagId}`);
    assert.equal(notFoundRes.status, 404);

    // 8. List should be empty
    const emptyListRes = await request('GET', '/api/flags');
    assert.equal(emptyListRes.body.length, 0);

    server.close();
  });

  it('should validate inputs throughout lifecycle', async () => {
    // Try to create with empty name
    const badCreate = await request('POST', '/api/flags', { name: '' });
    assert.equal(badCreate.status, 400);

    // Create a valid flag
    const good = await request('POST', '/api/flags', { name: 'valid-flag' });
    assert.equal(good.status, 201);

    // Try to update with empty name
    const badUpdate = await request('PUT', `/api/flags/${good.body.id}`, { name: '' });
    assert.equal(badUpdate.status, 400);

    // Try to get nonexistent
    const notFound = await request('GET', '/api/flags/fake-id');
    assert.equal(notFound.status, 404);

    // Try to delete nonexistent
    const delNotFound = await request('DELETE', '/api/flags/fake-id');
    assert.equal(delNotFound.status, 404);

    server.close();
  });
});
