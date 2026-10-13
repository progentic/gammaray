# AGENTS.md — Router

> GammaRay router. Router is byte-capped (2KB). Details -> /docs/*

**Project:** GammaRay | **Stack:** TS/Node | **Package:** npm

## Routing
| Concern | Owner File | When to read |
|---------|------------|--------------|
| Tooling & Env | `docs/TOOLS.md` | install, env, deps |
| Style | `docs/CODING_STYLE.md` | naming, comments, errors |
| Testing | `docs/TESTING.md` | writing/running tests |
| Verification | `docs/VERIFICATION.md` | before finish/PR |
| Architecture | `docs/ARCHITECTURE.md` | ownership, flow |
| Invariants | `docs/INVARIANTS.md` | every change |
| Roadmap | `docs/ROADMAP.md` | scope, release goals |
| Phase Plan | `docs/PHASE_PLAN.md` | sequencing, exit gates |
| CI | `docs/CI_PLAN.md` | runner, gates, required checks |
| Decisions | `docs/PHASE0_DECISION_REGISTER.md` | P0 decision status |
| Execution | `docs/WORKFLOW.md` | every task; multi-agent |

Do NOT add tooling/testing details here. Link only.

## Commands
| Intent | Command |
|--------|---------|
| install | `npm ci` |
| lint | `npm run lint` |
| types | `npm run typecheck` |
| test | `npm run test` |
| build | `npm run build` |
| verify | `npm run verify` |

## Core Rules
- Read the authoritative code before changing it; trace affected flows
- Make the smallest coherent change at the correct boundary
- Preserve invariants; never patch symptoms locally
- Ask before destructive actions; no drive-by refactors
- No secrets in code. Use `.env.example`

## Done Gate
Not done until `npm run verify` passes and
`docs/VERIFICATION.md` is met. Follow `docs/WORKFLOW.md`.
