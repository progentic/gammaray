# Invariants

These constraints define GammaRay's contract. Automated checks enforce only the portions described below. Do not weaken a constraint to obtain a green result. Where the enforcement column names a mechanism that does not exist yet, building it is part of the work that introduces the owning component.

## Data integrity

| Constraint | Owner and enforcement |
| --- | --- |
| Raw records are append-only. No update or delete path exists except retention execution | `src/raw/` exposes append and read only; retention job is the sole deleter and writes an audit event per run |
| Every raw record carries a system-assigned UTC ingest timestamp, source id, source type, batch id, and content hash | Raw envelope constructor in `src/ingest/` rejects incomplete envelopes |
| The ingest timestamp comes from GammaRay, never from the source. The source-claimed timestamp is stored separately | `src/ingest/` sets ingest time; envelope type has distinct fields |
| Re-ingesting the same source data does not create duplicate raw records | Idempotency uses a source-scoped occurrence key with defined retry boundaries, not content hash alone. Preserve separate identical-byte occurrences; test retry races and nullable source positions under D01/PostgreSQL |
| Every normalized event references exactly one raw record via `raw_ref`. No normalized event exists without raw | Normalized store write rejects events with missing or unresolved `raw_ref` |
| Normalization is deterministic. Same raw record and same parser version yield the same normalized event | Parsers are pure; golden-fixture tests per parser; parser id and version stored on every event |
| The normalized store is rebuildable from raw | Reprocessing command in `src/normalize/`; test rebuilds a fixture set and compares |
| A record that fails normalization is never dropped. It stays in raw and is recorded in quarantine with a reason | Normalizer returns a typed failure; quarantine writer in `src/normalize/`; quarantine counts feed metrics and reports |
| Analysis components never write to raw or normalized stores | Store interfaces handed to `src/metrics/`, `src/intel/`, `src/viz/`, `src/reports/` are read-only types |
| Enrichment and findings are separate records that reference events. They never modify normalized events | `src/intel/` writes only to the enrichment and findings store |

## Time

| Constraint | Owner and enforcement |
| --- | --- |
| Event time is stored in UTC with the original offset or zone status retained | Canonical schema in `src/normalize/` requires both fields |
| When a source omits year or timezone, the normalizer applies the per-source configured assumption and flags the event as assumed. It never guesses silently | Timestamp resolver in `src/normalize/`; per-source config is required for sources known to omit these; fixtures cover year rollover |
| Metric time windows and report ranges are interpreted in UTC unless a display zone is stated in the output | `src/metrics/` and `src/reports/` take explicit zone parameters; reports print the zone |

## Completeness and honesty of output

| Constraint | Owner and enforcement |
| --- | --- |
| A source with failed, lagging, or missing ingestion for the requested range is shown as a data gap in dashboards and reports. Incomplete data never renders as complete | Completeness status computed by `src/ingest/`; consumed by `src/metrics/`, `src/viz/`, `src/reports/`; report snapshot stores it |
| Quarantined volume for the requested range is reported alongside metrics derived from that data | `src/metrics/` includes quarantine counts in result metadata |
| Enrichment output shows feed identity, feed fetch time, and match basis. Stale feeds are labeled stale | `src/intel/` record schema requires these fields; renderers display them |

## Reproducibility of reports

| Constraint | Owner and enforcement |
| --- | --- |
| A report is generated from a stored snapshot recording time range, metric definition versions, schema version, completeness status, and generation time | `src/reports/` snapshot type; renderers accept only snapshots |
| Analyst PDF and EXSUM render from the same snapshot mechanism. A figure shown in both has the same value | Both renderers in `src/reports/` read the same snapshot; test compares shared figures |
| EXSUM figures are bound to metrics. Free-text narrative cannot introduce an unbound number as a metric value | EXSUM assembler in `src/reports/` requires a metric binding for each figure |
| Standard metric definitions are versioned. Changing a definition creates a new version; prior versions remain resolvable | `src/metrics/` definition registry rejects in-place edits of published versions |

## Security

| Constraint | Owner and enforcement |
| --- | --- |
| Log content is untrusted input. It is escaped on render in the UI and in PDF output and never interpreted as markup, code, or query text | Output encoding in `src/viz/` and `src/reports/`; tests with hostile fixture strings |
| Parsers enforce record size and field limits and fail typed rather than crash or exhaust memory | Limits in `src/normalize/`; oversized and malformed fixtures per parser |
| Custom metrics and visualizations are declarative. No user-supplied executable code, and user input never forms raw query text | Definition validator and parameterized query compiler in `src/metrics/`; tests with injection fixtures |
| Connectors are read-only toward sources and use least-privilege credentials | Connector interface exposes no write operations; Splunk credentials are scoped to search/read |
| Credentials are retrieved only through `src/secrets/`. They never appear in code, logs, reports, or error messages | Secret scanning in verification; log and error paths redact; `.env.example` holds names only |
| Authorization is checked in `src/api/` for every request. Raw record access is a distinct permission from normalized access | API authorization layer; tests per role |
| Raw access, report generation, and metric or visualization definition changes produce audit events | `src/audit/` writer called at those boundaries; test asserts events are emitted |
| D07 (accepted): original messages, command lines, and arbitrary untrusted free text remain in restricted raw only; normalized schema permits only validated, classified structured fields | `src/normalize/` schema denies unbounded text and unknown extensions; unit/negative tests when implemented |
| D07 (accepted): the API enforces source-scoped raw-read permission before retrieving data, and the report/export boundary excludes restricted raw bytes by default | `src/api/` and raw-read broker authorize; `src/reports/` only renders approved fields; tests per role and export |

## Verification and process

| Constraint | Owner and enforcement |
| --- | --- |
| AGENTS is at most 2,048 bytes and has Routing, Commands, Core Rules, and Done Gate sections | Router checker; referenced uppercase `docs/*.md` paths must exist |
| A failed or blocked verification step cannot produce overall success | Orchestrator returns exit 1; usage errors return 2 |
| Skipped, focused, and todo tests are prohibited | Static checker handles documented forms; runtime rejects reported skipped/todo tests |
| Dependency reproduction uses the committed lockfile | `npm ci`; authorized changes update manifest and lockfile together |
| Fixtures and test data contain no real production log content or credentials | Review obligation; secret scanning in verification |

## Review obligations

Read authoritative code and relevant documents. Trace the affected flow from connector through raw, normalized, derived, and output tiers. Identify the owning boundary and applicable constraints. When adding a log source, confirm the timestamp behavior, quarantine behavior, and dedupe behavior for that source. When changing a metric, check which reports and dashboards consume it. Preserve security and integrity controls when introducing features. Review complexity separately from correctness. Report verification evidence and any blocked checks honestly.

These obligations require review; passing scripts does not prove they were followed.

## Accepted open items

1. **D01 selected:** independently administered B3 WORM raw vault plus PostgreSQL relational store; exact vault product, Postgres hosting, roles and restore implementation remain unverified.
2. Raw retention period, retention trigger, and any legal-hold behavior are not defined.
3. **D03 approach accepted, field model pending:** native JSON Schema 2020-12, two additional families and a 26-field draft observable registry; owner field-model approval and implementation remain outstanding.
4. CSV ingestion needs a defined column-mapping mechanism and a rule for CSVs without a reliable timestamp column.
5. **D05 A2 selected:** single application deployment and separately administered raw vault as target. P1 worksheet DP-01/02/07/09/12 needs owner facts; P7 must verify B3/B4 controls.
6. **D06 open:** CTI/CVE feeds, refresh and staleness rules **and a dependable software inventory/asset version source** are undefined. D04 must enable reviewed CSV inventory/scanner-export mappings; initial connectors alone do not supply guaranteed inventory.
7. **D07 accepted, 2026-10-12:** three sensitivity classes; unbounded free text in restricted raw only; server-enforced distinct raw-read permission; masked-by-default exports; EXSUM aggregates only. Findings use the D03 §9 state/occurrence `finding_id` models with per-observation bounded `raw_ref` anchors (max 64), not a `raw_ref` primary key, and never an evidence hash or rule version inside the identity. Implementation and environment classification overlay remain outstanding under P1/D05.
8. GitHub required status checks must be configured on the destination repository; the archive cannot establish that setting.
9. The static test checker does not follow reassignment such as `const c = test; c.only(...)`. Runtime skipped/todo detection does not close this focused-test gap.

The project has no defined degraded mode that waives these obligations. New requirements should add concrete constraints at their owning boundary.
