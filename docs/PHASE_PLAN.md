# GammaRay Phase Plan: v0.0.0 to v1.0.0

**Planning baseline:** 2026-10-12  
**Current state:** `v0.0.0`, a verified TypeScript/Node starter with a greeting CLI; no GammaRay application capability is implemented.  
**Status:** Proposed execution plan, subject to the decision gates below.

## How to use this plan

Work through P0-P8 in order. A phase ends only when its working behavior, negative cases, documented decisions, and verification evidence satisfy the stated **exit gate**. Small vertical slices are preferred to broad scaffolding. Each change follows `docs/WORKFLOW.md` and the constraints in `docs/INVARIANTS.md`. [ROADMAP.md](ROADMAP.md) owns the product objectives; this file owns execution and proof.

The checkpoint versions below are suggestions, not automatic release instructions. No calendar dates, staffing estimates, throughput goals, uptime promises, or deployment architecture have been invented. The product owner retains authority over decisions, scope changes, and release approval.

### Phase sequence

| Phase | Proposed checkpoint | Main dependency | Proof of completion |
| --- | --- | --- | --- |
| P0. Design and decisions | `v0.0.0` | Starter and governing docs | Decisions, scope, and measurable gates recorded |
| P1. Foundation and security boundaries | `v0.1.0` | P0 storage/schema/topology/privacy decisions | Authenticated API, storage and audit contracts exercised |
| P2. CSV vertical slice | `v0.2.0` | P1, CSV mapping decision | Raw-to-normalized-to-query/replay works end to end |
| P3. Complete source ingestion | `v0.3.0` | P2, retention/source collection decisions | Five initial sources supported; lag and gaps visible |
| P4. Metrics and analyst UI | `v0.4.0` | P3 canonical event/query behavior | Validated metrics and dashboards work on ingested data |
| P5. CTI and CVE findings | `v0.5.0` | P4 querying, approved feeds | Traceable matches and feed freshness behavior |
| P6. Snapshot reporting | `v0.6.0` | P4 metrics, P5 findings | Analyst PDF/EXSUM agree on shared figures |
| P7. Production qualification | `v0.9.0` | All functional phases | Security, recovery, performance, and operations gates pass |
| P8. Controlled v1 release | `v1.0.0` | P7 and owner approval | Release deployed, verified, documented, and supportable |

A phase can prepare the next phase's design, but that does not satisfy a later exit gate. An unavailable live system may be represented by synthetic fixtures for development; fixture success alone does not establish production connector readiness.

## P0. Establish the implementable contract

**Objective:** Remove hidden assumptions before choosing storage, data schemas, UI/API dependencies, or deployment components.

**Work**
- Preserve `ARCHITECTURE.md` and `INVARIANTS.md` as the current governing baseline. Confirm the first release's users, authorized roles, target environment, supported source transports, and required reports.
- Record product decisions and rationale in concise decision records; update governing docs only after approval. Mark unresolved choices as **blocked**, not as defaults.
- Agree on the release evaluation method: representative synthetic datasets, available source-system validation, data volume and query patterns, security tests, accessibility requirements, operational ownership, and measurable performance/recovery targets.
- Select a **supported** Node.js runtime/CI matrix before application dependencies are added. The starter's Node 20.9.0 baseline and Node 20 CI lane are obsolete for a future production release (Node 20 reached end of life in April 2026; see the [Node.js release schedule](https://github.com/nodejs/Release#release-schedule)); the replacement is an explicit project decision.
- Establish a location for phase evidence, a decision log, and a release checklist. Keep `AGENTS.md` a small router rather than a second specification.

**Exit gate:** The owner has approved the v1 scope and all decisions needed by P1, identified accountable operators, and recorded the remaining decisions with named deadlines **by phase**, not fictional dates. Baseline `npm run verify` and dependency installation results are recorded.

## P1. Build the foundation and security boundaries

**Objective:** Replace the greeting scaffold with a minimal real application whose data and authority boundaries are testable.

**Work**
- Create the initially needed interfaces in `src/ingest/`, `src/raw/`, `src/normalize/`, `src/store/`, `src/api/`, `src/audit/`, and `src/secrets/`, based on approved storage and schema decisions. Do not generate empty modules for future features.
- Define raw envelope, source identity, permissions, audit event, canonical-event, and error contracts. Implement persistence and schema migrations needed for the first ingest slice; enforce lower-tier write ownership.
- Establish a minimal HTTP/API and usable UI shell with an approved authentication approach. Enforce authorization at every API entry point, including the **separate raw access permission**. Reject unauthenticated and unauthorized requests in integration tests.
- Establish secret retrieval through `src/secrets/`, safe logging/redaction, validation at trust boundaries, and security event auditing. Add automated secret checking to the verification pipeline before handling credentials.
- Replace starter greeting sources and tests only when real application behavior has equivalent executable coverage. Update setup instructions and deployment configuration contracts.

**Exit gate:** In a clean local environment, the application starts, authorized and unauthorized requests have distinguishable tested outcomes, persistent record contracts and audit writes work, and secrets do not leak in responses or logs. The real application passes `npm run verify` on the approved runtime matrix.

## P2. Prove the first end-to-end data path (CSV)

**Objective:** Establish that one complete source path is correct before introducing multiple connector protocols.

**Work**
- Implement CSV column mapping and missing/ambiguous timestamp handling according to the approved policy. Validate file bounds, malformed rows, and unsafe field values.
- Ingest records into append-only raw storage with system UTC ingest time, source identity, original bytes, content hash, batch/position provenance, and idempotent deduplication.
- Parse deterministically into a versioned canonical schema, preserving `raw_ref`, parser version, source timestamp context, and timezone assumptions. Route failures to quarantine without losing raw records.
- Query normalized records through a read-only interface; support permission-checked raw drill-down and reprocessing from raw without mutating originals.
- Capture counts of ingested, deduplicated, normalized, and quarantined records for the range under test.

**Exit gate:** Fixture-based end-to-end tests prove clean import, duplicate replay, invalid or hostile CSV, missing time, parser failure, quarantine, and deterministic rebuild. Every normalized event resolves to one raw record; quarantined records are counted, not silently discarded.

## P3. Complete the initial source set

**Objective:** Bring the four remaining source families into the same proved ingest/normalize contract.

**Work**
- Add read-only Splunk collection; Cisco syslog ingestion; Windows event-log ingestion; and macOS event-log ingestion. Approve the precise transport and collection method for each, including permissions and platform support.
- Provide per-source normalization fixtures, timestamp policies (including syslog missing-year/zone cases and year rollover), parser versions, record/field limits, and typed failures.
- Implement safe source positions/checkpoints, retry/restart behavior, deduplication, bounded ingestion, retention execution with auditing, and visibility into source lag, failures, and missing intervals.
- Exercise realistic source fixtures and, where authorized, representative live or test-system integrations. Keep credentials read-only and source-specific.

**Exit gate:** Each of the five initial source types demonstrates ingestion, replay/idempotency, normalization, quarantine, timestamp provenance, access control, and completeness status. A failed, absent, or delayed feed is visible as incomplete rather than reported as zero activity. Required connector integration evidence is recorded; unvalidated sources prevent the production claim.

## P4. Deliver analyst metrics and dashboards

**Objective:** Make ingested data usable for investigation while preventing metrics from bypassing data or security boundaries.

**Work**
- Implement versioned standard metric definitions and validated declarative custom definitions for filters, grouping, aggregation, and time range; compile to parameterized queries rather than accepting raw executable text.
- Carry ingestion gaps, source lag, and quarantine counts with metric results. Keep time ranges explicit and default to UTC unless a display zone is stated.
- Build standard dashboards and user-customizable visualization definitions in `src/viz/`, consuming the same metric execution path. Provide investigation drill-down, loading, empty, error, stale, and incomplete states.
- Implement and test role-sensitive API operations for raw access, definitions, and views. Audit definition changes; escape untrusted log content and design for keyboard/accessibility support.

**Exit gate:** Analysts can view and customize dashboards on real normalized fixtures. Published metric versions remain stable. Invalid, expensive, and injection-shaped definitions are rejected or bounded. UI tests demonstrate correct permission, time-zone, empty-data, and incomplete-data behavior.

## P5. Deliver CTI and CVE intelligence

**Objective:** Add explainable context without changing the underlying event evidence.

**Work**
- Select and approve indicator/CVE feed providers, licenses or access requirements, refresh intervals, and staleness thresholds before wiring live feeds.
- Extract supported indicators and software identifiers from normalized events. Match against feed records; store enrichment/findings separately with normalized-event reference, feed identity, fetch time, and match basis.
- Display match confidence/limitations as appropriate, stale feeds, unavailable feeds, and reviewable findings in the UI. Add bounded feed refresh, validation, and failure handling.

**Exit gate:** Positive, negative, ambiguous, and stale-feed fixtures produce traceable results. Feed failure never silently converts an unknown result into a clean bill of health. Rebuilding or enriching does not mutate raw or normalized event content.

## P6. Produce consistent analyst and leadership reports

**Objective:** Make reports reproducible and suitable for operational decisions.

**Work**
- Store report snapshots with range, metric and schema versions, definition versions, data completeness, and generation time. Generate both PDF analyst reports and leadership EXSUMs from those snapshots.
- Bind every EXSUM metric figure to a computed value; keep interpretive narrative distinct from measured data. Surface source gaps, quarantined volume, timezone, and stale intelligence.
- Escape unsafe strings in PDF and UI output. Protect export and raw references with authorization; audit report creation and sensitive access.
- Validate pagination, non-ASCII source text, large/empty datasets, repeated rendering, and regeneration after metric-definition changes.

**Exit gate:** For a fixed snapshot, the analyst PDF and EXSUM share identical metric figures and preserve the same completeness qualifications. Independent fixture checks confirm that source changes do not silently rewrite previously generated snapshots.

## P7. Qualify the production candidate

**Objective:** Test the *operated system*, not just individual functions, against measurable release risks.

**Work**
- Deploy the approved topology to a production-like environment using reproducible configuration and migrations. Exercise credential rotation, network loss, source outages, restart, backlog recovery, storage failure, data repair/replay, backup and restore, and retention enforcement.
- Perform threat modeling and security review of access control/IDOR, CSRF where applicable, log/PDF injection, malformed inputs, query/resource exhaustion, PII leakage, audit integrity, dependency exposure, and secrets. Include automated dependency/secret checks in CI with clear failure rules.
- Measure ingestion throughput, backlog delay, query and dashboard latency, report render time, storage use, and restoration against **owner-approved thresholds**. Do not invent thresholds to manufacture a pass.
- Validate accessibility and usability with representative analyst tasks; close critical defects. Document installation, upgrade, rollback, troubleshooting, monitoring, incident response, ownership, and supported runtime versions.
- Demonstrate a production-like end-to-end workflow for each of the five sources using authorized integration evidence, not only mocks.

**Exit gate:** The staging candidate has no unresolved release-blocking defects or security findings; required integration, accessibility, performance, backup/restore, migration, and recovery tests pass with recorded evidence. Operators accept the runbooks and support responsibilities. `npm run verify` and the configured protected CI checks pass on the exact release candidate.

## P8. Approve and release v1.0.0

**Objective:** Deliver a controlled, supportable production release.

**Work**
- Obtain explicit product-owner acceptance of v1 scope and release risks. Confirm all binding `INVARIANTS.md` decisions are closed, documented, and implemented.
- Approve release artifacts, dependency inventory, migration/rollback instructions, retention/privacy policy, release notes, runbooks, and support escalation path.
- Deploy using the approved change process; verify health, source connectivity, access controls, data integrity, metric quality, and reports after deployment. Rehearse or retain an executable rollback path.
- Tag `v1.0.0` **only after** verification and approval. Record the release evidence, limitations, and any nonblocking follow-up work.

**Exit gate:** A production deployment passes post-release validation, the release is accepted by its owner, operators can recover it, and the version tag matches the shipped artifact. Otherwise remain at the release candidate; a green unit suite does not constitute a production release.

## Decision register: approval before dependent work

These are decisions to **make**, not choices already made. D01-D07 correspond to the seven architectural open items in `docs/INVARIANTS.md`.

| ID | Decision required | Needed before | Status |
| --- | --- | --- | --- |
| D01 | Raw, normalized, and derived storage engines; transaction and backup strategy | P1 | **Accepted with changes** (owner, 2026-10-12: B3 primary; no physical dedup in v1; `raw_ref` opaque; segment decision at P3 with measured EPS) |
| D02 | Raw retention duration, triggers, legal hold, and authorized deletion procedure | P3 retention work; must close by P7 — and before any real data lands in a locked vault (D01 ruling, 2026-10-12) | Open |
| D03 | Canonical schema fields, versioning, and any external schema alignment | P1/P2 | **Accepted with changes — approach only** (owner, 2026-10-12; field model conditional on the observable registry, D03 §8) |
| D04 | CSV mapping contract and rules for missing or unreliable timestamps | P2 | Open |
| D05 | Deployment topology, tenancy/isolation, and deployment trust boundaries | P1 | **Accepted with changes** (owner, 2026-10-12: A2 target; B1 dev/lab only; production claims require B3/B4 evidence at P7; P1 worksheet gating = DP-01/02/03/07/09/12) |
| D06 | CTI/CVE feed sources, refresh policy, staleness threshold, and access rights | P5 | Open |
| D07 | PII/sensitive-field rules for raw, normalized, UI, PDF, and logs | P1, before handling real data | **Accepted** (owner, 2026-10-12; controls not yet implemented) |
| D08 | Maintained Node runtime(s), CI targets, and supported operating systems | P1 | Decided 2026-10-12: Node.js 24 only (owner directive); see `docs/PHASE0_DECISION_REGISTER.md` |
| D09 | Ingestion transport/platform support and validation environments per initial source | P3 | Open |
| D10 | SLOs, performance budgets, recovery targets, and release-blocking severity thresholds | P7 tests (define earlier) | Open |

An open decision blocks the specific dependent work; it is never an invitation to choose a permanent default silently. Record the chosen option, alternatives, tradeoffs, owner approval, date, and affected documents. Before production, all D01-D10 decisions relevant to the approved scope must be settled.

## Common phase exit gate

Every phase must provide:

1. **Working behavior:** A complete demonstrable path, not only interfaces or mock screens; failures have defined outcomes.
2. **Integrity and security:** A review of affected `INVARIANTS.md` rows, permission boundaries, untrusted-input handling, completeness/provenance, and applicable negative controls.
3. **Verification:** `npm run verify` passes; focused integration/E2E checks and newly needed checks are documented. CI must enforce the release gate after branch protection is configured.
4. **Documentation:** Updated setup and operating notes, approved decisions, contracts, and evidence with reproducible commands/results. No unsupported release or security claims.
5. **Review:** Complexity and maintainability checked independently of test success; product owner accepts any changed scope, contract, major dependency, or irreversible operation.

### Known starter gaps to retire

- The passing starter tests cover only `greet` and its CLI; they do not validate SOC functionality.
- The verifier originally had **no secret-scanning step**, although `INVARIANTS.md` calls for one. Phase 0 added the step (pinned gitleaks, with a positive control) to the pipeline and the CI workflow; it is implemented and locally verified for normal scanner behavior. **The abnormal-report fail-open identified in review (findings exit with an absent/invalid report read as clean) was fixed on 2026-10-12:** report interpretation is fail-closed in `scripts/check-secrets.mjs` (`interpretScan`), with abnormal-report negative controls in the `--self-test` that CI runs, plus stubbed-scanner end-to-end checks; see `docs/evidence/PHASE0_RULINGS_2026-10-12.md`. Live CI enforcement still depends on the GitHub items below.
- CI targeted Node 20 (out of support) and Node 22. Phase 0 moved runtime policy, CI, and type definitions to Node 24 only (D08, decided by the owner 2026-10-12) and recorded a local Node 24 verification run.
- The ZIP cannot configure GitHub branch protection or required status checks. Configure and verify them in the actual repository before trusting merge gates.
- Successful fixtures or generated PDF examples alone are insufficient proof of live source reliability, secure deployment, or recovery.

## Phase 0 architecture review status — 2026-10-12

Phase 0 remains **in progress** and project version remains **`v0.0.0`**. Owner rulings were recorded on 2026-10-12: **D07 Accepted** (policy; §3 amended so findings key on `raw_ref`), **D05 Accepted with changes** (A2 target; B1 dev/lab only; P1 worksheet gating reduced to six DP items), **D01 Accepted with changes** (B3 primary; caveats in the record), **D03 Accepted with changes — approach only** (field model conditional on the observable registry in D03 §8; schema remains a draft).

Node.js 24 (D08) remains the chosen runtime. Before the Phase 0 exit gate can be claimed: fix the `check-secrets.mjs` abnormal-report fail-open with a negative control, run `npm audit`, and run CI against a real repository. P1 work that depends on the D03 field model remains blocked until its condition is met; no live data ingestion is authorized.
