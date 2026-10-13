# Phase 0 Decision Register

**Baseline:** `v0.0.0`, 2026-10-12. Architecture review amendments do not change the version or begin P1.
**Rule:** a decision is in force only when its status is **Accepted** with a
named approver and date. *Proposed* records a recommendation prepared for
the owner; it authorizes no dependent implementation. *Open* means not yet
prepared. This register summarizes; the linked record is authoritative.

| ID | Decision | Status | Recommendation / outcome | Needed before | Approver | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| D01 | Raw, normalized, and derived storage engines; transaction and backup strategy | **Accepted with changes** | B3 (independently administered WORM-capable vault) accepted as primary class; no physical dedup in v1; `raw_ref` opaque (pinned version + optional byte range); one-object-per-occurrence is the P1/P2 default, segment decision at P3 with measured EPS; lock testing only in a throwaway vault | P1 | Product owner (2026-10-12) | [D01_STORAGE.md](decisions/D01_STORAGE.md) |
| D02 | Raw retention duration, triggers, legal hold, authorized deletion procedure | Open | Not prepared in Phase 0. D01 and D07 mark exactly where D02 lands: retention-only deletion surface (D01), deletion evidence and backup/hold behavior (D07) | P3 retention work; must close by P7 — **and, per the D01 ruling (2026-10-12), before any real data lands in a locked vault** | Product owner | — |
| D03 | Canonical schema fields, versioning, external schema alignment | **Accepted with changes (approach only)** | Approach accepted: native semantics, JSON Schema 2020-12 + generated TypeScript, one family/type per event, §5 timestamp rules. Field model **not** accepted: conditional on an observable registry (field, type, limit, handling class) and an initial P5-sized set including a `vulnerability`/software-inventory family, software name/version, CVE id, URL/domain, MD5/SHA-1 | P1/P2 | Product owner (2026-10-12) | [D03_CANONICAL_SCHEMA.md](decisions/D03_CANONICAL_SCHEMA.md) |
| D04 | CSV mapping contract; rules for missing or unreliable timestamps | Open | Not prepared in Phase 0. Minimum upstream assumption used by D03: a mapping mechanism will exist and CSV records without a usable timestamp follow the D03 §5 missing-time rule (ingest time substituted, flagged) once D04 approves the mapping | P2 | Product owner | — |
| D05 | Deployment topology, tenancy/isolation, deployment trust boundaries | **Accepted with changes** | A2 accepted as the target architecture; raw store behind the `src/raw/` interface; B1 permitted for development/lab only; production claims require B3 or B4 evidence at P7. P1 gating worksheet subset reduced to DP-01, 02, 03, 07, 09, 12; capacity/HA/backup/CI-promotion items deferred to P3/P7 | P1 | Product owner (2026-10-12) | [D05_DEPLOYMENT.md](decisions/D05_DEPLOYMENT.md) |
| D06 | CTI/CVE feed sources, refresh policy, staleness threshold, access rights | Open | Not prepared in Phase 0; no upstream assumption required by D01/D03/D05/D07 | P5 | Product owner | — |
| D07 | PII/sensitive-field rules for raw, normalized, UI, PDF, and logs | **Accepted** | Three classes; raw-only unrestricted free text; distinct raw access checked server-side; masked-by-default PDF, EXSUM aggregates only; D02/D05 environment overlays outstanding. §3 amended 2026-10-12: findings key on stable `raw_ref`; `event_id` advisory only | P1, before handling real data | Product owner (directive, 2026-10-12) | [D07_SENSITIVE_DATA.md](decisions/D07_SENSITIVE_DATA.md) |
| D08 | Maintained Node runtime(s), CI targets, supported operating systems | **Accepted** | Node.js 24 only (`>=24 <25`), one maintained 24 line for development and CI; no Node 20/22 lanes. Decided by the product owner in the Phase 0 task directive, 2026-10-12 | P1 | Product owner (directive, 2026-10-12) | [PHASE0_VERIFICATION.md](evidence/PHASE0_VERIFICATION.md); `docs/evidence/verify-node24.json` |
| D09 | Ingestion transport/platform support and validation environments per initial source | Open | Not prepared in Phase 0. Minimum upstream assumption used by D03 mappings: transports deliver records in the documented source formats; collection method per source is D09's to settle | P3 | Product owner | — |
| D10 | SLOs, performance budgets, recovery targets, release-blocking severity thresholds | Open | Not prepared in Phase 0. D01's sizing model supplies the input variables (events/day, raw bytes/event, overhead factors, retention days) without inventing values | P7 tests (define earlier) | Product owner | — |

## Approval procedure

For each Proposed decision, the owner records one of: **Accept** (as
recommended or with a named alternative), **Accept with changes** (changes
noted in the record), or **Reject** (with the alternative to prepare). On
acceptance: update the row (status, approver, date), mark the decision
record Accepted, and synchronize only the governing text the decision
affects, in a separate authorized change. Phase 1 work blocked by a
decision does not start on a Proposed recommendation.

## Phase 0 current decision scope (2026-10-12)

- **D07: Accepted by product owner.** Applies as policy; no implementation or environment-specific compliance claim. §3 amended 2026-10-12 (findings key on `raw_ref`).
- **D05: Accepted with changes (owner, 2026-10-12).** A2 is the target; B1 dev/lab only; production claims need B3/B4 evidence at P7; P1 worksheet gating is DP-01/02/03/07/09/12 only.
- **D01: Accepted with changes (owner, 2026-10-12).** B3 primary; no physical dedup in v1; `raw_ref` opaque; segment decision at P3 with measured EPS; D02 must close before real data lands in a locked vault.
- **D03: Accepted with changes — approach only (owner, 2026-10-12).** Field model is **not** accepted until the §8 observable-registry condition is met; the schema remains a draft.
- **D08: Accepted.** Node.js 24 remains the sole supported major.
- **D02/D04/D06/D09/D10: Open** at their previously documented gates (D02 additionally gated by the locked-vault condition above).
- Repository version remains **`v0.0.0`**. No release or live data ingestion is authorized. Phase 0 exit gate still requires the `check-secrets.mjs` fail-open fix with negative control, `npm audit`, and CI against a real repository (see `docs/PHASE_PLAN.md`).
