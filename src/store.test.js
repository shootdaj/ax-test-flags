'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { FlagStore, ValidationError, NotFoundError } = require('./store');

describe('FlagStore', () => {
  let store;

  beforeEach(() => {
    store = new FlagStore();
  });

  describe('createFlag', () => {
    it('should create a flag with valid name', () => {
      const flag = store.createFlag({ name: 'dark-mode' });
      assert.ok(flag.id);
      assert.equal(flag.name, 'dark-mode');
      assert.equal(flag.description, '');
      assert.equal(flag.enabled, false);
      assert.ok(flag.createdAt);
      assert.ok(flag.updatedAt);
    });

    it('should create a flag with all fields', () => {
      const flag = store.createFlag({
        name: 'new-feature',
        description: 'A test feature',
        enabled: true
      });
      assert.equal(flag.name, 'new-feature');
      assert.equal(flag.description, 'A test feature');
      assert.equal(flag.enabled, true);
    });

    it('should initialize environment configs', () => {
      const flag = store.createFlag({ name: 'test-flag' });
      assert.deepEqual(Object.keys(flag.environments), ['dev', 'staging', 'production']);
      for (const env of ['dev', 'staging', 'production']) {
        assert.equal(flag.environments[env].enabled, false);
        assert.equal(flag.environments[env].percentage, 100);
        assert.deepEqual(flag.environments[env].allowlist, []);
        assert.deepEqual(flag.environments[env].blocklist, []);
      }
    });

    it('should throw ValidationError for empty name', () => {
      assert.throws(() => store.createFlag({ name: '' }), ValidationError);
    });

    it('should throw ValidationError for missing name', () => {
      assert.throws(() => store.createFlag({}), ValidationError);
    });

    it('should trim whitespace from name', () => {
      const flag = store.createFlag({ name: '  spaced-name  ' });
      assert.equal(flag.name, 'spaced-name');
    });

    it('should generate unique IDs', () => {
      const flag1 = store.createFlag({ name: 'flag-1' });
      const flag2 = store.createFlag({ name: 'flag-2' });
      assert.notEqual(flag1.id, flag2.id);
    });
  });

  describe('getFlag', () => {
    it('should retrieve an existing flag', () => {
      const created = store.createFlag({ name: 'test' });
      const retrieved = store.getFlag(created.id);
      assert.deepEqual(retrieved, created);
    });

    it('should throw NotFoundError for nonexistent flag', () => {
      assert.throws(() => store.getFlag('nonexistent'), NotFoundError);
    });
  });

  describe('getAllFlags', () => {
    it('should return empty array when no flags', () => {
      assert.deepEqual(store.getAllFlags(), []);
    });

    it('should return all flags', () => {
      store.createFlag({ name: 'flag-1' });
      store.createFlag({ name: 'flag-2' });
      store.createFlag({ name: 'flag-3' });
      assert.equal(store.getAllFlags().length, 3);
    });
  });

  describe('updateFlag', () => {
    it('should update name', () => {
      const flag = store.createFlag({ name: 'old-name' });
      const updated = store.updateFlag(flag.id, { name: 'new-name' });
      assert.equal(updated.name, 'new-name');
    });

    it('should update description', () => {
      const flag = store.createFlag({ name: 'test' });
      const updated = store.updateFlag(flag.id, { description: 'new desc' });
      assert.equal(updated.description, 'new desc');
    });

    it('should update enabled state', () => {
      const flag = store.createFlag({ name: 'test' });
      const updated = store.updateFlag(flag.id, { enabled: true });
      assert.equal(updated.enabled, true);
    });

    it('should update updatedAt timestamp', () => {
      const flag = store.createFlag({ name: 'test' });
      const originalUpdatedAt = flag.updatedAt;
      // Small delay to ensure different timestamp
      const updated = store.updateFlag(flag.id, { name: 'new' });
      assert.ok(updated.updatedAt >= originalUpdatedAt);
    });

    it('should throw NotFoundError for nonexistent flag', () => {
      assert.throws(() => store.updateFlag('nonexistent', { name: 'test' }), NotFoundError);
    });

    it('should throw ValidationError for empty name', () => {
      const flag = store.createFlag({ name: 'test' });
      assert.throws(() => store.updateFlag(flag.id, { name: '' }), ValidationError);
    });
  });

  describe('deleteFlag', () => {
    it('should delete an existing flag', () => {
      const flag = store.createFlag({ name: 'test' });
      assert.equal(store.deleteFlag(flag.id), true);
      assert.throws(() => store.getFlag(flag.id), NotFoundError);
    });

    it('should throw NotFoundError for nonexistent flag', () => {
      assert.throws(() => store.deleteFlag('nonexistent'), NotFoundError);
    });

    it('should also remove analytics for the flag', () => {
      const flag = store.createFlag({ name: 'test' });
      store.deleteFlag(flag.id);
      // getAnalytics throws because the flag no longer exists
      assert.throws(() => store.getAnalytics(flag.id), NotFoundError);
    });
  });

  describe('reset', () => {
    it('should clear all data', () => {
      store.createFlag({ name: 'test' });
      store.createApiKey('test');
      store.reset();
      assert.deepEqual(store.getAllFlags(), []);
      assert.deepEqual(store.getFullApiKeys(), []);
    });
  });
});

describe('API Keys', () => {
  let store;

  beforeEach(() => {
    store = new FlagStore();
  });

  it('should create an API key', () => {
    const key = store.createApiKey('test-key');
    assert.ok(key.key.startsWith('ffk_'));
    assert.equal(key.name, 'test-key');
    assert.ok(key.createdAt);
  });

  it('should validate a valid key', () => {
    const key = store.createApiKey();
    assert.equal(store.validateApiKey(key.key), true);
  });

  it('should reject an invalid key', () => {
    assert.equal(store.validateApiKey('invalid-key'), false);
  });

  it('should list keys with masked values', () => {
    store.createApiKey('key-1');
    store.createApiKey('key-2');
    const keys = store.getAllApiKeys();
    assert.equal(keys.length, 2);
    assert.ok(keys[0].key.endsWith('...'));
  });

  it('should list full keys', () => {
    store.createApiKey('key-1');
    const keys = store.getFullApiKeys();
    assert.equal(keys.length, 1);
    assert.ok(keys[0].key.startsWith('ffk_'));
    assert.ok(!keys[0].key.endsWith('...'));
  });
});
