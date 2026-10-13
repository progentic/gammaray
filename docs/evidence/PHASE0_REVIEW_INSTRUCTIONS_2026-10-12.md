# GammaRay Phase 0 architecture revision — documentation patch

**Version:** `v0.0.0` (unchanged)  
**Date:** 2026-10-12  
**Apply to:** The GammaRay worktree after the submitted Phase 0 review package has been reconciled. **Do not** apply these documentation files as a substitute for that package's runtime, workflow or evidence files.

This patch deliberately changes only `docs/` and contains no application implementation. Apply/copy the contained `docs/` tree over the existing repository's `docs/` tree. Preserve all unrelated files and Git history. Nothing is committed by this patch.

## Decisions

| ID | Result | Owner action |
| --- | --- | --- |
| D05 | **Proposed:** A2 single-tenant application + independent raw evidence vault, with expanded profile | Fill `docs/decisions/D05_DEPLOYMENT_PROFILE.md`; select topology and authority model |
| D01 | **Proposed:** independently administered WORM-capable raw vault; version-pinned, read-only evidence broker into ephemeral workers | Select primary vault class and physical layout, specify offline/regulated constraints; D02 still open |
| D03 | **Proposed:** native semantics, JSON Schema 2020-12, typed families, no raw text in normalized events | Approve schema language, nine family/type table, field model, timestamp and versioning rules |
| D07 | **Accepted, 2026-10-12:** three classes, raw-only unrestricted text, server-side raw-read control, masked exports | Implement controls in P1; confirm environment-specific compliance overlay under D05 |
| D08 | Accepted Node 24 | No changes |

## Revised files

- `docs/decisions/D05_DEPLOYMENT.md`: full topology/security/operations decision.
- `docs/decisions/D05_DEPLOYMENT_PROFILE.md`: owner deployment worksheet and network flow register.
- `docs/decisions/D01_STORAGE.md`: protection level alternatives, independent custody, pinned original versions, temporary copy workflow, deduplication/retention issues.
- `docs/decisions/D03_CANONICAL_SCHEMA.md`: schema contract format, field table, family taxonomy, timestamps, identity, examples.
- `docs/decisions/proposals/D03_NORMALIZED_EVENT.schema.json`: **draft**, validation-ready schema, not production code.
- `docs/decisions/proposals/D03_example_auth.json`, `D03_example_network.json`: synthetic examples.
- `docs/decisions/D07_SENSITIVE_DATA.md`: accepted security policy.
- `docs/PHASE0_DECISION_REGISTER.md`: owner-approved D07, other options still pending.
- `docs/PHASE_PLAN.md`: decision statuses; `v0.0.0` retained.
- `docs/ARCHITECTURE.md`, `docs/INVARIANTS.md`: **only** changes needed to reflect the owner-approved D07 raw-only policy; D01/D03/D05 recommendations remain nonbinding.
- `docs/evidence/PHASE0_ARCHITECTURE_REVIEW_2026-10-12.md`: limited verification evidence.

## Verification limits

The draft JSON Schema passed structural validation; two synthetic samples and nine family examples validated, eleven deliberately invalid cases were rejected. Relative documentation links resolved against a reconstructed Phase 0 tree. Full `npm run verify`, GitHub CI, live object-lock semantics, database migrations, and real SOC-data tests were **not** rerun/implemented by this doc-only patch. See the evidence file.

**Outstanding:** D01/D03/D05 owner decisions, D02 retention, real deployment profile, previously identified Gitleaks abnormal-report fail-open correction, live CI dependency audit and required branch protection. **Do not start P1 yet.**
