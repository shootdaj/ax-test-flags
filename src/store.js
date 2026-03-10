'use strict';

const crypto = require('crypto');

class FlagStore {
  constructor() {
    this.flags = new Map();
    this.apiKeys = new Map();
    this.analytics = new Map();
  }

  // --- Flag CRUD ---

  createFlag({ name, description = '', enabled = false }) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new ValidationError('Flag name is required and must be a non-empty string');
    }

    const id = crypto.randomUUID();
    const flag = {
      id,
      name: name.trim(),
      description: description || '',
      enabled: Boolean(enabled),
      environments: {
        dev: { enabled: false, percentage: 100, allowlist: [], blocklist: [] },
        staging: { enabled: false, percentage: 100, allowlist: [], blocklist: [] },
        production: { enabled: false, percentage: 100, allowlist: [], blocklist: [] }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.flags.set(id, flag);

    // Initialize analytics for this flag
    this.analytics.set(id, {
      dev: { true: 0, false: 0 },
      staging: { true: 0, false: 0 },
      production: { true: 0, false: 0 }
    });

    return flag;
  }

  getFlag(id) {
    const flag = this.flags.get(id);
    if (!flag) {
      throw new NotFoundError(`Flag with id '${id}' not found`);
    }
    return flag;
  }

  getAllFlags() {
    return Array.from(this.flags.values());
  }

  updateFlag(id, updates) {
    const flag = this.getFlag(id);

    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || updates.name.trim() === '') {
        throw new ValidationError('Flag name must be a non-empty string');
      }
      flag.name = updates.name.trim();
    }

    if (updates.description !== undefined) {
      flag.description = String(updates.description);
    }

    if (updates.enabled !== undefined) {
      flag.enabled = Boolean(updates.enabled);
    }

    flag.updatedAt = new Date().toISOString();
    this.flags.set(id, flag);
    return flag;
  }

  deleteFlag(id) {
    this.getFlag(id); // throws if not found
    this.flags.delete(id);
    this.analytics.delete(id);
    return true;
  }

  // --- Environment ---

  updateEnvironment(id, env, updates) {
    const flag = this.getFlag(id);
    const validEnvs = ['dev', 'staging', 'production'];

    if (!validEnvs.includes(env)) {
      throw new ValidationError(`Invalid environment '${env}'. Must be one of: ${validEnvs.join(', ')}`);
    }

    const envConfig = flag.environments[env];

    if (updates.enabled !== undefined) {
      envConfig.enabled = Boolean(updates.enabled);
    }

    if (updates.percentage !== undefined) {
      const pct = Number(updates.percentage);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        throw new ValidationError('Percentage must be a number between 0 and 100');
      }
      envConfig.percentage = pct;
    }

    if (updates.allowlist !== undefined) {
      if (!Array.isArray(updates.allowlist)) {
        throw new ValidationError('Allowlist must be an array of user IDs');
      }
      envConfig.allowlist = updates.allowlist.map(String);
    }

    if (updates.blocklist !== undefined) {
      if (!Array.isArray(updates.blocklist)) {
        throw new ValidationError('Blocklist must be an array of user IDs');
      }
      envConfig.blocklist = updates.blocklist.map(String);
    }

    flag.updatedAt = new Date().toISOString();
    this.flags.set(id, flag);
    return flag;
  }

  // --- Evaluation ---

  evaluateFlag(flagId, userId, environment) {
    const flag = this.getFlag(flagId);
    const envConfig = flag.environments[environment];

    if (!envConfig) {
      return false;
    }

    // Flag must be globally enabled AND environment-enabled
    if (!flag.enabled || !envConfig.enabled) {
      this._recordAnalytics(flagId, environment, false);
      return false;
    }

    // Blocklist takes priority
    if (envConfig.blocklist.includes(String(userId))) {
      this._recordAnalytics(flagId, environment, false);
      return false;
    }

    // Allowlist always gets true
    if (envConfig.allowlist.includes(String(userId))) {
      this._recordAnalytics(flagId, environment, true);
      return true;
    }

    // Percentage rollout with deterministic hash
    const result = this._hashPercentage(flagId, userId) < envConfig.percentage;
    this._recordAnalytics(flagId, environment, result);
    return result;
  }

  evaluateAll(userId, environment) {
    const validEnvs = ['dev', 'staging', 'production'];
    if (!validEnvs.includes(environment)) {
      throw new ValidationError(`Invalid environment '${environment}'. Must be one of: ${validEnvs.join(', ')}`);
    }

    const results = {};
    for (const [id, flag] of this.flags) {
      results[flag.name] = {
        id,
        enabled: this.evaluateFlag(id, userId, environment)
      };
    }
    return results;
  }

  _hashPercentage(flagId, userId) {
    const hash = crypto.createHash('md5').update(`${flagId}:${userId}`).digest('hex');
    const num = parseInt(hash.substring(0, 8), 16);
    return (num / 0xffffffff) * 100;
  }

  _recordAnalytics(flagId, environment, result) {
    let analytics = this.analytics.get(flagId);
    if (!analytics) {
      analytics = {
        dev: { true: 0, false: 0 },
        staging: { true: 0, false: 0 },
        production: { true: 0, false: 0 }
      };
      this.analytics.set(flagId, analytics);
    }

    if (analytics[environment]) {
      analytics[environment][result ? 'true' : 'false']++;
    }
  }

  // --- Analytics ---

  getAnalytics(flagId) {
    this.getFlag(flagId); // throws if not found
    return this.analytics.get(flagId) || {
      dev: { true: 0, false: 0 },
      staging: { true: 0, false: 0 },
      production: { true: 0, false: 0 }
    };
  }

  // --- API Keys ---

  createApiKey(name = 'default') {
    const key = `ffk_${crypto.randomBytes(24).toString('hex')}`;
    const record = {
      key,
      name,
      createdAt: new Date().toISOString()
    };
    this.apiKeys.set(key, record);
    return record;
  }

  validateApiKey(key) {
    return this.apiKeys.has(key);
  }

  getAllApiKeys() {
    return Array.from(this.apiKeys.values()).map(k => ({
      key: k.key.substring(0, 8) + '...',
      name: k.name,
      createdAt: k.createdAt
    }));
  }

  getFullApiKeys() {
    return Array.from(this.apiKeys.values());
  }

  // --- Reset (for testing) ---

  reset() {
    this.flags.clear();
    this.apiKeys.clear();
    this.analytics.clear();
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

// Singleton instance
const store = new FlagStore();

module.exports = { FlagStore, store, ValidationError, NotFoundError };
