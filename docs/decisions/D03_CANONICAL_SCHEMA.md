# D03 — Explicit normalized event contract and event families

**Status:** **Accepted with changes (approach only)** — product owner, 2026-10-12. The approach in §1 is accepted; the field model (§2–§4 and the draft schema) is **not** accepted until the observable-registry condition in §8 is met.  
**Repository version:** `v0.0.0` (contract-only design; no normalizer implemented)  
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

**Provisional recommendation:** choose semantic Option A and **JSON Schema Draft 2020-12 as source of truth**, generating TypeScript types and runtime validators from that same versioned contract. **Owner ruling (2026-10-12): this approach is accepted** — native semantics (A), JSON Schema 2020-12 with generated TypeScript, one family and one type per event, and the §5 timestamp rules. Acceptance of the approach is not acceptance of the drafted field model; see §8. Preserve raw bytes separately, and store/query normalized JSON/relational projections only after validation. JSON is a serialization format, JSON Schema validates it, and generated TS gives developers type support. The proposal lives in [proposals/D03_NORMALIZED_EVENT.schema.json](proposals/D03_NORMALIZED_EVENT.schema.json); it is *not yet a production schema*.

## 2. Explicit canonical event shape

A normalized event is a **versioned, typed JSON object**, not an arbitrary map. Use nested objects for `host.name` / `source.ip` semantics, rather than literal field keys containing periods. Dot notation in this ADR denotes a nested path.

| Area | Field | Type | Required | Classification / meaning |
| --- | --- | --- | --- | --- |
| Identity | `schema_version` | positive integer | Yes | Operational; revision of canonical contract, separate from app `v0.0.0` |
| Identity | `event_id` | 64-character lowercase SHA-256 hex | Yes | Opaque event version identity; deterministic with same raw/parser inputs |
| Identity | `raw_ref` | opaque string | Yes | Restricted pointer (access needs separate raw permission) |
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
| Observables | `host`, `actor`, `network`, `process`, `file` | validated typed objects | Optional | Structured fields only; individually classified at least sensitive when identifying people/devices |
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

Choose one primary family per normalized event for a stable discriminated union. Secondary tags or ECS multi-category export can be added at the **export boundary** with its own versioned mapping. An event with a recognizable structure but no defensible activity classification may use `unclassified`; a malformed or unverifiable record must be quarantined. Never invent a category just to improve charts.

**Do not conflate:** `security_detection` is an event emitted by a source security product; GammaRay's CTI/CVE matches are separate **derived findings** in `src/intel/`. A CVE match is not a source event and must not mutate the event that triggered it.

## 4. Narrow family-dependent payloads

The draft machine-readable schema binds `event.family` to its allowed types and corresponding `details` object using `oneOf` discriminated variants. Examples:

- `authentication` may add numeric `logon_type` and bounded `auth_method`, but not a free-text logon message.
- `network` may add nonnegative traffic counters and bounded DNS record **type**, not an unbounded query string. IP observables remain separately classified `sensitive`.
- `security_detection` may include a bounded `signature_id`. Original alert text remains restricted raw.
- `unclassified` must not create guessed observables, action, or family details.

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
5. `event_id` is deterministic per `raw_ref`, parser id/version and output ordinal if fan-out is later approved. **Owner note (2026-10-12): because `event_id` embeds the parser version, every parser bump changes every `event_id` derived under it. Anything that must survive reprocessing — findings, report snapshots — therefore keys on the stable `raw_ref`; `event_id` is an advisory, per-parser-version value. D07 §3 is amended to match.** Specify the **exact byte framing** to avoid ambiguous concatenation: SHA-256 over the UTF-8 domain tag `GammaRay:event-id:v1\0` followed by each of `raw_ref`, parser id, parser version encoded as a 32-bit big-endian byte length plus UTF-8 bytes. The existing parser contract produces at most one normalized event per raw record. No fan-out change is authorized here. The example IDs use this illustrative framing; this formula is not binding until D03 is approved.
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

Runnable *contract examples*, not app implementation: [authentication JSON](proposals/D03_example_auth.json) and [network JSON](proposals/D03_example_network.json).

## 7. Validation and acceptance gates

Before accepting the contract: decide (a) semantic native/OCSF/ECS alignment; (b) normative JSON Schema versus TypeScript-only or Avro; (c) primary families/type table; (d) one event per raw assumption; and (e) treatment of sensitive observables permitted in normalized storage. D07 already rules out unrestricted raw text.

Before P2 exit, prove: valid and invalid JSON Schema fixtures per family; rejected unknown keys; rejected arbitrary messages; deterministic replay with fixed parser version; a Splunk transport/producer distinction; missing versus malformed timestamps; idempotent event identity; source parser negative controls; quarantine without dropping raw.

**Outcome (superseded in part, 2026-10-12):** the §1 approach is Accepted; the field model remains a draft for review until §8's condition is met. Repository remains `v0.0.0`; no application code, interfaces, or database schemas are being implemented in Phase 0.

## 8. Acceptance condition — observable registry (owner, 2026-10-12)

The approach is accepted; **the drafted field model is not**, because the drafted observables cannot support the CTI/CVE feature in `docs/ARCHITECTURE.md` (`src/intel/` extracts "software identifiers" and matches CVE data). Verified against the draft schema, its observables are only: IPs and ports, `dns_name`, `user_name`/`user_id`, `process.name`/`pid`, and `file.sha256`. Missing, and normally required for CVE analysis from event logs:

- software name and version (software-inventory observables);
- CVE identifiers;
- URL and domain observables (`dns_name` alone is not a domain/URL observable set);
- MD5 and SHA-1 file hashes — the draft is SHA-256 only, while many CTI feeds key on MD5 or SHA-1;
- a `vulnerability` or software-inventory event family — the §3 family table has none.

D07 permits reviewed, bounded, typed observables, so this is fixable inside the accepted policy. **Acceptance condition for the field model:** add an **observable registry** — one entry per observable giving field, type, limit, and handling class — and an **initial observable set sized to what P5 (CTI/CVE) needs**, including a `vulnerability` or software-inventory family. Until that registry and initial set are recorded here and the draft schema is revised to match, the field model stays unaccepted and the schema in `proposals/` remains a draft, not a contract.

## Reference standards (informational, not binding to GammaRay)

- JSON Schema Draft 2020-12: https://json-schema.org/draft/2020-12
- JSON Schema `oneOf`: https://json-schema.org/understanding-json-schema/reference/combining
- Elastic ECS categories and type semantics: https://www.elastic.co/docs/reference/ecs/ecs-using-categorization-fields
- OCSF schema model: https://github.com/ocsf/ocsf-schema

An ECS `event.category` and `event.type` may contain several categories/types; this proposed GammaRay contract deliberately uses one primary `event.family` and one `event.type` for internal query stability. An ECS exporter must map multi-category semantics explicitly and cannot claim byte-for-byte alignment.
