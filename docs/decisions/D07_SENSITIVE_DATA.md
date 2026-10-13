# D07 — Sensitive data handling and raw access policy

**Status:** **Accepted** — product owner directive, 2026-10-12  
**Repository version:** `v0.0.0`, architecture approval only; no security implementation is implied  
**Needed before:** P1; controls must be implemented and tested before real data ingestion  
**Dependent decisions:** D01 raw vault mechanics; D02 retention/holds; D03 field table; D05 deployment/classification overlay

## 1. Adopted policy

GammaRay stores original source content as **restricted evidence**. It creates minimized typed normalized events for working analytics, instead of copying arbitrary log text into the working store. All data access, including raw drill-down, derived results and exported reports, is authorized **at the API and query service boundary before content is returned**. UI masking is defense in depth, never the sole access control.

This decision approves GammaRay's default minimum handling policy, **not** compliance with a regulation or classification system. The owner must identify any real-world regime and its overriding obligations under D05 before permitting live restricted data.

## 2. Three handling classes

| Class | Meaning | Examples |
| --- | --- | --- |
| `operational` | Routine counters, statuses, versions, and aggregates for authorized analysts | Family/type, timestamps, event counts, source completeness, severity band |
| `sensitive` | Specific personal, network, host or investigation identifiers requiring explicit scope and permissions | Usernames, hostnames, IPs, approved DNS names, file hashes, IOCs, per-user findings |
| `restricted` | Full original evidence or fields that can accidentally contain credentials, personally identifiable content or unbounded free text | Entire original record bytes, verbatim `message`, process command line, full untrusted log text, unrestricted query/response bodies |

Raw bytes are **always restricted** as a whole. A log format being a familiar JSON object does not make its free-text fields safe to copy.

## 3. Tier policies

| Tier / surface | Binding control |
| --- | --- |
| **Raw evidence vault** | Store original bytes unchanged under D01/D02 retention; read a specific `raw_ref` only after distinct raw permission; every access audited; no normal bulk export or broad vault listing |
| **Normalized event** | Only approved, schema-validated structured fields from D03; no `message`, `event.original`, `process.command_line`, unrestricted free text or unrestricted source JSON blob; per-field `operational` or `sensitive` classification recorded in the D03 field registry |
| **Parser/worker scratch** | Temporarily restricted while holding a read-only *copy* of raw evidence; isolated process identity and bounded temporary storage; never a new system of record; cleanup on crash/restart |
| **Quarantine** | Only `raw_ref`, a typed failure reason/code and parser version; never embeds failing original text; access and drill-down tied to raw permission |
| **Metrics** | Aggregate results `operational` unless grouped on a sensitive key or risk of identifying individual activity; results inherit highest relevant class, including sparse groups |
| **Findings and CTI/CVE** | `sensitive`; keyed on the stable `raw_ref` — `event_id` is advisory only, because it embeds the parser version and changes on every parser bump (owner ruling, 2026-10-12; see D03 §5); retain structured indicator and feed provenance, never embed copied raw messages |
| **Dashboard/API** | Server checks permissions before returning identifiable fields or resolving a raw reference; UI masks sensitive values without grant and never receives unauthorized restricted bytes |
| **Analyst PDF** | Masked by default; excludes restricted raw content even if the generator has raw-read privileges; sensitive content only under explicit authorized export policy, class marking and audit |
| **Leadership EXSUM** | Aggregates and versioned metric values only; no full identifiers, raw bytes, per-user detail or indicator values; narrative does not manufacture unbound metrics |
| **Audit events** | Actor, action, target opaque ref, time, decision, reason code, outcome and request correlation only; never raw content, credentials, full queries or arbitrary user-entered text; restricted audit read to authorized operators |
| **Backups and replicas** | Inherit source data classification and retention/hold limits; encrypted and access-separated per D05; restores audited |
| **Tests/CI** | Synthetic fixtures exclusively; no live credential, production log, sensitive file, or raw vault link on public CI runners |

## 4. Authorization and role separation

- `analyst`: view authorized operational and permitted sensitive normalized fields; does **not** receive raw bytes.
- `analyst-raw` or explicit `raw.read` privilege: additionally request a **specific** raw record through a broker, subject to source/data scope. Every request, grant, and denial is audited.
- `operator`: operate ingestion/retention/audit according to separate scoped privileges; operational status must not imply analyst raw-read privileges.
- `admin`: administer application definitions and user/role mapping; **not automatically raw.read**. Do not combine administrative control, raw readers, vault writers, and vault retention authority in one routine principal.
- `raw-read broker`: server-side verified permission, approved data scope, version-pinned read and hash verification before passing an authorized bounded stream; the UI cannot grant its own permission through a request field.
- `normalizer`: a service principal with approved internal per-record raw read needed for parsing/replay; no user export rights, no vault write/delete rights.

Every API route and query that might return sensitive, restricted, derived, or exported data must enforce authorization. Masking inside the renderer remains mandatory but is not an authorization boundary. Denied reads and bulk-enumeration attempts are logged without sensitive content.

## 5. Sensitive field minimization and reporting

- D03 schema **must not permit** unrestricted `message`, command line, original event document, raw HTTP body, uncontrolled URL, or free-form `extensions`. Reject unknown fields rather than silently preserving them in normalized storage.
- Allow a *reviewed*, bounded, typed observable such as IP, username, DNS hostname, file SHA-256, event code or numeric process id only after assigning handling class, role scope and a parser validation rule.
- `restricted` source text remains available only by the authorized raw evidence path and cannot be embedded by an enrichment, alert or error message as a workaround.
- Report snapshots may reference raw/event IDs but must not store verbatim raw bytes. PDF/EXSUM exports are separate policy decisions, not automatic consequences of raw-read access.
- Exports are marked with applicable handling class, generated time, data range, data completeness and generating role; audit creation and any privileged sensitive fields. EXSUM aggregates only.
- Unmasking `sensitive` fields requires appropriate authorization and explicit user action where supported; log the event. Never reveal partial credentials.

## 6. Retention, encryption, and residual risks

- **D02 open:** retention period, deletion trigger, legal hold, object lock duration, backup survivability and audit/approval workflow remain pending. An accepted D07 policy does not authorize deletion of held or protected evidence.
- **D05 open:** confirm whether the target network is air-gapped, regulated or classified, and record data locality, controls, admin separation, key management, cryptography requirements, report distribution policy and authorized endpoints. Additional requirements may tighten D07 before data is ingested.
- Protect worker scratch copies through isolation, bounded lifetime and controlled cleanup; a copy of restricted data is itself restricted, even though it is not immutable.
- TLS where supported/required for network channels, encryption at rest for stores and backups, restricted key custody, rotation procedures and separate administrative credentials are minimum controls subject to D05 design.
- No immutable mechanism can establish whether the collector received genuine source bytes in the first place; this requires source authentication, provenance and audit.

## 7. Verification required when implementation begins

Prove API scope and raw-permission negative cases; cross-user/role queries; unauthorized drill-down rejection; server-side masking; no raw text in normalized events, derived records, reports or diagnostics; adversarial HTML/log text escaping in UI/PDF; audit on successful/denied raw reads; temporary scratch isolation/cleanup; encryption and restore handling; secret-scanning controls. Run only synthetic fixtures in CI.

## 8. Approval record

**Accepted by product owner on 2026-10-12:** three handling classes; distinct raw read permission; server-side access checks; raw-only verbatim `message` and other unrestricted free text; typed minimized normalized event fields; masked-by-default exports; EXSUM aggregates only; audit and isolation controls. Any future weakening requires a new explicit owner decision.

**Still open:** D01, D02, D03 and D05 implementation details and the applicable environment classification/legal overlay. GammaRay remains `v0.0.0` and P1 does not begin merely because D07 was accepted.
