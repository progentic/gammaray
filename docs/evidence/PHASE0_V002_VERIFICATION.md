# Phase 0 v0.0.2 verification — task P0-D03-002 (D03 contract correction)

**Date:** 2026-10-13 (America/Chicago)
**Task:** P0-D03-002 — D03 contract corrections only. No Phase 1 implementation, no commit, no push, no branch/tag/release (§11 of the task).
**Result:** Patch prepared for owner review. Phase 0 exit is **not** claimed; the Phase 0 decision boundary is unchanged.

## Baseline

The task named baseline `v0.0.1`. The repository in this workspace was at `v0.0.0` (commit `c9d9a36`) when the task arrived; the owner supplied the v0.0.1 closeout package and directed its adoption:

- Package: `GammaRay_v0.0.1_Phase0_Closeout_FULL_2026-10-12.zip`, sha256 `b008225c5fb27d97114477b26ac769eb7fd5f3eab1810fc7a97a4906578fb905`; internal `SHA256SUMS` verified **62/62 OK** before merging. Its declared baseline (`746fc16c…`, the v0.0.0 rulings package) matches this workspace's records.
- Adoption: `starter/` merged over the repo. Merged-tree manifest check: **61/62 OK**, the single mismatch being `.gitignore`, deliberately preserved as the GitHub Node template from the owner's Initial commit (the package's 3-line starter `.gitignore` would have dropped `.env.*` coverage). `LICENSE` (GitHub scaffold) preserved. The superseded `D03_OBSERVABLE_REGISTRY_DRAFT.md` was retired (recoverable from commit `c9d9a36`).
- `scripts/check-secrets.mjs`: the v0.0.1 variant and this workspace's v0.0.0 variant implement the fail-open fix independently (both pass `--self-test` with the pinned scanner, exit 0). The **v0.0.1 baseline variant was kept**, so the baseline tree is byte-faithful.
- The pre-correction baseline was itself validated before editing: schemas, fixtures, registry↔schema agreement, and CVE controls in the v0.0.1 checker design all reproduce under the v0.0.2 suite (which is a superset).

## Changes by workstream

**A — Finding identity (D03 §9 rewritten).** The v1 formula (rule id + rule version + subject + evidence-set hash) is retired. New: **state findings** `SHA-256("GammaRay:finding-id:state:v2\0" ‖ LP(scope) ‖ LP(rule_id) ‖ LP(subject_id))`; **occurrence findings** add a rule-defined deterministic `occurrence_key` (never `raw_ref` alone). Canonical subject grammar, normalization rules, namespace/scope rules, identity-version migration and supersession are specified. **Observations** (§9.3) are first-class records carrying rule/parser/feed provenance, scan discriminator and coverage, evidence-set hash, and the bounded reference set; `observation_id` is deterministic, so replay dedupes and distinct scans never erase each other. **State transitions** (§9.4): resolution requires an `absent_verified` observation from a scan with `complete` coverage for the subject; absence in partial/failed scans changes nothing; `first_seen` is immutable and time-to-remediation is reproducible from history.

**B — Observable registry (registry version 2).** All 26 entries now declare field, type, limits, handling class, permitted families, required/nullable, validation rules, and normalization behavior. Classes corrected to the task's table: `vulnerability.cve_ids`, `vulnerability.cvss_score`, `software.vendor/name/version/cpe/purl` → **operational**; host/actor/internal-IP and asset-linked values (incl. `vulnerability.source_finding_id`) stay **sensitive**; the value-versus-association rule and the internal-identifier escalation rule are recorded in the registry's `classification_policy`. Ports remain sensitive (rationale recorded); file hashes remain sensitive in this corpus (rationale recorded).

**C — Family contracts.** `software_inventory` and `vulnerability` families and their types preserved; the source-event/derived-finding separation is stated in the ADR, the bundle README, and enforced by a cross-schema negative test. CVE contract: 1–32 unique, uppercase grammar, no silent truncation, overflow quarantines (`CVE_SET_TOO_LARGE` retained from §4).

**D — Supporting evidence contract.** Proposed `D03_FINDING.schema.json` and `D03_FINDING_OBSERVATION.schema.json` (Draft 2020-12). Cap: **64 `supporting_raw_refs` per observation** (approved), unique, canonical byte-order for hashing; overflow behavior is quarantine with `EVIDENCE_SET_TOO_LARGE`, no silent discard. Observation history has no lifetime cap; retrieval is bounded/paginated by contract language.

**E — D07 reconciliation.** §3 findings row rewritten to the §9 models; new **§5.1** records the six reporting rules: server-side authorization before access/export, default masking of protected asset relationships, operational aggregates as the reporting surface, sparse-group suppression, restricted handling of raw/free text, audited raw access through the D01 broker boundary, and the EXSUM boundary (approved aggregate vulnerability counts/trends permitted; no host relationships or raw records). §8 notes the correction; no accepted D07 requirement was weakened.

**Docs reconciled:** D03 ADR (§8, §9, headers), D07, decision register (baseline, D03 row, D07 row, footer), PHASE_PLAN (current state, P0 row, P5 work text, status section), ROADMAP, ARCHITECTURE (intel paragraph), INVARIANTS (finding line), D01 (one clarifying sentence: `finding_id` never keys/dedupes/authorizes at the vault; `raw_ref` remains the evidence anchor), D05 + profile (version-of-record only), CI_PLAN (one parenthetical), README, proposals README (rewritten for the v0.0.2 bundle), root schema description (version string only — 1-line diff).

**Not changed:** `src/`, `tests/`, all other `scripts/`, family schemas' constraints, event examples, historical evidence files (v0.0.1 and earlier remain as written).

## Tool versions (executed)

- Node.js **v24.20.0**, npm **10.9.4**
- Gitleaks **8.30.1** (pinned binary via `GITLEAKS_BIN`)
- Python **3** with `jsonschema` **4.10.3**. The contract checker was executed under **both** `$ref` resolution paths with identical PASS results: (a) system Python, where `referencing` is absent (system pip is PEP 668 externally-managed and a direct PyPI fetch was denied by the sandbox egress filter), using jsonschema's legacy `RefResolver` store; (b) a local venv (`/tmp/gr-venv`) where `referencing` installed successfully, using the `referencing` Registry. Both paths register the same local resources; neither performs network resolution; the checker prints the path used.

## Executed checks

| Check | Command | Result |
| --- | --- | --- |
| Contract suite (schemas, registry, identity, transitions, disclosure) | `python3 docs/evidence/D03_draft_contract_check.py` | **PASS** — 5 JSON Schemas valid (Draft 2020-12 `check_schema`); 4 positive event fixtures; 11 family alternatives; CVE boundaries: 1 and 32 accepted, 33/empty/duplicate/lowercase/invalid rejected; 19 event negative fixtures rejected; 26/26 registry fields matched schema (limits, families, classes); event-ID vectors; finding-identity v2 vectors (state stability across changed evidence **and** rule revisions, distinct-asset and distinct-CVE separation, evidence-hash exclusion, occurrence uniqueness/replay stability, retired v1 vector reproduced and shown to re-key on rule-version change); observation determinism + replay dedupe + distinct-scan separation; evidence cap: 64 accepted, 8 observation negatives rejected (65 refs, duplicates, empty, malformed, bad hash, bad coverage, extra property); 4 finding negatives rejected; state-transition reference tests (first/still-open/resolved/reopened; partial- and unknown-coverage absence never resolves); D07 §5.1 reference checks (operational aggregate permitted with sparse groups suppressed; asset-linked disclosure denied without grant, allowed with grant); source-event/finding cross-schema separation |
| Repository verification | `npm ci` then `npm run verify` (Node 24, pinned Gitleaks) | **PASS — 8/8 steps**: router 1589/2048, test-policy, secret-scan (gitleaks 8.30.1, no leaks), lint, typecheck, unit tests, build, e2e. `docs/evidence/verify-node24.json` regenerated by this run (byte-identical summary: 8 passed / 0 failed / 0 blocked) |
| Secret scanner self-test | `node scripts/check-secrets.mjs --self-test` (both variants, during baseline reconciliation) | **PASS** (exit 0) for the retained v0.0.1 variant and the superseded local variant |
| Documentation links | relative-link scan over `docs/**/*.md` | **PASS** — no broken relative links (the one initial hit was this evidence file, written as part of this patch) |
| Version synchronization | `package.json` / `package-lock.json` | **0.0.2** in both (lockfile root + `packages[""]`); diff vs baseline is version fields only |

## Blocked / not run (not waived)

| Check | Status | Reason |
| --- | --- | --- |
| `npm audit --audit-level=high` | **BLOCKED** | Sandbox egress proxy denies the npm audit endpoint (`POST /-/npm/v1/security/audits/quick` returned an error, same `policy_denied` class observed throughout this project). Reproduction: run the command outside the sandbox or in CI. |
| GitHub Actions (live CI) | **NOT RUN** | This patch is uncommitted by task instruction (§11). Additionally, at check time the remote `main` is still `97a0308` (the connector commits): the owner's bundle force-push communicated on 2026-10-13 has not landed yet, and `.github/workflows/verify.yml` is not on the remote branch, so no Actions run exists to inspect. |
| Branch protection / required checks | **NOT RUN** | Manual GitHub setting; unchanged from v0.0.1 status. |

## Outstanding Phase 0 gates (unchanged, still open)

D02 retention/legal hold (must close before real data enters a locked vault); D03 **complete field-model acceptance** (this patch corrects contracts under task authorization; acceptance remains the owner's explicit decision); D04 inventory/scanner CSV mappings; D06 inventory/CTI feed selection, coverage, staleness; D05 P1 worksheet facts DP-01/02/03/07/09/12; `npm audit` green; live CI green; branch protection. No production readiness or Phase 0 closure is claimed.

## Files modified (19) and added (5), vs the v0.0.1 baseline

Modified: `README.md`, `package.json`, `package-lock.json`, `docs/ARCHITECTURE.md`, `docs/CI_PLAN.md`, `docs/INVARIANTS.md`, `docs/PHASE0_DECISION_REGISTER.md`, `docs/PHASE_PLAN.md`, `docs/ROADMAP.md`, `docs/decisions/D01_STORAGE.md`, `docs/decisions/D03_CANONICAL_SCHEMA.md`, `docs/decisions/D05_DEPLOYMENT.md`, `docs/decisions/D05_DEPLOYMENT_PROFILE.md`, `docs/decisions/D07_SENSITIVE_DATA.md`, `docs/decisions/proposals/D03_NORMALIZED_EVENT.schema.json`, `docs/decisions/proposals/D03_OBSERVABLE_REGISTRY.json`, `docs/decisions/proposals/D03_example_finding_identity.json`, `docs/decisions/proposals/README.md`, `docs/evidence/D03_draft_contract_check.py`.

Added: `docs/decisions/proposals/D03_FINDING.schema.json`, `docs/decisions/proposals/D03_FINDING_OBSERVATION.schema.json`, `docs/decisions/proposals/D03_example_finding.json`, `docs/decisions/proposals/D03_example_finding_observation.json`, `docs/evidence/PHASE0_V002_VERIFICATION.md` (this file).

Deliberately not in the patch: `.gitignore` (GitHub template preserved at adoption), `LICENSE` (repo-only scaffold), `SHA256SUMS` (regenerated per package, never committed).
