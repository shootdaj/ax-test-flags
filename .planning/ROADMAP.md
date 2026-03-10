# Roadmap: Feature Flag Service

**Created:** 2026-03-10
**Phases:** 4
**Requirements covered:** 30/30

## Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Core API & Infrastructure | Working Express server with CRUD for feature flags | FLAG-01..05, INFR-01..04 | 5 |
| 2 | Environment Scoping & Targeting | Environment-aware flags with percentage rollout and user lists | ENV-01..03, TGT-01..05 | 5 |
| 3 | Evaluation Engine & Analytics | Flag evaluation endpoint with auth and analytics tracking | EVAL-01..05, ANLY-01..03 | 5 |
| 4 | Frontend Dashboard | Complete dashboard with flag management, analytics, and env switcher | DASH-01..05 | 5 |

---

## Phase 1: Core API & Infrastructure

**Goal:** Set up Express server with health check and full CRUD for feature flags with in-memory storage.

**Requirements:** FLAG-01, FLAG-02, FLAG-03, FLAG-04, FLAG-05, INFR-01, INFR-02, INFR-03, INFR-04

**Success Criteria:**
1. GET /health returns 200 with status info
2. POST /api/flags creates a flag and returns it with a generated ID
3. GET /api/flags returns all flags; GET /api/flags/:id returns one flag
4. PUT /api/flags/:id updates a flag; DELETE /api/flags/:id removes it
5. Invalid requests return appropriate error codes (400, 404)

---

## Phase 2: Environment Scoping & Targeting Rules

**Goal:** Add environment-specific flag states and targeting rules (percentage rollout, allowlist, blocklist).

**Requirements:** ENV-01, ENV-02, ENV-03, TGT-01, TGT-02, TGT-03, TGT-04, TGT-05

**Success Criteria:**
1. Each flag has independent enabled/disabled state per environment (dev, staging, production)
2. PUT /api/flags/:id/environments/:env updates environment-specific state and targeting
3. Percentage rollout uses deterministic hash (same userId = same result every time)
4. Allowlisted users always get true; blocklisted users always get false
5. Blocklist takes priority over allowlist when a user appears in both

---

## Phase 3: Evaluation Engine & Analytics

**Goal:** Build the flag evaluation endpoint with API key auth and per-flag analytics tracking.

**Requirements:** EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05, ANLY-01, ANLY-02, ANLY-03

**Success Criteria:**
1. POST /api/evaluate with userId and environment returns all flag evaluation results
2. Evaluation correctly applies environment state, percentage rollout, allowlist, and blocklist
3. Requests without valid API key return 401
4. POST /api/keys generates a new API key; GET /api/keys lists existing keys
5. GET /api/flags/:id/analytics returns per-environment true/false evaluation counts

---

## Phase 4: Frontend Dashboard

**Goal:** Build a complete admin dashboard with flag management, analytics display, and environment switching.

**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05

**Success Criteria:**
1. Dashboard loads at root URL showing all flags with toggle switches
2. Create/edit form includes fields for percentage, allowlist, and blocklist
3. Per-flag analytics view shows true/false evaluation counts
4. Environment switcher changes the displayed flag states and targeting rules
5. All dashboard interactions work via API calls to the backend

---

*Roadmap created: 2026-03-10*
