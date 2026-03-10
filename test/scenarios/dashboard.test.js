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
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null, raw: data, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: null, raw: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Scenario: Dashboard Workflow', () => {
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

  it('should serve the dashboard HTML at root URL', async () => {
    const res = await request('GET', '/');
    assert.equal(res.status, 200);
    assert.ok(res.raw.includes('Feature Flag Service'));
    assert.ok(res.raw.includes('env-select'));
    assert.ok(res.headers['content-type'].includes('text/html'));
    server.close();
  });

  it('should serve static CSS file', async () => {
    const res = await request('GET', '/styles.css');
    assert.equal(res.status, 200);
    assert.ok(res.raw.includes('flag-card'));
    server.close();
  });

  it('should serve static JS file', async () => {
    const res = await request('GET', '/app.js');
    assert.equal(res.status, 200);
    assert.ok(res.raw.includes('loadFlags'));
    server.close();
  });

  it('should simulate full dashboard create-toggle-analytics flow', async () => {
    // 1. Dashboard loads flag list (empty)
    const emptyList = await request('GET', '/api/flags');
    assert.equal(emptyList.status, 200);
    assert.deepEqual(emptyList.body, []);

    // 2. User creates a flag via the form
    const created = await request('POST', '/api/flags', {
      name: 'new-feature',
      description: 'A brand new feature',
      enabled: true
    });
    assert.equal(created.status, 201);
    const flagId = created.body.id;

    // 3. User sets targeting rules for dev environment
    const envUpdate = await request('PUT', `/api/flags/${flagId}/environments/dev`, {
      enabled: true,
      percentage: 75,
      allowlist: ['beta-tester'],
      blocklist: ['problem-user']
    });
    assert.equal(envUpdate.status, 200);

    // 4. Dashboard reloads flag list
    const flagList = await request('GET', '/api/flags');
    assert.equal(flagList.body.length, 1);
    assert.equal(flagList.body[0].name, 'new-feature');
    assert.equal(flagList.body[0].environments.dev.enabled, true);
    assert.equal(flagList.body[0].environments.dev.percentage, 75);

    // 5. User switches to staging environment - loads same flags
    // The dashboard just calls GET /api/flags again and uses different env data
    const sameFlag = await request('GET', `/api/flags/${flagId}`);
    assert.equal(sameFlag.body.environments.staging.enabled, false);
    assert.equal(sameFlag.body.environments.dev.enabled, true);

    // 6. User toggles flag on in staging
    const stagingToggle = await request('PUT', `/api/flags/${flagId}/environments/staging`, {
      enabled: true
    });
    assert.equal(stagingToggle.status, 200);
    assert.equal(stagingToggle.body.environments.staging.enabled, true);

    // 7. Create an API key and trigger evaluations for analytics
    const keyRes = await request('POST', '/api/keys', { name: 'test' });
    const apiKey = keyRes.body.key;

    for (let i = 0; i < 5; i++) {
      await request('POST', '/api/evaluate', {
        userId: `user-${i}`,
        environment: 'dev'
      }, { 'X-API-Key': apiKey });
    }

    // 8. User views analytics
    const analytics = await request('GET', `/api/flags/${flagId}/analytics`);
    assert.equal(analytics.status, 200);
    const devAnalytics = analytics.body.analytics.dev;
    assert.equal(devAnalytics.true + devAnalytics.false, 5);

    server.close();
  });

  it('should simulate edit-and-delete flow', async () => {
    // Create a flag
    const created = await request('POST', '/api/flags', {
      name: 'old-name',
      description: 'Old desc'
    });
    const flagId = created.body.id;

    // Edit the flag
    const edited = await request('PUT', `/api/flags/${flagId}`, {
      name: 'new-name',
      description: 'New desc',
      enabled: true
    });
    assert.equal(edited.body.name, 'new-name');
    assert.equal(edited.body.description, 'New desc');
    assert.equal(edited.body.enabled, true);

    // Delete the flag
    const deleted = await request('DELETE', `/api/flags/${flagId}`);
    assert.equal(deleted.status, 204);

    // Verify it's gone
    const list = await request('GET', '/api/flags');
    assert.equal(list.body.length, 0);

    server.close();
  });
});
