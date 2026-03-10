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
      headers: { 'Content-Type': 'application/json', ...headers }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Environment API Integration Tests', () => {
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

  describe('PUT /api/flags/:id/environments/:env', () => {
    it('should update environment-specific state', async () => {
      const flag = await request('POST', '/api/flags', { name: 'test-flag' });
      const res = await request('PUT', `/api/flags/${flag.body.id}/environments/dev`, {
        enabled: true,
        percentage: 75
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.environments.dev.enabled, true);
      assert.equal(res.body.environments.dev.percentage, 75);
      // Other environments should be unchanged
      assert.equal(res.body.environments.staging.enabled, false);
      assert.equal(res.body.environments.production.enabled, false);
      server.close();
    });

    it('should update allowlist and blocklist', async () => {
      const flag = await request('POST', '/api/flags', { name: 'test-flag' });
      const res = await request('PUT', `/api/flags/${flag.body.id}/environments/staging`, {
        allowlist: ['user-1', 'user-2'],
        blocklist: ['user-3']
      });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.environments.staging.allowlist, ['user-1', 'user-2']);
      assert.deepEqual(res.body.environments.staging.blocklist, ['user-3']);
      server.close();
    });

    it('should return 400 for invalid environment', async () => {
      const flag = await request('POST', '/api/flags', { name: 'test-flag' });
      const res = await request('PUT', `/api/flags/${flag.body.id}/environments/invalid`, {
        enabled: true
      });
      assert.equal(res.status, 400);
      server.close();
    });

    it('should return 404 for nonexistent flag', async () => {
      const res = await request('PUT', '/api/flags/fake/environments/dev', { enabled: true });
      assert.equal(res.status, 404);
      server.close();
    });

    it('should return 400 for invalid percentage', async () => {
      const flag = await request('POST', '/api/flags', { name: 'test-flag' });
      const res = await request('PUT', `/api/flags/${flag.body.id}/environments/dev`, {
        percentage: 150
      });
      assert.equal(res.status, 400);
      server.close();
    });
  });
});
