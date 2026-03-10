'use strict';

const express = require('express');
const path = require('path');
const { store, ValidationError, NotFoundError } = require('./store');

const app = express();

app.use(express.json());

// --- CORS ---
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// --- Serve static frontend ---
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Health ---
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// --- API Key Auth Middleware ---
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey || !store.validateApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}

// --- Flag CRUD ---

// Create flag
app.post('/api/flags', (req, res) => {
  try {
    const flag = store.createFlag(req.body);
    res.status(201).json(flag);
  } catch (err) {
    handleError(res, err);
  }
});

// List all flags
app.get('/api/flags', (req, res) => {
  res.json(store.getAllFlags());
});

// Get single flag
app.get('/api/flags/:id', (req, res) => {
  try {
    const flag = store.getFlag(req.params.id);
    res.json(flag);
  } catch (err) {
    handleError(res, err);
  }
});

// Update flag
app.put('/api/flags/:id', (req, res) => {
  try {
    const flag = store.updateFlag(req.params.id, req.body);
    res.json(flag);
  } catch (err) {
    handleError(res, err);
  }
});

// Delete flag
app.delete('/api/flags/:id', (req, res) => {
  try {
    store.deleteFlag(req.params.id);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

// --- Environment ---

// Update environment-specific config
app.put('/api/flags/:id/environments/:env', (req, res) => {
  try {
    const flag = store.updateEnvironment(req.params.id, req.params.env, req.body);
    res.json(flag);
  } catch (err) {
    handleError(res, err);
  }
});

// --- Evaluation (requires API key) ---

app.post('/api/evaluate', requireApiKey, (req, res) => {
  try {
    const { userId, environment } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    if (!environment) {
      return res.status(400).json({ error: 'environment is required' });
    }
    const results = store.evaluateAll(userId, environment);
    res.json({ userId, environment, flags: results });
  } catch (err) {
    handleError(res, err);
  }
});

// --- Analytics ---

app.get('/api/flags/:id/analytics', (req, res) => {
  try {
    const analytics = store.getAnalytics(req.params.id);
    res.json({ flagId: req.params.id, analytics });
  } catch (err) {
    handleError(res, err);
  }
});

// --- API Keys ---

app.post('/api/keys', (req, res) => {
  const { name } = req.body || {};
  const apiKey = store.createApiKey(name);
  res.status(201).json(apiKey);
});

app.get('/api/keys', (req, res) => {
  res.json(store.getFullApiKeys());
});

// --- Error Handler ---

function handleError(res, err) {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

// --- Catch-all for SPA ---
app.get('/{*path}', (req, res) => {
  // Only serve index.html for non-API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;
