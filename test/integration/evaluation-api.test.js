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

describe('Evaluation API Integration Tests', () => {
  let apiKey;

  beforeEach(async () => {
    store.reset();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
    // Create an API key for evaluation
    const keyRes = await request('POST', '/api/keys', { name: 'test-key' });
    apiKey = keyRes.body.key;
  });

  after(() => {
    if (server) server.close();
  });

  describe('POST /api/evaluate', () => {
    it('should evaluate flags with valid API key', async () => {
      // Create and configure a flag
      const flag = await request('POST', '/api/flags', { name: 'test-flag', enabled: true });
      await request('PUT', `/api/flags/${flag.body.id}/environments/dev`, {
        enabled: true,
        percentage: 100
      });

      const res = await request('POST', '/api/evaluate', {
        userId: 'user-1',
        environment: 'dev'
      }, { 'X-API-Key': apiKey });

      assert.equal(res.status, 200);
      assert.equal(res.body.userId, 'user-1');
      assert.equal(res.body.environment, 'dev');
      assert.ok(res.body.flags['test-flag']);
      assert.equal(res.body.flags['test-flag'].enabled, true);
      server.close();
    });

    it('should return 401 without API key', async () => {
      const res = await request('POST', '/api/evaluate', {
        userId: 'user-1',
        environment: 'dev'
      });
      assert.equal(res.status, 401);
      server.close();
    });

    it('should return 401 with invalid API key', async () => {
      const res = await request('POST', '/api/evaluate', {
        userId: 'user-1',
        environment: 'dev'
      }, { 'X-API-Key': 'invalid-key' });
      assert.equal(res.status, 401);
      server.close();
    });

    it('should return 400 without userId', async () => {
      const res = await request('POST', '/api/evaluate', {
        environment: 'dev'
      }, { 'X-API-Key': apiKey });
      assert.equal(res.status, 400);
      server.close();
    });

    it('should return 400 without environment', async () => {
      const res = await request('POST', '/api/evaluate', {
        userId: 'user-1'
      }, { 'X-API-Key': apiKey });
      assert.equal(res.status, 400);
      server.close();
    });

    it('should apply targeting rules in evaluation', async () => {
      const flag = await request('POST', '/api/flags', { name: 'targeted-flag', enabled: true });
      await request('PUT', `/api/flags/${flag.body.id}/environments/dev`, {
        enabled: true,
        percentage: 100,
        blocklist: ['blocked-user']
      });

      // Blocked user should get false
      const blockedRes = await request('POST', '/api/evaluate', {
        userId: 'blocked-user',
        environment: 'dev'
      }, { 'X-API-Key': apiKey });
      assert.equal(blockedRes.body.flags['targeted-flag'].enabled, false);

      // Normal user should get true (100%)
      const normalRes = await request('POST', '/api/evaluate', {
        userId: 'normal-user',
        environment: 'dev'
      }, { 'X-API-Key': apiKey });
      assert.equal(normalRes.body.flags['targeted-flag'].enabled, true);

      server.close();
    });
  });

  describe('GET /api/flags/:id/analytics', () => {
    it('should return analytics for a flag', async () => {
      const flag = await request('POST', '/api/flags', { name: 'analytics-flag', enabled: true });
      await request('PUT', `/api/flags/${flag.body.id}/environments/dev`, {
        enabled: true,
        percentage: 100
      });

      // Trigger some evaluations
      await request('POST', '/api/evaluate', {
        userId: 'user-1',
        environment: 'dev'
      }, { 'X-API-Key': apiKey });
      await request('POST', '/api/evaluate', {
        userId: 'user-2',
        environment: 'dev'
      }, { 'X-API-Key': apiKey });

      const res = await request('GET', `/api/flags/${flag.body.id}/analytics`);
      assert.equal(res.status, 200);
      assert.equal(res.body.flagId, flag.body.id);
      assert.equal(res.body.analytics.dev.true, 2);
      server.close();
    });

    it('should return 404 for nonexistent flag', async () => {
      const res = await request('GET', '/api/flags/nonexistent/analytics');
      assert.equal(res.status, 404);
      server.close();
    });
  });

  describe('API Keys', () => {
    it('should create an API key', async () => {
      const res = await request('POST', '/api/keys', { name: 'new-key' });
      assert.equal(res.status, 201);
      assert.ok(res.body.key.startsWith('ffk_'));
      assert.equal(res.body.name, 'new-key');
      server.close();
    });

    it('should list API keys', async () => {
      const res = await request('GET', '/api/keys');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length >= 1); // At least the one created in beforeEach
      server.close();
    });
  });
});
