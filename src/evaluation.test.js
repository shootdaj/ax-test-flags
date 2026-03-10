'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { FlagStore, ValidationError } = require('./store');

describe('Flag Evaluation', () => {
  let store;

  beforeEach(() => {
    store = new FlagStore();
  });

  describe('evaluateAll', () => {
    it('should evaluate all flags for a given user and environment', () => {
      const flag1 = store.createFlag({ name: 'flag-a', enabled: true });
      const flag2 = store.createFlag({ name: 'flag-b', enabled: true });
      store.updateEnvironment(flag1.id, 'dev', { enabled: true, percentage: 100 });
      store.updateEnvironment(flag2.id, 'dev', { enabled: true, percentage: 0 });

      const results = store.evaluateAll('user-1', 'dev');
      assert.equal(results['flag-a'].enabled, true);
      assert.equal(results['flag-b'].enabled, false);
    });

    it('should throw for invalid environment', () => {
      assert.throws(() => store.evaluateAll('user-1', 'invalid'), ValidationError);
    });

    it('should return empty object when no flags exist', () => {
      const results = store.evaluateAll('user-1', 'dev');
      assert.deepEqual(results, {});
    });

    it('should scope evaluation to the specified environment', () => {
      const flag = store.createFlag({ name: 'scoped-flag', enabled: true });
      store.updateEnvironment(flag.id, 'dev', { enabled: true, percentage: 100 });
      store.updateEnvironment(flag.id, 'production', { enabled: false });

      const devResults = store.evaluateAll('user-1', 'dev');
      const prodResults = store.evaluateAll('user-1', 'production');
      assert.equal(devResults['scoped-flag'].enabled, true);
      assert.equal(prodResults['scoped-flag'].enabled, false);
    });
  });

  describe('evaluateFlag', () => {
    it('should record analytics on evaluation', () => {
      const flag = store.createFlag({ name: 'analytics-test', enabled: true });
      store.updateEnvironment(flag.id, 'dev', { enabled: true, percentage: 100 });

      store.evaluateFlag(flag.id, 'user-1', 'dev');
      store.evaluateFlag(flag.id, 'user-2', 'dev');

      const analytics = store.getAnalytics(flag.id);
      assert.equal(analytics.dev.true, 2);
      assert.equal(analytics.dev.false, 0);
    });

    it('should record false evaluations', () => {
      const flag = store.createFlag({ name: 'disabled', enabled: false });

      store.evaluateFlag(flag.id, 'user-1', 'dev');
      store.evaluateFlag(flag.id, 'user-2', 'dev');

      const analytics = store.getAnalytics(flag.id);
      assert.equal(analytics.dev.true, 0);
      assert.equal(analytics.dev.false, 2);
    });
  });
});

describe('Analytics', () => {
  let store;

  beforeEach(() => {
    store = new FlagStore();
  });

  it('should initialize analytics when flag is created', () => {
    const flag = store.createFlag({ name: 'test' });
    const analytics = store.getAnalytics(flag.id);
    for (const env of ['dev', 'staging', 'production']) {
      assert.equal(analytics[env].true, 0);
      assert.equal(analytics[env].false, 0);
    }
  });

  it('should track analytics per environment', () => {
    const flag = store.createFlag({ name: 'multi-env', enabled: true });
    store.updateEnvironment(flag.id, 'dev', { enabled: true, percentage: 100 });
    store.updateEnvironment(flag.id, 'staging', { enabled: true, percentage: 0 });

    store.evaluateFlag(flag.id, 'user-1', 'dev');
    store.evaluateFlag(flag.id, 'user-1', 'staging');

    const analytics = store.getAnalytics(flag.id);
    assert.equal(analytics.dev.true, 1);
    assert.equal(analytics.staging.false, 1);
    assert.equal(analytics.production.true, 0);
    assert.equal(analytics.production.false, 0);
  });

  it('should accumulate analytics over multiple evaluations', () => {
    const flag = store.createFlag({ name: 'accumulated', enabled: true });
    store.updateEnvironment(flag.id, 'dev', { enabled: true, percentage: 100 });

    for (let i = 0; i < 10; i++) {
      store.evaluateFlag(flag.id, `user-${i}`, 'dev');
    }

    const analytics = store.getAnalytics(flag.id);
    assert.equal(analytics.dev.true, 10);
  });
});
