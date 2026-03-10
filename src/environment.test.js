'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { FlagStore, ValidationError } = require('./store');

describe('Environment Scoping', () => {
  let store;

  beforeEach(() => {
    store = new FlagStore();
  });

  describe('updateEnvironment', () => {
    it('should update environment enabled state', () => {
      const flag = store.createFlag({ name: 'test' });
      const updated = store.updateEnvironment(flag.id, 'dev', { enabled: true });
      assert.equal(updated.environments.dev.enabled, true);
      assert.equal(updated.environments.staging.enabled, false);
      assert.equal(updated.environments.production.enabled, false);
    });

    it('should update percentage', () => {
      const flag = store.createFlag({ name: 'test' });
      const updated = store.updateEnvironment(flag.id, 'staging', { percentage: 50 });
      assert.equal(updated.environments.staging.percentage, 50);
    });

    it('should update allowlist', () => {
      const flag = store.createFlag({ name: 'test' });
      const updated = store.updateEnvironment(flag.id, 'production', {
        allowlist: ['user-1', 'user-2']
      });
      assert.deepEqual(updated.environments.production.allowlist, ['user-1', 'user-2']);
    });

    it('should update blocklist', () => {
      const flag = store.createFlag({ name: 'test' });
      const updated = store.updateEnvironment(flag.id, 'dev', {
        blocklist: ['bad-user']
      });
      assert.deepEqual(updated.environments.dev.blocklist, ['bad-user']);
    });

    it('should reject invalid environment', () => {
      const flag = store.createFlag({ name: 'test' });
      assert.throws(
        () => store.updateEnvironment(flag.id, 'invalid', { enabled: true }),
        ValidationError
      );
    });

    it('should reject invalid percentage', () => {
      const flag = store.createFlag({ name: 'test' });
      assert.throws(
        () => store.updateEnvironment(flag.id, 'dev', { percentage: 101 }),
        ValidationError
      );
      assert.throws(
        () => store.updateEnvironment(flag.id, 'dev', { percentage: -1 }),
        ValidationError
      );
    });

    it('should reject non-array allowlist', () => {
      const flag = store.createFlag({ name: 'test' });
      assert.throws(
        () => store.updateEnvironment(flag.id, 'dev', { allowlist: 'not-array' }),
        ValidationError
      );
    });

    it('should reject non-array blocklist', () => {
      const flag = store.createFlag({ name: 'test' });
      assert.throws(
        () => store.updateEnvironment(flag.id, 'dev', { blocklist: 'not-array' }),
        ValidationError
      );
    });

    it('should handle multiple updates to same environment', () => {
      const flag = store.createFlag({ name: 'test' });
      store.updateEnvironment(flag.id, 'dev', { enabled: true, percentage: 75 });
      const updated = store.updateEnvironment(flag.id, 'dev', { allowlist: ['user-1'] });
      assert.equal(updated.environments.dev.enabled, true);
      assert.equal(updated.environments.dev.percentage, 75);
      assert.deepEqual(updated.environments.dev.allowlist, ['user-1']);
    });

    it('should default environments to disabled on flag creation', () => {
      const flag = store.createFlag({ name: 'test' });
      for (const env of ['dev', 'staging', 'production']) {
        assert.equal(flag.environments[env].enabled, false);
      }
    });
  });
});

describe('Targeting Rules', () => {
  let store;

  beforeEach(() => {
    store = new FlagStore();
  });

  describe('Deterministic hash percentage', () => {
    it('should return consistent results for the same userId', () => {
      const flag = store.createFlag({ name: 'test', enabled: true });
      store.updateEnvironment(flag.id, 'dev', { enabled: true, percentage: 50 });

      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(store.evaluateFlag(flag.id, 'user-123', 'dev'));
      }
      // All results should be the same for the same user
      assert.ok(results.every(r => r === results[0]));
    });

    it('should give different results for different userIds', () => {
      const flag = store.createFlag({ name: 'test', enabled: true });
      store.updateEnvironment(flag.id, 'dev', { enabled: true, percentage: 50 });

      // With enough users, we should get both true and false
      const results = new Set();
      for (let i = 0; i < 100; i++) {
        results.add(store.evaluateFlag(flag.id, `user-${i}`, 'dev'));
      }
      assert.equal(results.size, 2); // Both true and false should appear
    });

    it('should return false for 0% rollout', () => {
      const flag = store.createFlag({ name: 'test', enabled: true });
      store.updateEnvironment(flag.id, 'dev', { enabled: true, percentage: 0 });
      assert.equal(store.evaluateFlag(flag.id, 'any-user', 'dev'), false);
    });

    it('should return true for 100% rollout', () => {
      const flag = store.createFlag({ name: 'test', enabled: true });
      store.updateEnvironment(flag.id, 'dev', { enabled: true, percentage: 100 });
      assert.equal(store.evaluateFlag(flag.id, 'any-user', 'dev'), true);
    });
  });

  describe('Allowlist', () => {
    it('should always return true for allowlisted users', () => {
      const flag = store.createFlag({ name: 'test', enabled: true });
      store.updateEnvironment(flag.id, 'dev', {
        enabled: true,
        percentage: 0,
        allowlist: ['vip-user']
      });
      assert.equal(store.evaluateFlag(flag.id, 'vip-user', 'dev'), true);
    });

    it('should not affect non-allowlisted users', () => {
      const flag = store.createFlag({ name: 'test', enabled: true });
      store.updateEnvironment(flag.id, 'dev', {
        enabled: true,
        percentage: 0,
        allowlist: ['vip-user']
      });
      assert.equal(store.evaluateFlag(flag.id, 'normal-user', 'dev'), false);
    });
  });

  describe('Blocklist', () => {
    it('should always return false for blocklisted users', () => {
      const flag = store.createFlag({ name: 'test', enabled: true });
      store.updateEnvironment(flag.id, 'dev', {
        enabled: true,
        percentage: 100,
        blocklist: ['bad-user']
      });
      assert.equal(store.evaluateFlag(flag.id, 'bad-user', 'dev'), false);
    });

    it('should take priority over allowlist', () => {
      const flag = store.createFlag({ name: 'test', enabled: true });
      store.updateEnvironment(flag.id, 'dev', {
        enabled: true,
        percentage: 100,
        allowlist: ['user-1'],
        blocklist: ['user-1']
      });
      assert.equal(store.evaluateFlag(flag.id, 'user-1', 'dev'), false);
    });
  });

  describe('Flag and environment enabled checks', () => {
    it('should return false when flag is globally disabled', () => {
      const flag = store.createFlag({ name: 'test', enabled: false });
      store.updateEnvironment(flag.id, 'dev', { enabled: true, percentage: 100 });
      assert.equal(store.evaluateFlag(flag.id, 'user-1', 'dev'), false);
    });

    it('should return false when environment is disabled', () => {
      const flag = store.createFlag({ name: 'test', enabled: true });
      // env starts disabled by default
      assert.equal(store.evaluateFlag(flag.id, 'user-1', 'dev'), false);
    });

    it('should return true when both flag and env are enabled with 100%', () => {
      const flag = store.createFlag({ name: 'test', enabled: true });
      store.updateEnvironment(flag.id, 'dev', { enabled: true, percentage: 100 });
      assert.equal(store.evaluateFlag(flag.id, 'user-1', 'dev'), true);
    });
  });
});
