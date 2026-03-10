# Feature Flag Service

## What This Is

A full-stack feature flag management service built with Node.js and Express. It provides a REST API for creating and managing feature flags with environment scoping, targeting rules (percentage rollout and user allowlists/blocklists), flag evaluation, and evaluation analytics. Includes a vanilla HTML/CSS/JS dashboard for managing flags.

## Core Value

Reliable, deterministic feature flag evaluation — given a userId and environment, the service must consistently return the correct set of enabled flags based on targeting rules.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] CRUD operations for feature flags (name, description, enabled/disabled)
- [ ] Environment scoping (dev, staging, production) with different flag states per environment
- [ ] Targeting rules: percentage rollout with deterministic hashing
- [ ] Targeting rules: user allowlists and blocklists
- [ ] Flag evaluation endpoint: given userId + environment, return which flags are on
- [ ] Evaluation analytics: per-flag true/false counts
- [ ] API key authentication for the evaluation endpoint
- [ ] In-memory storage (no database required)
- [ ] Frontend dashboard: flag list with toggle switches
- [ ] Frontend dashboard: create/edit form with targeting rule fields
- [ ] Frontend dashboard: per-flag analytics view
- [ ] Frontend dashboard: environment switcher
- [ ] Static HTML/CSS/JS frontend served by Express
- [ ] Health check endpoint

### Out of Scope

- Database persistence — in-memory storage is sufficient for v1
- User authentication for dashboard — admin access only, no login required
- WebSocket real-time updates — polling or manual refresh is fine
- Flag dependencies/prerequisites — each flag evaluates independently
- Audit logging — analytics covers evaluation tracking
- Multi-tenancy — single-tenant service

## Context

This is a feature flag service similar to LaunchDarkly or Unleash but simplified. The service uses in-memory storage, making it suitable for development and testing environments. The deterministic hash-based percentage rollout ensures consistent flag evaluation for the same user.

Tech stack: Node.js with Express, vanilla HTML/CSS/JS frontend, deployed to Vercel.

## Constraints

- **Stack**: Node.js + Express — specified requirement
- **Storage**: In-memory only — no database dependencies
- **Frontend**: Vanilla HTML/CSS/JS — no frameworks
- **Deployment**: Vercel — serverless deployment target

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| In-memory storage | Simplicity, no external dependencies | — Pending |
| Deterministic hash for percentage rollout | Consistent user experience across evaluations | — Pending |
| API key auth only on evaluation endpoint | Dashboard is admin-only, evaluation is the external API | — Pending |
| Vanilla frontend | No build step, simple deployment | — Pending |

---
*Last updated: 2026-03-10 after initialization*
