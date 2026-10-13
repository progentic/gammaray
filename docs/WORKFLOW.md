# Workflow

## Loop
1. Understand: read docs/ARCHITECTURE.md and docs/INVARIANTS.md, then the authoritative code (the owner of the behavior, not a copy of it); trace callers, callees, and data flow the change touches
2. Plan: restate the task, name the boundary that owns the change, list files to touch, note the check that proves it
3. Implement: the smallest coherent change at that boundary
4. Review complexity: separately from correctness, ask whether the change added state, branches, abstractions, or duplication that a simpler design at the right boundary would avoid; simplify before finishing
5. Verify: `npm run verify`; fix and repeat until green

## Ownership
- Every behavior has one owning module. Change it there, not at a call site that happens to be convenient
- If two places must change together, check whether they share one rule and one reason to change; if so, give that rule a single owner. Coordinated edits alone do not justify a new abstraction
- Do not edit generated, vendored, or lockfile content by hand

## Invariants
- Before editing, list the invariants the touched code upholds (types, ordering, error contracts, data shape, security properties)
- A change that makes a local test pass by weakening an invariant is wrong; fix the cause
- If an invariant is undocumented, record it in a comment or doc where the owner lives

## Decide vs escalate
- Proceed: reversible, in-scope work, including fixing a defect inside an already approved requirement (security defects included)
- Escalate: unresolved policy or product choices, incompatible contract/schema changes, scope expansion, destructive actions, and new dependencies not covered by the task

## Delegation (multi-agent)
- Split only along independent ownership boundaries
- Each subtask states: goal, files owned, invariants to keep, check that proves done
- One agent owns integration and runs the final `npm run verify`
- Subagents never edit AGENTS.md or docs/ without the owner's approval

## Choose the implementation

First confirm a change is needed. Prefer existing behavior with matching semantics, then the standard library or native platform, then an existing approved dependency. Write direct code when those options do not satisfy the requirement. Do not force reuse across different policies.

Additional state, abstractions, dependencies, or configuration need a concrete requirement, invariant, failure mode, or owning boundary. Avoid unrelated cleanup and future-proofing. A smaller diff is useful only when it fixes the cause at the correct boundary.

## Required protections

Minimalism never permits removing authentication, authorization, trust-boundary validation, CSRF protection, integrity constraints, transactional guarantees, required concurrency controls, audit records, accessibility, or operational safeguards when the application requires them. External output must be validated at its receiving boundary. Keep secrets and sensitive internal errors out of user-facing output. Do not suppress a failure that leaves an operation incomplete or state uncertain.

## Finish honestly

Report the changed files, relevant checks, and unresolved limits. If requirements conflict or a required check cannot run, identify the blocker; do not invent policy or claim completion. Code establishes current behavior, while requirements and governed documents establish intended behavior. Resolve discrepancies explicitly.
