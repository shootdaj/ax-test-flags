# Requirements: Feature Flag Service

**Defined:** 2026-03-10
**Core Value:** Reliable, deterministic feature flag evaluation — given a userId and environment, consistently return the correct set of enabled flags

## v1 Requirements

### Flag Management

- [ ] **FLAG-01**: User can create a feature flag with name, description, and enabled/disabled state
- [ ] **FLAG-02**: User can read/list all feature flags
- [ ] **FLAG-03**: User can update a feature flag's name, description, and enabled state
- [ ] **FLAG-04**: User can delete a feature flag
- [ ] **FLAG-05**: System stores flags in memory with unique IDs

### Environment Scoping

- [ ] **ENV-01**: Each flag has independent enabled/disabled state per environment (dev, staging, production)
- [ ] **ENV-02**: User can toggle a flag's state for a specific environment
- [ ] **ENV-03**: Default environment state is disabled when a new flag is created

### Targeting Rules

- [ ] **TGT-01**: User can set a percentage rollout (0-100%) for a flag per environment
- [ ] **TGT-02**: Percentage rollout uses deterministic hashing so the same userId always gets the same result
- [ ] **TGT-03**: User can add userIds to an allowlist (always evaluates true regardless of percentage)
- [ ] **TGT-04**: User can add userIds to a blocklist (always evaluates false regardless of percentage)
- [ ] **TGT-05**: Blocklist takes priority over allowlist

### Flag Evaluation

- [ ] **EVAL-01**: API endpoint accepts userId and environment, returns all flags with their evaluation result
- [ ] **EVAL-02**: Evaluation respects environment-specific enabled state
- [ ] **EVAL-03**: Evaluation applies targeting rules (percentage, allowlist, blocklist)
- [ ] **EVAL-04**: Evaluation endpoint requires API key authentication
- [ ] **EVAL-05**: System generates and stores API keys

### Analytics

- [ ] **ANLY-01**: System tracks per-flag evaluation counts (true vs false)
- [ ] **ANLY-02**: User can view analytics for a specific flag
- [ ] **ANLY-03**: Analytics are scoped per environment

### Dashboard

- [ ] **DASH-01**: Dashboard displays list of all flags with toggle switches
- [ ] **DASH-02**: Dashboard has create/edit form with targeting rule fields (percentage, allowlist, blocklist)
- [ ] **DASH-03**: Dashboard shows per-flag analytics view with true/false counts
- [ ] **DASH-04**: Dashboard has environment switcher (dev, staging, production)
- [ ] **DASH-05**: Dashboard is served as static HTML/CSS/JS by Express

### Infrastructure

- [ ] **INFR-01**: Express server with health check endpoint at /health
- [ ] **INFR-02**: All API routes under /api prefix
- [ ] **INFR-03**: Proper error handling and validation on all endpoints
- [ ] **INFR-04**: CORS enabled for API access

## v2 Requirements

### Persistence

- **PERS-01**: Flag data persisted to database (PostgreSQL or SQLite)
- **PERS-02**: Analytics data persisted across restarts

### Advanced Targeting

- **ADVT-01**: Flag dependencies/prerequisites
- **ADVT-02**: User segment targeting (attributes beyond userId)
- **ADVT-03**: Time-based flag scheduling

### Dashboard Enhancements

- **DSHE-01**: Real-time updates via WebSocket
- **DSHE-02**: Flag change audit log
- **DSHE-03**: User authentication for dashboard

## Out of Scope

| Feature | Reason |
|---------|--------|
| Database persistence | In-memory storage sufficient for v1 |
| Dashboard authentication | Admin-only access, no login needed |
| WebSocket real-time updates | Polling/manual refresh is acceptable |
| Flag dependencies | Each flag evaluates independently |
| Audit logging | Analytics covers evaluation tracking |
| Multi-tenancy | Single-tenant service |
| SDK/client libraries | Direct API calls sufficient for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FLAG-01 | Phase 1 | Pending |
| FLAG-02 | Phase 1 | Pending |
| FLAG-03 | Phase 1 | Pending |
| FLAG-04 | Phase 1 | Pending |
| FLAG-05 | Phase 1 | Pending |
| INFR-01 | Phase 1 | Pending |
| INFR-02 | Phase 1 | Pending |
| INFR-03 | Phase 1 | Pending |
| INFR-04 | Phase 1 | Pending |
| ENV-01 | Phase 2 | Pending |
| ENV-02 | Phase 2 | Pending |
| ENV-03 | Phase 2 | Pending |
| TGT-01 | Phase 2 | Pending |
| TGT-02 | Phase 2 | Pending |
| TGT-03 | Phase 2 | Pending |
| TGT-04 | Phase 2 | Pending |
| TGT-05 | Phase 2 | Pending |
| EVAL-01 | Phase 3 | Pending |
| EVAL-02 | Phase 3 | Pending |
| EVAL-03 | Phase 3 | Pending |
| EVAL-04 | Phase 3 | Pending |
| EVAL-05 | Phase 3 | Pending |
| ANLY-01 | Phase 3 | Pending |
| ANLY-02 | Phase 3 | Pending |
| ANLY-03 | Phase 3 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 after initial definition*
