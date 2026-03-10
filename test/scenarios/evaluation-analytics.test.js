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

describe('Scenario: Full Evaluation & Analytics Flow', () => {
  let apiKey;

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

  it('should support complete evaluation and analytics workflow', async () => {
    // 1. Create an API key
    const keyRes = await request('POST', '/api/keys', { name: 'production-key' });
    assert.equal(keyRes.status, 201);
    apiKey = keyRes.body.key;

    // 2. Create feature flags
    const darkMode = await request('POST', '/api/flags', {
      name: 'dark-mode',
      description: 'Dark mode toggle',
      enabled: true
    });
    const betaFeature = await request('POST', '/api/flags', {
      name: 'beta-checkout',
      description: 'New checkout flow',
      enabled: true
    });

    // 3. Configure flags for production
    await request('PUT', `/api/flags/${darkMode.body.id}/environments/production`, {
      enabled: true,
      percentage: 100
    });
    await request('PUT', `/api/flags/${betaFeature.body.id}/environments/production`, {
      enabled: true,
      percentage: 50,
      allowlist: ['vip-user'],
      blocklist: ['problem-user']
    });

    // 4. Evaluate for different users
    const user1Eval = await request('POST', '/api/evaluate', {
      userId: 'regular-user-1',
      environment: 'production'
    }, { 'X-API-Key': apiKey });
    assert.equal(user1Eval.status, 200);
    assert.equal(user1Eval.body.flags['dark-mode'].enabled, true);

    // VIP user should always get beta
    const vipEval = await request('POST', '/api/evaluate', {
      userId: 'vip-user',
      environment: 'production'
    }, { 'X-API-Key': apiKey });
    assert.equal(vipEval.body.flags['beta-checkout'].enabled, true);

    // Problem user should never get beta
    const problemEval = await request('POST', '/api/evaluate', {
      userId: 'problem-user',
      environment: 'production'
    }, { 'X-API-Key': apiKey });
    assert.equal(problemEval.body.flags['beta-checkout'].enabled, false);

    // 5. Check analytics
    const darkModeAnalytics = await request('GET', `/api/flags/${darkMode.body.id}/analytics`);
    assert.equal(darkModeAnalytics.status, 200);
    // 3 evaluations, all true for dark-mode
    assert.equal(darkModeAnalytics.body.analytics.production.true, 3);

    const betaAnalytics = await request('GET', `/api/flags/${betaFeature.body.id}/analytics`);
    assert.equal(betaAnalytics.status, 200);
    // At least 1 true (vip), at least 1 false (problem-user)
    assert.ok(betaAnalytics.body.analytics.production.true >= 1);
    assert.ok(betaAnalytics.body.analytics.production.false >= 1);

    // 6. Verify API key list
    const keysRes = await request('GET', '/api/keys');
    assert.equal(keysRes.status, 200);
    assert.equal(keysRes.body.length, 1);
    assert.equal(keysRes.body[0].name, 'production-key');

    server.close();
  });

  it('should reject evaluation without valid API key', async () => {
    // No API key
    const noKey = await request('POST', '/api/evaluate', {
      userId: 'user-1',
      environment: 'dev'
    });
    assert.equal(noKey.status, 401);

    // Invalid API key
    const badKey = await request('POST', '/api/evaluate', {
      userId: 'user-1',
      environment: 'dev'
    }, { 'X-API-Key': 'ffk_invalid123' });
    assert.equal(badKey.status, 401);

    server.close();
  });

  it('should track analytics across multiple environments', async () => {
    const keyRes = await request('POST', '/api/keys', { name: 'multi-env-key' });
    apiKey = keyRes.body.key;

    const flag = await request('POST', '/api/flags', {
      name: 'multi-env-flag',
      enabled: true
    });
    const flagId = flag.body.id;

    // Enable in dev and staging
    await request('PUT', `/api/flags/${flagId}/environments/dev`, {
      enabled: true,
      percentage: 100
    });
    await request('PUT', `/api/flags/${flagId}/environments/staging`, {
      enabled: true,
      percentage: 100
    });

    // Evaluate in dev
    await request('POST', '/api/evaluate', {
      userId: 'user-1',
      environment: 'dev'
    }, { 'X-API-Key': apiKey });

    // Evaluate in staging (twice)
    await request('POST', '/api/evaluate', {
      userId: 'user-1',
      environment: 'staging'
    }, { 'X-API-Key': apiKey });
    await request('POST', '/api/evaluate', {
      userId: 'user-2',
      environment: 'staging'
    }, { 'X-API-Key': apiKey });

    // Evaluate in production (disabled, so should be false)
    await request('POST', '/api/evaluate', {
      userId: 'user-1',
      environment: 'production'
    }, { 'X-API-Key': apiKey });

    // Check analytics
    const analyticsRes = await request('GET', `/api/flags/${flagId}/analytics`);
    assert.equal(analyticsRes.body.analytics.dev.true, 1);
    assert.equal(analyticsRes.body.analytics.staging.true, 2);
    assert.equal(analyticsRes.body.analytics.production.false, 1);

    server.close();
  });
});
