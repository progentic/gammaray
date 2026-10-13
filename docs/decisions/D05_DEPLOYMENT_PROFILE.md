# D05 — Deployment profile worksheet (owner input required)

**Status:** Owner worksheet annex; not infrastructure configuration. DP-03 selected by the owner ruling of 2026-10-12 (A2 target); the remaining items are unfilled. Per that ruling, only DP-01, DP-02, DP-03, DP-07, DP-09 and DP-12 gate derivation of the P1 interfaces; capacity, HA, backup-sequencing and CI-promotion items are deferred to P3 or P7.  
**Version:** GammaRay `v0.0.0`, Phase 0  
**Decision:** [D05_DEPLOYMENT.md](D05_DEPLOYMENT.md)

Keep `TBD` until the owner supplies evidence. Do not interpret this worksheet as permission to connect to real networks or ingest real logs.

| ID | Item to resolve | Selected value | Evidence / approving authority |
| --- | --- | --- | --- |
| DP-01 | Intended environment (development/lab/production, network enclave, offline/cloud restrictions) | TBD | TBD |
| DP-02 | Classification or sensitivity regime, legal/compliance obligations, data residency | TBD | TBD |
| DP-03 | Application topology: A1, A2, B, or C | **A2** (target architecture; B1 permitted for development/lab only; production claims require B3 or B4 evidence at P7) | Owner ruling, 2026-10-12; D05_DEPLOYMENT.md §6 |
| DP-04 | OS and supported architecture; virtualization/container runtime/hardening baseline | TBD | TBD |
| DP-05 | CPU/RAM/volume classes; source EPS, burst, maximum record size | TBD | TBD |
| DP-06 | Inbound event collection mechanisms and network boundaries per source | TBD | TBD |
| DP-07 | API/UI ingress, analyst authentication, federation and MFA policy | TBD | TBD |
| DP-08 | Source, collector, API, processor, vault, admin, audit trust zones | TBD | TBD |
| DP-09 | Restricted raw vault implementation, location and independent administrator | TBD | TBD |
| DP-10 | Immutable retention mode, retention duration, legal hold and test evidence (D02) | TBD | TBD |
| DP-11 | Storage/encryption key custody, rotation, certificate authority | TBD | TBD |
| DP-12 | Temp working directory or container scratch: tmpfs/volume, quota, mount options, cleanup | TBD | TBD |
| DP-13 | Database storage, indexes, backups and schema migration owner | TBD | TBD |
| DP-14 | Protected raw + index backup/restore sequencing and separate recovery credentials | TBD | TBD |
| DP-15 | Outage buffering, data completeness signaling, RPO/RTO ownership | TBD | TBD |
| DP-16 | Monitoring, clock synchronization, audit forwarding, integrity alarms | TBD | TBD |
| DP-17 | CTI/CVE egress approval, proxies, update delivery into disconnected zones | TBD | TBD |
| DP-18 | CI artifact promotion, provenance, deployment and rollback owner | TBD | TBD |
| DP-19 | Administrative break-glass and separation of duties | TBD | TBD |
| DP-20 | Deployment threat model and risk signoff | TBD | TBD |

## Network flow register

| From | To | Direction | Protocol/port | Identity / TLS | Data class | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Ingest collector | Splunk search API | Outbound pull (read-only) | TBD | Source-scoped reader, TLS | restricted | TBD |
| Cisco syslog source | Ingest collector | Inbound push if D09 approves | TBD | Approved sender/transport | restricted | TBD |
| Windows/macOS collectors | Ingest collector | D09: push/pull not yet selected | TBD | TBD | restricted | TBD |
| Ingest collector | Raw vault | Write only | TBD | Ingest principal | restricted | TBD |
| Ingest collector | Relational index | Append receipt | TBD | Ingest DB principal | sensitive | TBD |
| Raw-read broker | Raw vault | Read by immutable object version | TBD | Read-only principal | restricted | TBD |
| Normalizer | Raw-read broker | Scoped request | TBD | Worker principal | restricted | TBD |
| Analyst workstation | API/UI | Client-initiated HTTPS | TBD | Interactive identity/MFA policy | operational/sensitive | TBD |
| Retention service | Vault | Eligible-expired version delete | TBD | Separate retention principal | restricted | TBD |
| API / workers | Relational database | Internal application query/write by role | TBD | DB role / TLS | sensitive | TBD |
| Vault | Separate protected backup repository | Approved replication | TBD | Separate backup principal | restricted | TBD |
| API / workers | Identity provider / approved DNS and time services | Required authenticated services | TBD | TBD | operational/sensitive | TBD |
| CTI/CVE collector | Approved feed endpoint or enclave proxy | Approved outbound only | TBD | TBD | sensitive | TBD |
| CI | Production infrastructure | **None** | N/A | N/A | N/A | Required prohibition |

## Acceptance rule

D05 can be accepted only with an identified topology and a sufficiently complete profile to derive Phase 1 interfaces and threat boundaries. Numeric workload and service targets may be refined under D10, but missing hosting, custody, classification, identity, or flow assumptions cannot be silently defaulted.

**Owner amendment (2026-10-12):** D05 was accepted with A2 as the identified topology. For P1, the gating subset of this worksheet is DP-01, DP-02, DP-03, DP-07, DP-09 and DP-12 only. The remaining items must still be completed at their deferred gates (P3 or P7); deferral is not a waiver and does not permit silent defaults at those gates.
