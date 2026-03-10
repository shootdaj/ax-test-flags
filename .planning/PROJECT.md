# Feature Flag Service

## What This Is

A full-stack feature flag management service built with Node.js and Express. It provides a REST API for creating and managing feature flags with environment scoping, targeting rules (percentage rollout and user allowlists/blocklists), flag evaluation with API key auth, and evaluation analytics. Includes a vanilla HTML/CSS/JS admin dashboard. Deployed to Vercel.

## Core Value

Reliable, deterministic feature flag evaluation — given a userId and environment, the service must consistently return the correct set of enabled flags based on targeting rules.

## Requirements

### Validated

- CRUD operations for feature flags — v1.0
- Environment scoping (dev, staging, production) — v1.0
- Targeting rules: percentage rollout with deterministic hashing — v1.0
- Targeting rules: user allowlists and blocklists — v1.0
- Flag evaluation endpoint with API key auth — v1.0
- Evaluation analytics: per-flag true/false counts per environment — v1.0
- In-memory storage — v1.0
- Frontend dashboard with toggles, forms, analytics, env switcher — v1.0
- Health check endpoint — v1.0
- CORS support — v1.0

### Active

(None — v1.0 complete)

### Out of Scope

- Database persistence — in-memory storage is sufficient for v1
- User authentication for dashboard — admin access only, no login required
- WebSocket real-time updates — polling or manual refresh is fine
- Flag dependencies/prerequisites — each flag evaluates independently
- Audit logging — analytics covers evaluation tracking
- Multi-tenancy — single-tenant service

## Context

Shipped v1.0 with ~500 LOC JavaScript (backend) and ~600 LOC frontend (HTML/CSS/JS).
Tech stack: Node.js 20, Express v5, vanilla HTML/CSS/JS frontend, deployed to Vercel.
96 tests across 3 tiers (56 unit, 27 integration, 13 scenario), all passing.

## Constraints

- **Stack**: Node.js + Express v5
- **Storage**: In-memory only — no database dependencies
- **Frontend**: Vanilla HTML/CSS/JS — no frameworks
- **Deployment**: Vercel — serverless deployment

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| In-memory storage | Simplicity, no external dependencies | Good |
| Deterministic hash for percentage rollout | Consistent user experience across evaluations | Good |
| API key auth only on evaluation endpoint | Dashboard is admin-only, evaluation is the external API | Good |
| Vanilla frontend | No build step, simple deployment | Good |
| Express v5 | Latest stable with improved routing | Good |

---
*Last updated: 2026-03-10 after v1.0 milestone*
