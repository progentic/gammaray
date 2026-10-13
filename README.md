# GammaRay

SOC Dashboard. GammaRay ingests log data from SIEM tools, syslog, host event logs, and CSV files; retains every record as immutable raw data; normalizes it into a common schema; and computes custom and standardized metrics over the normalized data. Analysts view and customize visualizations, export PDF reports for other analysts, and produce an executive summary (EXSUM) for leadership. The same normalized data feeds CTI and CVE analysis.

Initial sources: Splunk, Cisco syslog, Windows event logs, macOS event logs, CSV. Additional log types are added by writing a connector and a normalizer; no downstream component changes.

Delivery goals: `docs/ROADMAP.md`. Implementation and acceptance sequence: `docs/PHASE_PLAN.md`. Full design: `docs/ARCHITECTURE.md`. Binding constraints: `docs/INVARIANTS.md` — including its Accepted open items (storage engines, raw retention period, canonical schema field set, CSV mapping, deployment model, CTI/CVE feeds, PII handling), whose current decision statuses and remaining owner gates are recorded in `docs/PHASE0_DECISION_REGISTER.md`.

## Status

`v0.0.2` Phase 0 D03 contract-correction patch (task P0-D03-002, 2026-10-13) on the v0.0.1 closeout, based on the TypeScript / Node starter. Governing documents are `docs/ARCHITECTURE.md` and `docs/INVARIANTS.md` as supplied for GammaRay. No GammaRay application code exists yet: the starter placeholder (`src/greet.ts`, `src/cli.ts`, `tests/e2e/cli.test.ts`) is still in place and is deleted when the first real code lands. No commit or remote is included in this delivered archive. Architectural direction: PostgreSQL for relational records, independently administered B3 raw vault as target, A2 topology; P1 deployment facts, retention and D03 field-model approval remain outstanding.

## Development

```sh
npm ci
npm run verify
```

Agent-ready layout: a byte-capped `AGENTS.md` router links to one doc per concern.

| File | Owns |
|------|------|
| `AGENTS.md` | Router + commands (<2KB, enforced) |
| `docs/ARCHITECTURE.md` | Data flow, tiers, owners, normalization, metrics, reporting, CTI/CVE |
| `docs/INVARIANTS.md` | Binding constraints, enforcement, accepted open items |
| `docs/ROADMAP.md` | Major product objectives through v1.0.0 and future candidates |
| `docs/PHASE_PLAN.md` | Execution phases, dependencies, decision gates, and release acceptance |
| `docs/TOOLS.md` | Install, env, deps |
| `docs/CODING_STYLE.md` | Naming, comments, errors |
| `docs/TESTING.md` | Test layout and rules |
| `docs/VERIFICATION.md` | Definition of done |
| `docs/WORKFLOW.md` | Loop, escalation, delegation |
| `docs/ACCEPTANCE.md` | Packaged-revision evidence, with GammaRay addendum |
| `CLAUDE.md` | `@AGENTS.md` (Claude Code) |
| `.cursor/rules/agents.mdc` | Always-on pointer (Cursor) |

Codex reads `AGENTS.md` natively. `scripts/check-router.mjs` fails `verify` if the router exceeds 2048 bytes, lacks a required section, or links a missing doc. `scripts/check-tests.mjs` and `scripts/run-tests.mjs` reject skipped, focused, and todo tests within the bounds documented in `docs/TESTING.md`. CI is the authority; require the `verify` checks in GitHub branch protection.
