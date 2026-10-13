# Phase 0 v0.0.1 closeout patch — review and verification evidence

**Date:** 2026-10-12 (owner local date)  
**Baseline:** `GammaRay phase 0 rulings 2026-10-12.zip`, complete `starter/` tree; source `SHA256SUMS` verified **53/53** before editing.  
**Target:** `v0.0.1` pre-foundational code/documents only. No Phase 1 work, production claims, real credentials, real evidence ingestion, Git commits, remote setup, or tag.  
**Status:** Patch prepared and focused checks passed; **Phase 0 exit NOT accepted** (unresolved gates below).

## Owner decisions incorporated

| Record | Result in this patch | Scope limit |
| --- | --- | --- |
| D05 | A2 target retained; DP-13 acknowledges PostgreSQL | DP-01/02/07/09/12 remain TBD; no owner profile invented |
| D01 | B3 immutable vault retained; PostgreSQL selected for relational roles, no physical dedup in v1 | Vault product/installation and D02 retention/holds open; no real vault test |
| D03 | Both `software_inventory` and `vulnerability` families; **proposed** 32 CVE max; 26-field observable registry; MD5, SHA-1, SHA-256, software, domains, bounded URL | Complete field model remains **proposed for explicit approval**; no parser/generator/runtime implementation |
| Finding identity | `finding_id` deterministic over rule ID+version, subject, hashed bounded evidence set; proposed 1–64 `raw_ref` anchors; parser/feed revision stored separately | Domain-separated hash framing specified, sample vector validated; no persistent finding store implemented |
| D07 | `raw_ref` now correctly defined as evidence anchor, not finding key; server authorization and raw-only free text unchanged | Accepted policy, unimplemented |
| D04/D06 | Explicit inventory and source-vulnerability feed prerequisites; approved Splunk/CSV exports are potential sources, not assumed coverage | Feed and CSV mapping decisions remain open |
| D08 | Node.js 24 required; package and root lockfile version advanced `0.0.0` → `0.0.1` | No Node version policy change, no dependency additions |

## Schema and registry validation

Run from the repository root (review tooling, **not** an application Python runtime dependency):

```sh
python docs/evidence/D03_draft_contract_check.py
```

Environment: Python 3 with `jsonschema` 4.x and `referencing` installed; validator configured with JSON Schema Draft 2020-12 `FormatChecker` and explicit registration of two local family schema resources. **Observed result:**

```text
PASS: 3 JSON Schemas valid; 4 positive fixtures; 11 family alternatives; 32-CVE boundary; 18 negative fixtures rejected; 26 observable registry fields matched; event/finding ID vectors and order invariance confirmed.
```

The negative fixtures test absent inventory/vulnerability objects, array of inventory products (no fan-out), missing/empty/duplicate/invalid/over-limit CVEs, mismatched family/type, raw message and unknown fields, incorrect legacy hash lengths, unsafe URL query/fragment/userinfo, out-of-range CVSS, and unreviewed software free text. A 32-element CVE array validates; a 33-element array fails. CVE overflow quarantine is a **contract requirement**, not implemented behavior. A source inventory item does not establish CVE exploitability.

`finding_id` fixture and test cover lexicographic sorting, deduplication, stable hash on reordered evidence, and changed identity when rule version changes. `event_id` vectors match existing parser/version framing; parser revisions are explicitly advisory provenance for findings.

## Secret scanner fix and negative controls

Changes to `scripts/check-secrets.mjs`:

1. Parse nonempty reports on **both scanner exit 0 and 1**; malformed, whitespace-only or non-array JSON fails with `SCANNER_REPORT_INVALID` even on clean exit.
2. Treat an absent report (`ENOENT`) as valid only on a clean exit. Treat a present but unreadable report (`EACCES`, `EISDIR`, etc.) as a failed scan regardless of exit.
3. Keep the preexisting findings-exit invalid/missing report failure and contradictory clean-exit-with-findings failure.
4. Extend the existing `--self-test` with clean-exit malformed/non-array/whitespace and actual filesystem unreadable-report negative cases. This runs in the existing GitHub Actions workflow once a live repository is available and a real pinned Gitleaks binary is installed.

**Focused checks actually executed** using **Node 22.16.0** (the only installed Node major) with a clearly synthetic substitute scanner, **not real Gitleaks**:

- Scanner integration fault injection: 7 rejected scenarios (exit 0 malformed, non-array, unreadable, report lists findings; exit 1 unreadable, missing, valid findings), plus 2 accepted clean shapes (absent report and `[]`). For invalid reports, process exit was 1 with `SCANNER_REPORT_INVALID`; valid findings returned `SECRET_FOUND` with exit 1.
- Pure interpreter: 11 positive/negative combinations; filesystem path tests: 3; additional whitespace-only exit 0 and 1 rejected.
- `node --check scripts/check-secrets.mjs`: passed.

**Limit:** The real pinned Gitleaks `--self-test` and full Node 24 verification have **not** been rerun for this `v0.0.1` revision. A synthetic scanner tests GammaRay's response handling, not Gitleaks detection quality or configuration. The earlier submitted package's 8/8 Node 24 pass applies only to the earlier `v0.0.0` revision.

## Local repository checks and limitations

| Check | Outcome |
| --- | --- |
| Source ZIP original SHA256SUMS | **53/53 passed** before editing |
| D03 synthetic JSON Schema and registry validation | **Passed**, per script above |
| Gitleaks abnormal output handling and stub fault injection | **Passed**, focused Node 22 only |
| `node scripts/check-router.mjs` | **Passed**, AGENTS 1589/2048 bytes |
| JavaScript syntax: `node --check scripts/check-secrets.mjs` | **Passed** |
| Package and lockfile metadata | **Both 0.0.1**, Node `>=24 <25` unchanged |
| `node scripts/check-tests.mjs` | **Blocked**: TypeScript package absent (`ERR_MODULE_NOT_FOUND`); no locked install available |
| `npm run verify` on Node 24 | **Not run**: Node 24 and required dependencies/scanner are unavailable in this environment |
| `npm audit --audit-level=high` | **Blocked/untested for this patch**; previous environment's registry audit endpoint returned 403 `policy_denied`; do not infer a clean dependency audit |
| GitHub Actions live `verify` job + branch protection | **Not run/configured**: no remote or commit in supplied tree; owner authorization needed |
| Production B3 WORM, Postgres privileges, real data ingestion | **Not tested/implemented**; P1/P7/D02 gates apply |

## Outstanding owner and implementation gates

1. **D03:** Product owner must explicitly approve, amend or reject the complete 26-field model, the two family payloads, the **proposed 32-CVE and 64-evidence-ref limits**, and the bounding/policy assumptions before the canonical model is implemented.
2. **D05:** DP-01 (target environment), DP-02 (classification/compliance), DP-07 (analyst identity), DP-09 (vault placement/custody), DP-12 (scratch isolation) still need owner values. DP-03 A2 already selected; other worksheet items remain deferred, not waived.
3. **D02:** Define retention/hold policy *before any real data* enters a locked vault. No throwaway short-retention test may be performed on real evidence.
4. **CI:** Execute Node 24 `npm ci`, `npm run verify` and a real Gitleaks `--self-test`; run `npm audit`; execute and require GitHub Actions `verify` on an owner-approved remote. Nothing committed/pushed by this patch.
5. **D04/D06:** Confirm authorized software inventory and source vulnerability feeds, schemas, coverage, asset identity, product versions and staleness before any P5 CVE coverage claim.

**Conclusion:** This is a narrowly scoped, reviewable **`v0.0.1` Phase 0 closeout patch**, not a Phase 0 exit acceptance, Phase 1 implementation, production artifact, or live data authorization.
