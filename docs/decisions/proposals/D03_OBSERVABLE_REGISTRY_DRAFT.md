# D03 Observable Registry — DRAFT PROPOSAL (not accepted)

**Status:** Proposed draft, prepared 2026-10-12 for owner review. **Not** recorded in
`docs/decisions/D03_CANONICAL_SCHEMA.md`, **not** part of the contract, and the schema in
`proposals/D03_NORMALIZED_EVENT.schema.json` is **unchanged** by this draft.
Repository version remains `v0.0.0`.

**Purpose:** D03 §8 makes field-model acceptance conditional on (1) an observable
registry — one entry per observable giving field, type, limit, and handling class —
and (2) an initial observable set sized to what P5 (CTI/CVE, `src/intel/`) needs,
including a `vulnerability` or software-inventory family. This draft supplies both
for the owner's ruling. Nothing here extends semantics silently: every classification
and limit below is a proposal until the owner accepts it.

**Sources used:** the draft schema's existing observable fields and limits (carried
over unchanged in Part A); D07 §2 handling classes (`operational` / `sensitive` /
`restricted`) and §4's rule that a normalized observable must be reviewed, bounded,
and typed, with unrestricted URLs and free text prohibited; ARCHITECTURE §"CTI and
CVE analysis" (indicator extraction: IPs, domains, hashes, hostnames, software
identifiers); D03 §8's verified gap list.

## Part A — Existing observables, registered (no change proposed)

Limits and patterns are copied from `proposals/D03_NORMALIZED_EVENT.schema.json` as-is.

| Field | Type | Limit | Handling class | Notes |
| --- | --- | --- | --- | --- |
| `host.name` | string | 1–253 chars | `sensitive` | D07: hostnames are sensitive |
| `host.ip` | string | `format: ipv4 \| ipv6` | `sensitive` | |
| `actor.user_name` | string | 1–256 chars | `sensitive` | D07: usernames are sensitive |
| `actor.user_id` | string | 1–128 chars | `sensitive` | |
| `network.source_ip` | string | `format: ipv4 \| ipv6` | `sensitive` | |
| `network.destination_ip` | string | `format: ipv4 \| ipv6` | `sensitive` | |
| `network.source_port` | integer | 0–65535 | `operational` | Routine counter/status class per D07 §2 |
| `network.destination_port` | integer | 0–65535 | `operational` | |
| `network.protocol` | enum | `tcp \| udp \| icmp \| icmpv6 \| sctp \| other` | `operational` | |
| `network.dns_name` | string | 1–253 chars, hostname pattern in draft schema | `sensitive` | D07 lists approved DNS names as sensitive |
| `process.name` | string | 1–128 chars | `sensitive` | Process *command line* stays `restricted`, raw-only (D07 §4) |
| `process.pid` | integer | ≥ 0 | `operational` | Numeric process id; D07 §4 example of an allowable typed observable |
| `file.name` | string | 1–256 chars | `sensitive` | File *path* is not proposed; name only, as in the draft |
| `file.sha256` | string | pattern `^[0-9a-f]{64}$` | `sensitive` | D07: file hashes and IOCs are sensitive |

## Part B — New observables proposed for P5 (CTI/CVE)

Each entry closes a named gap in D03 §8. All are optional, omitted when unavailable
(D03 §2 absence rule), and none carries free text.

| Field | Type | Limit | Handling class | Gap closed / P5 use |
| --- | --- | --- | --- | --- |
| `file.md5` | string | pattern `^[0-9a-f]{32}$` | `sensitive` | §8: many CTI feeds key on MD5; draft had SHA-256 only |
| `file.sha1` | string | pattern `^[0-9a-f]{40}$` | `sensitive` | §8: SHA-1 feed keys |
| `software.name` | string | 1–128 chars | `operational`* | §8: no software name observable existed |
| `software.vendor` | string | 1–128 chars | `operational`* | Disambiguates same-name products for CVE matching |
| `software.version` | string | 1–64 chars | `operational`* | §8: version is what makes a CVE match decidable |
| `software.cpe_uri` | string | 1–512 chars, pattern `^cpe:2\.3:[a-zA-Z0-9_.\-~:]+$` (proposed) | `operational`* | NVD matching keys on CPE 2.3 URIs; bounded, no free text |
| `network.domain` | string | 1–253 chars, same hostname pattern as `network.dns_name` | `sensitive` | §8: `dns_name` alone is not a domain observable set; `domain` is the observed/registered domain distinct from a queried name |
| `vulnerability.cve_id` | string | pattern `^CVE-[0-9]{4}-[0-9]{4,}$` | `sensitive` | §8: no CVE identifier observable existed |
| `vulnerability.cvss_score` | number | 0.0–10.0 | `operational` | Lets P5 rank findings without parsing feed text at query time |
| `vulnerability.cvss_severity` | enum | `none \| low \| medium \| high \| critical` | `operational` | Mirrors the existing `event.severity_band` vocabulary style |

\* **Classification caveat for the owner's ruling:** D07 §2 lists "versions" under
`operational` examples, which is the basis for the `software.*` marks above. But a
per-host software inventory joined to `host.name` identifies a specific machine's
attack surface; under D07 §3's metrics rule (results inherit the highest relevant
class), any host-joined inventory view is `sensitive`. The registry marks the fields
`operational` and the join rule `sensitive` — the owner may prefer the fields
themselves marked `sensitive`. This is a ruling point, not a settled fact.

## Part C — URL observable: one open design choice (owner ruling required)

D03 §8 requires URL observables; D07 §4 prohibits an *uncontrolled* URL in the
normalized contract. Two bounded shapes satisfy both texts; this draft does **not**
pick one silently.

- **Option 1 — decomposed (draft's lean):** a `url` object with `scheme`
  (enum `http \| https`), `host` (domain or IP, 253-char hostname/IP rules),
  `port` (0–65535), and `path` (≤ 512 chars, query string and fragment **excluded**,
  userinfo **prohibited**). Handling class `sensitive`. Pro: no userinfo, no query
  strings (a common credential/token leak channel), every component typed. Con:
  the original URL cannot be reconstructed exactly; it remains available raw-only.
- **Option 2 — single bounded string:** `network.url`, ≤ 2048 chars, pattern
  prohibiting userinfo, handling class `sensitive`. Pro: closer to feed formats.
  Con: query strings can carry tokens/PII into normalized storage — the exact risk
  D07 §4 names — and per-component validation is weaker.

## Part D — New family proposed: `vulnerability`

Closes §8's missing-family gap with one family (the condition requires "a
`vulnerability` **or** software-inventory family"; this draft proposes
`vulnerability`, with `software.*` observables above carrying the inventory data on
any family, so a separate inventory family is not also needed for P5).

| Family | Proposed types | Details (bounded, optional) |
| --- | --- | --- |
| `vulnerability` | `vulnerability.detected`, `vulnerability.scan_result`, `vulnerability.other` | `details.scanner` (bounded string ≤ 128, pattern as `parser.id`); no free-text finding description — descriptions stay raw/feed-side |

Semantics boundary (from D03 §3, preserved): a `vulnerability` event is an
observation *emitted by a source* (scanner, EDR, inventory tool). GammaRay's own
CTI/CVE matches remain derived findings in `src/intel/`, keyed on the stable
`raw_ref` per amended D07 §3 — never source events, and never mutating the
triggering event.

## What acceptance would change (not done by this draft)

1. Registry (Parts A+B, with Part C resolved) recorded into D03 as the §8 condition
   requires.
2. Draft schema revised to match: `file.md5`, `file.sha1`, `software`,
   `vulnerability` objects; the `vulnerability` variant added to the `oneOf`
   discriminated union; a synthetic example event for the new family.
3. D03 field model could then be presented for acceptance; until the owner rules,
   P1 work depending on the field model remains blocked and the schema stays a draft.
