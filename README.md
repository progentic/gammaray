# GammaRay

SOC Dashboard. GammaRay ingests log data from SIEM tools, syslog, host event logs, and CSV files; retains every record as immutable raw data; normalizes it into a common schema; and computes custom and standardized metrics over the normalized data. Analysts view and customize visualizations, export PDF reports for other analysts, and produce an executive summary (EXSUM) for leadership. The same normalized data feeds CTI and CVE analysis.

Initial sources: Splunk, Cisco syslog, Windows event logs, macOS event logs, CSV. Additional log types are added by writing a connector and a normalizer; no downstream component changes.

Delivery goals: `docs/ROADMAP.md`. Implementation and acceptance sequence: `docs/PHASE_PLAN.md`. Full design: `docs/ARCHITECTURE.md`. Binding constraints: `docs/INVARIANTS.md` — including its Accepted open items (storage engines, raw retention period, canonical schema field set, CSV mapping, deployment model, CTI/CVE feeds, PII handling), which are not yet decided.

## Status

Blank start, 2026-10-12, from the blank-repo starter (final revision, TypeScript / Node). Governing documents are `docs/ARCHITECTURE.md` and `docs/INVARIANTS.md` as supplied for GammaRay. No GammaRay application code exists yet: the starter placeholder (`src/greet.ts`, `src/cli.ts`, `tests/e2e/cli.test.ts`) is still in place and is deleted when the first real code lands. Nothing is committed; no remote is configured.

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
