# D03 — Explicit normalized event contract and event families

**Status:** **Accepted with changes (approach only)** — product owner, 2026-10-12. The approach in §1 is accepted; the field model (§2–§4 and the draft schema) is **not** accepted until the observable-registry condition in §8 is met.  
**Repository version:** `v0.0.2` (contract-only design; no normalizer implemented)  
**Blocks:** P1/P2  
**Dependencies:** D01 unique occurrence identity, D04 CSV mapping, D07 accepted data policy, D09 source protocol support

## 1. Decide the schema language and semantics separately

**Question 1: semantic alignment.** Should GammaRay use (A) a native, small schema, (B) full OCSF class/type semantics, or (C) full Elastic ECS field and category semantics? Original proposal A remains a reasonable default for internal metric/report consumers. Borrowing select ECS names **does not confer ECS compatibility**; GammaRay must own and version every field and maintain an export mapper if another consumer later requires OCSF/ECS.

**Question 2: contract artifact.** How is the chosen shape made enforceable at runtime?

| Contract format | Advantage | Limit |
| --- | --- | --- |
| TypeScript interfaces only | Fast to author, good editor/compiler support | Disappear at runtime: do not validate hostile, external event JSON |
| **JSON Schema Draft 2020-12 + generated TypeScript** | Runtime validation of types/enums/shapes; language-neutral; versioned machine-readable contract | Must maintain schema tooling, generation verification and compatibility tests |
| Protobuf/Avro + generated code | Compact typed message transport; strong contract tooling | Extra encoding/schema-registry burden before a transport requirement exists |

**Provisional recommendation:** choose semantic Option A and **JSON Schema Draft 2020-12 as source of truth**, generating TypeScript types and runtime validators from that same versioned contract. **Owner ruling (2026-10-12): this approach is accepted** — native semantics (A), JSON Schema 2020-12 with generated TypeScript, one family and one type per event, and the §5 timestamp rules. Acceptance of the approach is not acceptance of the drafted field model; see §8. Preserve raw bytes separately, and store/query normalized JSON/relational projections only after validation. JSON is a serialization format, JSON Schema validates it, and generated TS gives developers type support. Corrected under task **P0-D03-002** (v0.0.2): §9 finding identity replaced with explicit state/occurrence models plus an observation contract; the 32-CVE and 64-reference caps are approved by that task; registry handling classes corrected per the task's classification table. The complete field model remains proposed pending the owner's acceptance of the corrected patch. The revised proposal lives in [proposals/D03_NORMALIZED_EVENT.schema.json](proposals/D03_NORMALIZED_EVENT.schema.json), alongside [the observable registry](proposals/D03_OBSERVABLE_REGISTRY.json) and the two new family schemas. The complete field model remains **proposed for owner review**, not approved for implementation. This is *not yet a production schema*.

## 2. Explicit canonical event shape

A normalized event is a **versioned, typed JSON object**, not an arbitrary map. Use nested objects for `host.name` / `source.ip` semantics, rather than literal field keys containing periods. Dot notation in this ADR denotes a nested path.

| Area | Field | Type | Required | Classification / meaning |
| --- | --- | --- | --- | --- |
| Identity | `schema_version` | positive integer | Yes | Operational; revision of canonical contract, separate from app `v0.0.2` |
| Identity | `event_id` | 64-character lowercase SHA-256 hex | Yes | Opaque event version identity; deterministic with same raw/parser inputs |
| Identity | `raw_ref` | opaque, bounded ASCII identifier | Yes | Restricted pointer (access needs separate raw permission) |
| Parser | `parser.id`, `parser.version` | bounded nonempty string | Yes | Parser choice and revision used to produce the event |
| Ingest | `source.connector_id`, `source.connector_kind` | string, enum | Yes | GammaRay connector instance and transport (`splunk`, `cisco_syslog`, `windows_event`, `macos_log`, `csv`) |
| Producer | `source.producer_vendor`, `source.producer_product`, `source.producer_event_code` | bounded string | Optional | Original emitter identity, independent of collector/transport |
| Time | `time.ingest_utc`, `time.event_utc` | RFC3339 UTC string | Yes | System-assigned ingest time and resolved event time |
| Time | `time.zone_status` | `source_provided` / `assumed` / `missing` | Yes | Explicit timestamp confidence state, never a silent guess |
| Time | `time.offset_minutes`, `time.assumption_id` | signed integer, bounded ID | Optional | Original or assumed offset and named policy for a missing component |
| Classification | `event.family` | closed enum from §3 | Yes | One primary family per normalized event |
| Classification | `event.type` | closed family-scoped enum from §3 | Yes | Specific activity/observation kind, not an arbitrary source message |
| Classification | `event.action` | bounded string | Optional | Parser documented action. **Do not confuse network deny with an event failure** |
| Classification | `event.outcome` | `success` / `failure` / `unknown` | Yes | Source supported outcome; `unknown` when undeterminable |
| Classification | `event.severity_band`, `event.code` | enum, bounded string | Optional | Normalized severity and original event code |
| Observables | `host`, `actor`, `network`, `web`, `process`, `file`, `software`, `vulnerability` | validated typed objects | Optional, family dependent | Typed observables in the registry; classes and limits are field specific; free text is never copied |
| Family data | `details` | discriminated typed object (§3) | Optional | Family-specific bounded typed fields, no raw text |
| Provenance | `extensions` | approved per-source typed objects | Optional | Parser-reviewed extensions; **no unconstrained catch-all** |

**D07 prohibition:** The normalized contract **does not define** `message`, `event.original`, `process.command_line`, raw command/output strings, unrestricted URLs, or other arbitrary log text. These remain in the protected raw vault. CTI extraction can use explicitly approved structured observables; parsing arbitrary command lines or full messages requires an additional protected pipeline, explicit security review and future ADR amendment.

**Absence versus unknown:** Missing optional means unavailable or unsupported and must be omitted, not populated with a guess. `event.outcome: unknown` is an intentional explicit value. Invalid types are errors and quarantine rather than coerced silently. A value is never turned into `null` without an explicit nullable contract.

## 3. Primary event families and permitted event types (proposal)

The family is the **security activity being described**, not the product collecting it. `Splunk` is a connector, not an event family; `Windows` and `Cisco` identify producers, not families.

| Family (`event.family`) | Approved *draft* types (`event.type`) | Examples / likely initial inputs | Optional family details |
| --- | --- | --- | --- |
| `authentication` | `authentication.login`, `authentication.logout`, `authentication.authorization`, `authentication.other` | Windows 4624/4625, macOS sshd, Cisco ISE AAA, Splunk auth | `logon_type`, `auth_method` |
| `network` | `network.connection`, `network.dns`, `network.protocol`, `network.other` | Cisco ASA/IOS syslog, Splunk PAN traffic, Zeek via Splunk | `bytes_in`, `bytes_out`, `dns_question_type` |
| `process` | `process.start`, `process.stop`, `process.other` | Windows event data, selected macOS/Splunk sources | `parent_pid` |
| `file` | `file.create`, `file.modify`, `file.delete`, `file.other` | Endpoint file events if source supplies them | `operation` |
| `identity` | `identity.account`, `identity.group`, `identity.privilege`, `identity.other` | Windows account/privilege changes, directory security | `change_kind` |
| `configuration` | `configuration.change`, `configuration.other` | Network configuration changes, Windows audit | `component` (bounded enum/registry ID) |
| `system` | `system.service`, `system.health`, `system.other` | Service lifecycle, host warnings, Cisco platform logs | `state` |
| `security_detection` | `security_detection.alert`, `security_detection.malware`, `security_detection.other` | Splunk detection/EDR, Palo Alto threat/security syslog | `signature_id` |
| `unclassified` | `unclassified.observation` | Validly parsed source events without demonstrable semantic classification | No details; count separately in metric completeness |
| `software_inventory` | `software_inventory.observed`, `software_inventory.installed`, `software_inventory.removed` | Approved Splunk inventory result or CSV export; *not* assumed from host install telemetry | Requires one `software` object with a bounded `name`; version optional but CVE matching requires evidence of a usable version |
| `vulnerability` | `vulnerability.detected`, `vulnerability.resolved`, `vulnerability.status_changed` | Source-reported scanner result via approved Splunk search or CSV export | Requires a bounded `vulnerability.cve_ids` array, at most **32** distinct IDs (numeric cap **approved** under task P0-D03-002; the surrounding field model remains pending owner acceptance); do not infer scanner evidence from software alone |

Choose one primary family per normalized event for a stable discriminated union. Secondary tags or ECS multi-category export can be added at the **export boundary** with its own versioned mapping. An event with a recognizable structure but no defensible activity classification may use `unclassified`; a malformed or unverifiable record must be quarantined. Never invent a category just to improve charts.

**Do not conflate:** `security_detection` is an event emitted by a source security product; GammaRay's CTI/CVE matches are separate **derived findings** in `src/intel/`. A CVE match is not a source event and must not mutate the event that triggered it.

## 4. Narrow family-dependent payloads

The draft machine-readable schema binds `event.family` to its allowed types and corresponding `details` object using `oneOf` discriminated variants. Examples:

- `authentication` may add numeric `logon_type` and bounded `auth_method`, but not a free-text logon message.
- `network` may add nonnegative traffic counters and bounded DNS record **type**, not an unbounded query string. IP observables remain separately classified `sensitive`.
- `security_detection` may include a bounded `signature_id`. Original alert text remains restricted raw.
- `unclassified` must not create guessed observables, action, or family details.
- `software_inventory` requires `software.name` and permits reviewed `software.vendor`, `software.version`, `software.cpe` and `software.purl`. The source event reports inventory; it does not prove exploitability.
- `vulnerability` requires 1–32 unique, normalized CVE identifiers, and may carry a source finding ID and CVSS score. More than 32 CVEs in one raw event is **not** silently truncated or fanned out: it is quarantined with typed `CVE_SET_TOO_LARGE`, preserving the locked original. A new fan-out decision is required before supporting that source format.
- `file.md5` and `file.sha1` are legacy CTI matching observables, **never** integrity digests for the raw vault. `file.sha256` remains supported; D01 vault integrity stays SHA-256.
- `web.url` is a **reviewed, bounded** HTTP(S) indicator with no userinfo, query, or fragment. The parser must also reject or omit paths containing sensitive material or risky encoding. Full arbitrary URLs remain in restricted raw. `network.domain` is distinct from the original DNS question name.

The equivalent intended TypeScript discriminant for two representative families is:

```ts
type AuthVariant = {
  event: { family: "authentication"; type: "authentication.login" | "authentication.logout" | "authentication.authorization" | "authentication.other"; outcome: "success" | "failure" | "unknown" };
  details?: { logon_type?: number; auth_method?: "password" | "certificate" | "token" | "biometric" | "other" | "unknown" };
};
type NetworkVariant = {
  event: { family: "network"; type: "network.connection" | "network.dns" | "network.protocol" | "network.other"; outcome: "success" | "failure" | "unknown" };
  details?: { bytes_in?: number; bytes_out?: number; dns_question_type?: string };
};
// Draft shapes omit common fields for brevity; the JSON Schema is normative.
```

The full TypeScript union should be generated or checked against the JSON Schema after approval. Generated type narrowing must be verified: not every generator preserves discriminants equally well.

All extension fields require named types, max lengths, documented meanings, classification and source-mapping tests. Do not transport the original event through `extensions` or `details` as an escaped string.

## 5. Time and event identity rules

1. A valid timestamp with source offset/zone becomes UTC; `zone_status = source_provided` and retain known original offset.
2. A missing **component** (year or zone) uses a configured source policy only if unambiguous within the policy's stated bounds; set `zone_status = assumed` and `assumption_id`. Year rollover and daylight-saving ambiguity are negative control cases.
3. A fully **absent** event timestamp may substitute system ingest time with `zone_status = missing`; dashboards/reports must label that substitution and never treat it as source-observed time.
4. A **malformed** timestamp or ambiguous local time without a valid resolution policy is **not** equivalent to absent. Quarantine with a typed reason, do not replace with ingest time to hide a parser error.
5. `event_id` is deterministic per `raw_ref`, parser id/version and output ordinal if fan-out is later approved. **Correction adopted for v0.0.1:** `event_id` is a parser-version-specific projection, not a stable finding key. A derived finding receives its own `finding_id` defined in §9, while **one or more** `raw_ref` values anchor its evidence. Snapshots must retain references to the versions they actually used. A parser bump does not by itself change a finding identity. Specify the **exact byte framing** to avoid ambiguous concatenation: SHA-256 over the UTF-8 domain tag `GammaRay:event-id:v1\0` followed by each of `raw_ref`, parser id, parser version encoded as a 32-bit big-endian byte length plus UTF-8 bytes. The existing parser contract produces at most one normalized event per raw record. No fan-out change is authorized here. The example IDs use this illustrative framing; this formula is not binding until D03 is approved.
6. `source.connector_kind` is distinct from `source.producer_product`. A Cisco ASA event returned through Splunk must retain both facts.
7. Every normalization or field contract change increments `schema_version`; additive optional fields still increment it. An additive revision may require no data rewrite, but the compatibility/reprocessing decision must be recorded. Never alter published meaning without a new revision.
8. Schema parser output validation is enforced at **runtime** before a normalized write (including explicit `date-time` and IP `format` validation, because JSON Schema format checks are not always assertions by default); TypeScript compilation alone is insufficient. Domain checks for `event_id` derivation, source-to-extension binding, ingest/event timestamp relationships, normalized `missing` timestamp equality to ingest time, and numeric source semantics require application-level tests beyond shape validation. Persist the parser/schema versions used for each record and report snapshot.

## 6. Example mappings (synthetic only)

| Synthetic source | Connector | Producer | Family / type | Key fields |
| --- | --- | --- | --- | --- |
| CSV with `user`, `host`, `ts`, `result` | `csv` | Owner-defined CSV map | `authentication` / `authentication.login` only if mapping proves semantics | Actor, host, time, outcome; unknown columns raw-only |
| Splunk result with `sourcetype=cisco:asa` | `splunk` | Cisco ASA | `network` / `network.connection` | IPs, ports, action; Splunk is not the producer |
| Cisco ASA syslog `%ASA-6-...` | `cisco_syslog` | Cisco ASA | `network` / `network.connection` if parsed | Zone/year assumption flagged; no copied raw message |
| Windows Event ID 4625 | `windows_event` | Windows Security | `authentication` / `authentication.login` | `outcome=failure`, host, account, source IP, event code |
| macOS sshd failure | `macos_log` | sshd on macOS | `authentication` / `authentication.login` | `outcome=failure`, source IP, optional process name |
| Palo Alto threat result in Splunk | `splunk` | Palo Alto | `security_detection` / `security_detection.alert` | Signature ID, severity; raw details remain vaulted |

Runnable *contract examples*, not app implementation: [authentication JSON](proposals/D03_example_auth.json), [network JSON](proposals/D03_example_network.json), [software inventory JSON](proposals/D03_example_software_inventory.json), and [source vulnerability JSON](proposals/D03_example_vulnerability.json).

**Source dependency:** The five initial connector kinds do not guarantee inventory or vulnerability coverage. Windows/macOS event telemetry may describe specific install actions, but generally does not establish a complete installed-software inventory. D04 must support an explicit CSV inventory/scanner-export mapping; D06 must identify the software inventory source, approved scanner/asset evidence where relevant, coverage, refresh/staleness and feed licensing before reliable CVE matching is claimed. Splunk may carry the data only if the authorized export or sourcetype actually contains it. No inventory feed means CVE matching is **unknown/unsupported**, never zero vulnerabilities.

## 7. Validation and acceptance gates

The owner has already selected native JSON Schema 2020-12, one event per raw record, two additional families, and D07 minimization. **Before accepting the remaining field model**, review each registry field, its handling class, per-source coverage, unknown/absent behavior, URL restrictions, and quarantine rules. A later request for fan-out or unbounded indicators requires a separate architectural decision.

Before P2 exit, prove: valid and invalid JSON Schema fixtures per family; rejected unknown keys; rejected arbitrary messages; deterministic replay with fixed parser version; a Splunk transport/producer distinction; missing versus malformed timestamps; idempotent event identity; source parser negative controls; quarantine without dropping raw.

**Phase 0 v0.0.1:** the §1 approach and two new family additions were directed by the owner. The expanded field model is now documented and validated as a **draft**; the owner has not yet accepted the complete field table or authorized a normalizer. No application code, interfaces or database schemas have been implemented.

**Phase 0 v0.0.2 (task P0-D03-002):** contract corrections only — §9 identity models, observation contract, registry classifications, D07 reporting reconciliation, and executable contract tests. Still no normalizer, no application code, and no field-model acceptance is claimed by the corrections themselves.

## 8. Observable registry and field-model acceptance condition

The owner required a machine-readable register of **every normalized observable**, with its field path, type, bounds and D07 handling class. This is provided as [D03_OBSERVABLE_REGISTRY.json](proposals/D03_OBSERVABLE_REGISTRY.json) (26 fields; registry version 2 under task P0-D03-002 — every entry now also declares permitted families, optionality/nullability, validation rules, and normalization behavior). The root JSON Schema and the registry have been checked for a one-to-one leaf-field match; see [v0.0.1 closeout evidence](../evidence/PHASE0_V001_CLOSEOUT.md) and [v0.0.2 verification evidence](../evidence/PHASE0_V002_VERIFICATION.md).

| Observable group | Proposed initial set | D07 class / constraint |
| --- | --- | --- |
| Asset and actor | `host.name`, `host.ip`, `actor.user_name`, `actor.user_id` | Sensitive, bounded, role scoped |
| Network / domains | Source and destination IP/port; protocol; `network.dns_name`; `network.domain` | Operational protocol; other values sensitive; validated IPs/FQDNs |
| URL | `web.url` | Sensitive, reviewed HTTP(S) value without credentials, query, fragment, or unreviewed path; arbitrary URL raw only |
| Process and files | `process.name`, `process.pid`, `file.name`, `.md5`, `.sha1`, `.sha256` | Sensitive; lowercase digest patterns (32/40/64 hex) |
| Software inventory | `software.vendor`, `.name`, `.version`, `.cpe`, `.purl` | **Operational** as public product values (corrected under P0-D03-002); bounded identifiers; do not invent version. Internal/proprietary identifiers escalate to sensitive, and the asset–software association is sensitive at the record layer (D07 §5) |
| Vulnerability assertion | `vulnerability.cve_ids`, `.source_finding_id`, `.cvss_score` | `cve_ids` and `cvss_score` **operational** (public identifiers/scores); `source_finding_id` sensitive (it embodies a protected asset association); 1–32 distinct CVEs, each bounded and patterned; score 0–10 |

The machine-readable registry is normative **only after field-model approval**. The two new family schema resources [D03_SOFTWARE_INVENTORY.schema.json](proposals/D03_SOFTWARE_INVENTORY.schema.json) and [D03_VULNERABILITY.schema.json](proposals/D03_VULNERABILITY.schema.json) are referenced by ID from the root schema. A validator must register the two local schema resources to resolve those references: the schemas are intentionally not network-fetched. The root's `schema_version = 1` remains an **unpublished proposed canonical version**. The `draft-2` schema resource ID denotes a draft iteration, not a production migration.

The owner has **approved adding both families and requiring a bounded CVE array**. The **32-element numeric cap** and the **64-reference observation evidence cap** (§9.3) are **approved under task P0-D03-002**; the remaining exact field constraints are proposals, and **acceptance of the complete field model is still a separate explicit owner decision**. Unit tests, source mapping, field classification, and generated TypeScript/runtime validation are Phase 1/2 implementation work.

## 9. Derived finding identity, observations, and state (corrected under task P0-D03-002)

A finding is a **derived record**, not a normalized event, and never a mutation of one. A normalized source event — including a scanner-reported `vulnerability` event — remains an immutable source observation; findings are computed from events and feeds and stored separately (`src/intel/`). One raw record may support several findings; one finding may cite several raw records.

**Correction (v0.0.2):** the v0.0.1 identity formula hashed `rule_id`, `rule_version`, `subject_id`, and the evidence-set hash into `finding_id`. That made a persistent vulnerability change identity whenever a new scan produced different evidence or a rule was revised — the same defect class D03 §5 already removed from `event_id`. It is **retired** and replaced by the two explicit models below. The v1 vector is preserved in [the identity fixture](proposals/D03_example_finding_identity.json) for migration reference only.

All hashes below are lowercase hex SHA-256. Framing is unambiguous: the literal UTF-8 domain tag (including a trailing NUL, written `\0`), then each input as a 32-bit big-endian byte length followed by its exact UTF-8 bytes. Inputs are validated and canonical **before** hashing; non-canonical input is rejected, never silently rewritten.

Common inputs:

- `scope_id` — the security scope / tenant namespace the finding belongs to (1–128 bytes, token grammar in the finding schema). Identity is always scoped: the same rule and subject in two scopes are two findings.
- `rule_id` — the stable rule identifier (1–128 bytes). A rule whose *meaning* changes is a new rule and takes a new `rule_id` (see migration, §9.5); a compatible revision keeps the `rule_id` and changes only `rule_version`, which is provenance, never identity.
- `subject_id` — the canonical subject (1–512 bytes): colon-separated segments, each a bounded token (`[A-Za-z0-9._@~-]+`). The subject must be specific enough to distinguish the affected asset, software installation, vulnerability, or configuration condition — e.g. `asset:<asset-key>:software:<vendor>/<name>@<version>:cve:<CVE-ID>`. Segment rules: host/asset keys lowercase; CVE segments uppercase `CVE-…`; identifiers as issued by their authority; no display names, no whitespace, no secrets, no free text. Producers build subjects from typed components; a subject that cannot be made canonical is a quarantine case, not a hashing input.

### 9.1 State findings (persistent conditions)

For vulnerabilities, configuration exposures, and other persistent conditions:

```
finding_id = SHA-256( "GammaRay:finding-id:state:v2\0" ‖ LP(scope_id) ‖ LP(rule_id) ‖ LP(subject_id) )
```

Evidence hashes, parser versions, feed revisions, observation timestamps, and rule versions are **not** identity inputs. A state finding therefore keeps one identity across repeated scans, changed evidence, feed updates, and compatible rule revisions, and accumulates history as observations (§9.3).

### 9.2 Occurrence findings (discrete detections)

For point-in-time detections (an alert firing, a brute-force burst, a malware detection):

```
finding_id = SHA-256( "GammaRay:finding-id:occurrence:v2\0" ‖ LP(scope_id) ‖ LP(rule_id) ‖ LP(subject_id) ‖ LP(occurrence_key) )
```

`occurrence_key` (1–512 bytes, no whitespace) is the rule-defined deterministic discriminator of the single occurrence — for example the source event code, event time, and attempt count issued by the detecting source. **`raw_ref` alone is never an occurrence key**: one raw record can support several distinct detections, and one detection can span several raw records. Rules must document how their `occurrence_key` is formed; two genuinely distinct detections must not collide, and re-ingesting the same detection must reproduce the same key.

### 9.3 Observations and the evidence set

An **observation** is one assessment of one finding by one scan or evaluation. Its record (schema: [D03_FINDING_OBSERVATION.schema.json](proposals/D03_FINDING_OBSERVATION.schema.json)) carries: `finding_id`, `observation_id`, `rule_id` + `rule_version`, `parser.id` + `parser.version`, the CTI/vulnerability feed identity and revision where applicable, `observed_at`, the scan discriminator and coverage (§9.4), `result` (`present` / `absent_verified` / `unknown`), optional `confidence`, the `evidence_set_hash`, and the bounded `supporting_raw_refs` list. One finding has many observations; one observation cites 1–64 raw evidence records.

- `evidence_set_hash` keeps the v0.0.1 framing unchanged: deduplicate the `raw_ref` strings, sort by lexicographic UTF-8 byte order, reject empty or over-limit sets, and hash `GammaRay:evidence-set:v1\0` ‖ uint32 count ‖ length-prefixed refs.
- **Cap (approved, task P0-D03-002): at most 64 `supporting_raw_refs` per observation** — per observation, not per finding lifetime. If a scan's evidence for one finding exceeds 64 references, the observation is **not admitted**: it is quarantined with the typed reason `EVIDENCE_SET_TOO_LARGE`, the scan is marked incomplete for that finding, and no reference is silently dropped and no partial set is presented as the evidence set.
- `scan_key` identifies the scan: `scan:<scan-or-report-id>` when the source issues one; otherwise the canonical join of source id, scan time, rule version, parser id/version, and feed revision. `observation_id = SHA-256( "GammaRay:observation-id:v1\0" ‖ LP(finding_id) ‖ LP(scan_key) ‖ LP(evidence_set_hash) )`. Re-ingesting the same scan reproduces the same `observation_id` and is deduplicated on it; a distinct scan — even one producing identical evidence — yields a distinct observation, so history is never erased by replay and never duplicated by re-delivery.
- An `absent_verified` observation cites the scan/coverage evidence records (for example the scan report's own `raw_ref`) as its supporting set; it is the only observation kind that can support resolution (§9.4).
- Observation history is retained in full; retrieval is bounded and paginated. No lifetime cap is imposed on a finding's history.

The finding record itself (schema: [D03_FINDING.schema.json](proposals/D03_FINDING.schema.json)) stores the identity inputs, the model (`state` / `occurrence`), `identity_version: 2`, current status, `first_seen`, `last_seen`, `observation_count`, and the latest observation reference. Findings are **sensitive** records (D07 §3): the identity inputs name protected assets and rules even though the hash itself is opaque.

### 9.4 State transitions and coverage

Finding status is a projection of observation history, never of a single scan's silence:

| Transition | Trigger |
| --- | --- |
| *(new)* → `open` | First `present` observation (`first_seen` is set once and never moves) |
| `open` → `open` | Further `present` observations; `last_seen` advances |
| `open` → `resolved` | An `absent_verified` observation from a scan whose coverage is `complete` **for that subject and scope** and which completed successfully (`resolved_at` set from that observation) |
| `resolved` → `reopened` | A later `present` observation |
| any → `unknown` | Assessment cannot be made (source/feed failure, stale feed beyond the D06 threshold, indeterminate result) |

Rules:

- A finding **absent from an incomplete, partial-coverage, or failed scan does not change status**. Absence is evidence only when the scan provably covered the subject: coverage must record scope, subject set, completion, and the feed revision used. Scans with `partial` or `unknown` coverage may add `present` observations but can never resolve.
- `insufficient coverage` and `unknown or incomplete assessment` are recorded states of the *assessment*, surfaced on the finding's coverage status — they are never silently folded into `resolved`.
- `first_seen` is the earliest `present` observation time and is immutable; `last_seen` is the latest `present` observation time (an `absent_verified` observation does not move it). Time-to-remediation is `resolved_at − first_seen`, reproducible from the stored observation history alone.
- Reprocessing with a newer parser or feed creates new observations under the **same** state `finding_id`; it never re-keys the finding.

### 9.5 Identity contract changes and migration

- `identity_version` is stored on every finding. Version 2 is this section. A future change to the framing, tag, or input set increments it.
- When a rule's meaning changes, mint a new `rule_id`; the new findings **supersede** the old ones (`supersedes` / `superseded_by` on the finding record). History is linked, never re-keyed or deleted.
- Migration from the retired v1 formula: v1 identities are not recomputed into v2 silently. Where a v1 finding and a v2 finding denote the same condition, the v2 record links the v1 identity through the supersession fields and the v1 record remains readable. Dual-identity lookup during a migration window is a query-layer concern, not a reason to keep two identity models in new writes.
- Snapshots and reports retain the identity version and the observation references they actually used (D03 §5 rule 5 applies unchanged).

### 9.6 What `raw_ref` is — and is not

The stable `raw_ref` (D01) proves **which admitted bytes** support a finding. It is the evidence anchor, not the finding key, not an occurrence discriminator by itself, and not an authorization token: every referenced raw record must be authorized to the requesting actor before a finding returns those anchors or their sensitive details (D07 §3–§5). The parser-version-specific `event_id` is advisory provenance only and is never used alone to deduplicate findings.

## Reference standards (informational, not binding to GammaRay)

- JSON Schema Draft 2020-12: https://json-schema.org/draft/2020-12
- JSON Schema `oneOf`: https://json-schema.org/understanding-json-schema/reference/combining
- Elastic ECS categories and type semantics: https://www.elastic.co/docs/reference/ecs/ecs-using-categorization-fields
- OCSF schema model: https://github.com/ocsf/ocsf-schema

An ECS `event.category` and `event.type` may contain several categories/types; this proposed GammaRay contract deliberately uses one primary `event.family` and one `event.type` for internal query stability. An ECS exporter must map multi-category semantics explicitly and cannot claim byte-for-byte alignment.
