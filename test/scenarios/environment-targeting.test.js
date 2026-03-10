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

describe('Scenario: Environment-Specific Flag Management', () => {
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

  it('should manage flags independently per environment', async () => {
    // Create a flag
    const flag = await request('POST', '/api/flags', { name: 'new-checkout' });
    const flagId = flag.body.id;

    // Enable only in dev with 100%
    await request('PUT', `/api/flags/${flagId}/environments/dev`, {
      enabled: true,
      percentage: 100
    });

    // Enable in staging with 50% rollout
    await request('PUT', `/api/flags/${flagId}/environments/staging`, {
      enabled: true,
      percentage: 50
    });

    // Keep production disabled
    // Verify each environment has independent state
    const getRes = await request('GET', `/api/flags/${flagId}`);
    assert.equal(getRes.body.environments.dev.enabled, true);
    assert.equal(getRes.body.environments.dev.percentage, 100);
    assert.equal(getRes.body.environments.staging.enabled, true);
    assert.equal(getRes.body.environments.staging.percentage, 50);
    assert.equal(getRes.body.environments.production.enabled, false);

    server.close();
  });

  it('should configure targeting rules with allowlist and blocklist', async () => {
    // Create a flag
    const flag = await request('POST', '/api/flags', { name: 'beta-feature', enabled: true });
    const flagId = flag.body.id;

    // Set up targeting in dev
    await request('PUT', `/api/flags/${flagId}/environments/dev`, {
      enabled: true,
      percentage: 50,
      allowlist: ['vip-user-1', 'vip-user-2'],
      blocklist: ['banned-user']
    });

    // Verify the targeting rules were stored
    const getRes = await request('GET', `/api/flags/${flagId}`);
    const devEnv = getRes.body.environments.dev;
    assert.equal(devEnv.percentage, 50);
    assert.deepEqual(devEnv.allowlist, ['vip-user-1', 'vip-user-2']);
    assert.deepEqual(devEnv.blocklist, ['banned-user']);

    server.close();
  });

  it('should support gradual rollout across environments', async () => {
    // Create a feature flag
    const flag = await request('POST', '/api/flags', { name: 'gradual-feature', enabled: true });
    const flagId = flag.body.id;

    // Phase 1: 100% in dev
    await request('PUT', `/api/flags/${flagId}/environments/dev`, {
      enabled: true,
      percentage: 100
    });

    // Phase 2: 25% in staging
    await request('PUT', `/api/flags/${flagId}/environments/staging`, {
      enabled: true,
      percentage: 25
    });

    // Phase 3: 10% in production with VIP allowlist
    await request('PUT', `/api/flags/${flagId}/environments/production`, {
      enabled: true,
      percentage: 10,
      allowlist: ['early-adopter-1']
    });

    const getRes = await request('GET', `/api/flags/${flagId}`);
    assert.equal(getRes.body.environments.dev.percentage, 100);
    assert.equal(getRes.body.environments.staging.percentage, 25);
    assert.equal(getRes.body.environments.production.percentage, 10);
    assert.deepEqual(getRes.body.environments.production.allowlist, ['early-adopter-1']);

    server.close();
  });
});
