# Feature Flag Service

## Project

Node.js/Express feature flag service with in-memory storage, targeting rules, and a vanilla HTML dashboard.

# Testing Requirements (AX)

Every feature implementation MUST include tests at all three tiers:

## Test Tiers
1. **Unit tests** — Test individual functions/methods in isolation. Mock external dependencies.
2. **Integration tests** — Test component interactions via API endpoints.
3. **Scenario tests** — Test full user workflows end-to-end.

## Test Naming
Use semantic names: `Test<Component>_<Behavior>[_<Condition>]`
- Good: `TestFlagStore_CreateFlag`, `TestFullFlagLifecycle`
- Bad: `TestShouldWork`, `Test1`, `TestGivenUserWhenLoginThenSuccess`

## Reference
- See `TEST_GUIDE.md` for requirement-to-test mapping
- Every requirement in ROADMAP.md must map to at least one scenario test
