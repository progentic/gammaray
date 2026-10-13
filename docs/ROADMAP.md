# GammaRay Roadmap

**Baseline:** `v0.0.0` starter, 2026-10-12  
**Target:** `v1.0.0` production release  
**Status:** Proposed delivery scope; no milestones are complete or approved release commitments.

## Product outcome

GammaRay gives SOC analysts one place to ingest security events, preserve their original evidence, normalize inconsistent formats, measure activity, investigate CTI/CVE matches, and publish consistent analyst and leadership reports. Data quality and provenance must remain visible at every step.

`docs/ARCHITECTURE.md` defines component ownership and data flow. `docs/INVARIANTS.md` defines non-negotiable behavior. This roadmap names **major product outcomes**. [PHASE_PLAN.md](PHASE_PLAN.md) owns implementation order, dependencies, and exit criteria. A planned version tag is a checkpoint, not evidence that the feature exists.

## Delivery milestones to v1.0.0

| Milestone | Proposed checkpoint | Major objective | Product outcome |
| --- | --- | --- | --- |
| P0: Establish the contract | `v0.0.0` | Resolve or explicitly gate architectural choices; establish release scope, security baseline, and measurable acceptance targets | An approved, implementable plan without hidden product decisions |
| P1: Application foundation | `v0.1.0` | Establish storage boundaries, identity and access controls, audit, API, and an initial UI shell | A secure, operable foundation for actual SOC features |
| P2: First complete data path | `v0.2.0` | Ingest CSV; preserve raw records; normalize, quarantine, query, and replay | An auditable source-to-event workflow, proven end to end |
| P3: Initial source coverage | `v0.3.0` | Add Splunk, Cisco syslog, Windows events, and macOS events | All five initial source types ingest reliably with known completeness |
| P4: Analytics and dashboards | `v0.4.0` | Standard and custom metrics, visual exploration, and personalized dashboards | Analysts can investigate normalized data without writing arbitrary code |
| P5: Threat intelligence | `v0.5.0` | CTI indicator and CVE matching with feed provenance and freshness | Analysts can review explainable, traceable findings |
| P6: Reporting | `v0.6.0` | Versioned report snapshots, analyst PDF, and leadership EXSUM | Both reporting views are consistent and expose data gaps |
| P7: Production candidate | `v0.9.0` | Security, reliability, performance, operations, accessibility, and recovery validation | A staging deployment is demonstrably ready for release review |
| P8: Production release | `v1.0.0` | Formal acceptance, controlled deployment, rollback readiness, and release documentation | Supported production system with an identified operational owner |

Checkpoint versions and sequence are **planning proposals**, not automatically authorized releases. Scope changes must update the roadmap and phase plan together.

## What v1.0.0 includes

- **Supported ingestion:** CSV, Splunk, Cisco syslog, Windows event logs, and macOS event logs, using source-appropriate, read-only collection methods and scoped credentials.
- **Evidence integrity:** immutable raw records until authorized retention, idempotent ingest, deterministic versioned normalization, `raw_ref` traceability, quarantine, reprocessing, UTC time provenance, and explicit lag/gap reporting.
- **Analysis:** versioned standard metrics; validated declarative custom metrics; standard and user-configurable dashboards; raw-record drill-down only with its separate permission.
- **Intelligence:** CTI indicator and CVE enrichment on normalized events, with source, match basis, retrieval time, and stale-feed labeling. Findings do not rewrite event data.
- **Reporting:** reproducible snapshots, analyst PDF, and an EXSUM whose figures are tied to the same metrics and visibly qualified for missing data.
- **Security and operations:** approved authentication and authorization, audit records, protected credentials and sensitive fields, secure output rendering, reproducible deployment, retention, monitoring, backup/restore, and documented incident and recovery procedures.
- **Usable interface:** a coherent analyst workflow for ingestion health, investigation, dashboards, intelligence findings, and reporting, including accessibility and actionable error states.

No part of v1.0.0 is considered delivered solely because its documentation, types, mocked tests, or UI screens exist. The relevant behavior must be demonstrated through its boundaries and verified against the invariants.

## Explicit boundaries

GammaRay is an analysis and reporting product, **not** an active response platform. Writing commands or remediations back to Splunk, hosts, or network devices is outside v1.0.0. Arbitrary executable user queries or dashboard code are prohibited. Unspecified connectors, cloud deployment, high availability, and multi-tenancy are **not automatically included**; the v1 deployment model must be approved before implementation. Production log handling must satisfy the approved privacy and retention policy.

## Possible development after v1.0.0

These are candidate directions, not approved requirements, dates, or release guarantees.

| Horizon | Potential major objectives | Conditions for consideration |
| --- | --- | --- |
| `v1.x`: operational depth | More source connectors; better ingestion diagnostics, saved investigations, workflow usability, and richer dashboard/report templates | Customer demand, verified capacity, and manageable support burden |
| `v1.x`: analytical depth | Cross-source correlation, richer detection content, better indicator context, and rule-quality review workflows | Explainability, false-positive controls, and preserved raw/normalized boundaries |
| `v2.x`: platform expansion | Optional multi-tenant isolation, scale-out/HA deployment, public integration APIs, and enterprise identity integration | Separate threat model, data isolation design, operational cost model, and explicit approval |
| Research only | Assisted investigation or narrative drafting | Human review, source attribution, data privacy, prompt-injection controls, and no unsupported metric claims |

## Decisions and roadmap governance

The **seven architecture/product open items** in `docs/INVARIANTS.md` remain undecided: storage engines; retention and legal hold; canonical field set; CSV mapping and timestamp rules; deployment topology/isolation; CTI/CVE feeds and staleness; and sensitive-field handling. None is silently settled by this roadmap. The phase plan identifies when each decision blocks work.

Review milestone scope at every exit gate. An addition that changes product promises, data contracts, security posture, runtime support, or deployment assumptions requires an explicit decision and synchronized updates to `ARCHITECTURE.md`, `INVARIANTS.md`, this roadmap, and the phase plan as applicable. The product owner approves scope and release decisions; a passing CI run does not supply that approval.
