# Architecture output templates

## Repository map

| Area | Responsibility | Key dependencies | Public consumers | Evidence           |
| ---- | -------------- | ---------------- | ---------------- | ------------------ |
| ...  | ...            | ...              | ...              | file/import/config |

## Finding

**Severity:** [high/medium/low]
**Evidence:** [exact files/import path]
**Risk:** [coupling, cycle, unclear ownership, regression surface]
**Recommendation:** [smallest coherent change]
**Migration:** [consumer/API compatibility steps]
**Validation:** [checks to prove behavior remains intact]

## Refactor plan

1. Baseline/characterization.
2. Introduce target owner/boundary.
3. Migrate consumer group A.
4. Validate.
5. Migrate remaining consumers.
6. Remove compatibility path.
7. Run full validation and stale-reference search.
