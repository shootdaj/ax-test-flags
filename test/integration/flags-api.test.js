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
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('Flags API Integration Tests', () => {
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

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request('GET', '/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.ok(res.body.timestamp);
      assert.ok(res.body.version);
      server.close();
    });
  });

  describe('POST /api/flags', () => {
    it('should create a flag', async () => {
      const res = await request('POST', '/api/flags', { name: 'test-flag', description: 'A test' });
      assert.equal(res.status, 201);
      assert.ok(res.body.id);
      assert.equal(res.body.name, 'test-flag');
      assert.equal(res.body.description, 'A test');
      assert.equal(res.body.enabled, false);
      server.close();
    });

    it('should return 400 for missing name', async () => {
      const res = await request('POST', '/api/flags', {});
      assert.equal(res.status, 400);
      assert.ok(res.body.error);
      server.close();
    });
  });

  describe('GET /api/flags', () => {
    it('should return all flags', async () => {
      await request('POST', '/api/flags', { name: 'flag-1' });
      await request('POST', '/api/flags', { name: 'flag-2' });
      const res = await request('GET', '/api/flags');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 2);
      server.close();
    });

    it('should return empty array when no flags', async () => {
      const res = await request('GET', '/api/flags');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, []);
      server.close();
    });
  });

  describe('GET /api/flags/:id', () => {
    it('should return a specific flag', async () => {
      const created = await request('POST', '/api/flags', { name: 'test-flag' });
      const res = await request('GET', `/api/flags/${created.body.id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.name, 'test-flag');
      server.close();
    });

    it('should return 404 for nonexistent flag', async () => {
      const res = await request('GET', '/api/flags/nonexistent');
      assert.equal(res.status, 404);
      server.close();
    });
  });

  describe('PUT /api/flags/:id', () => {
    it('should update a flag', async () => {
      const created = await request('POST', '/api/flags', { name: 'old-name' });
      const res = await request('PUT', `/api/flags/${created.body.id}`, { name: 'new-name', enabled: true });
      assert.equal(res.status, 200);
      assert.equal(res.body.name, 'new-name');
      assert.equal(res.body.enabled, true);
      server.close();
    });

    it('should return 404 for nonexistent flag', async () => {
      const res = await request('PUT', '/api/flags/nonexistent', { name: 'test' });
      assert.equal(res.status, 404);
      server.close();
    });
  });

  describe('DELETE /api/flags/:id', () => {
    it('should delete a flag', async () => {
      const created = await request('POST', '/api/flags', { name: 'test-flag' });
      const res = await request('DELETE', `/api/flags/${created.body.id}`);
      assert.equal(res.status, 204);

      const getRes = await request('GET', `/api/flags/${created.body.id}`);
      assert.equal(getRes.status, 404);
      server.close();
    });

    it('should return 404 for nonexistent flag', async () => {
      const res = await request('DELETE', '/api/flags/nonexistent');
      assert.equal(res.status, 404);
      server.close();
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const res = await request('GET', '/api/flags');
      assert.equal(res.headers['access-control-allow-origin'], '*');
      server.close();
    });
  });
});
