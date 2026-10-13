# Packaged revision evidence

## GammaRay revision addendum (2026-10-12)

This file is the blank-repo starter's packaged-revision evidence (below, dated 2026-10-09). For GammaRay it is retained with this addendum; it has not been rewritten.

What changed for GammaRay, relative to the packaged starter revision:

- `docs/ARCHITECTURE.md` and `docs/INVARIANTS.md` were replaced with the GammaRay-supplied documents (sha256 `8cacfaefa498c5674b548e7da949402eeaf8bb4985ee5edb50d2d78020a7317c` and `b5a5d80b992ae9cf290fba41317567bcb1a0bd18825ae363e09faa93a07fede4`). No code, script, or test file changed.
- Identity only: `AGENTS.md` (project name; still 1,339 bytes), `package.json` / `package-lock.json` (name `gammaray`), `README.md` (GammaRay brief).
- The Node 20 / Node 22 evidence below and in `docs/evidence/` is the starter's, for the code as packaged; the code is byte-identical in GammaRay, so it still describes the configured checks. GammaRay's own fresh run on the build VM (Node v24.20.0, npm 10.9.4): `npm ci` clean, `npm run verify` 7 passed, 0 failed, 0 blocked (router 1339/2048) on 2026-10-12. That is a Node 24 run, not a re-run of the Node 20/22 evidence.

## Starter packaged revision (2026-10-09)

Completed 2026-10-09 UTC (2026-10-08 America/Chicago).

## Executed checks

| Environment | Result |
| --- | --- |
| Node 20.9.0 with npm 10.8.2 | Full verification: 7 passed, 0 failed, 0 blocked |
| Node 22.22.2 with npm 10.8.2 | Full verification: 7 passed, 0 failed, 0 blocked |
| Locked dependency installation | `npm ci` completed |
| Staged router check | Passed; AGENTS.md is 1,339 bytes |
| Documentation local links | Checked against packaged files |

Both full runs included router validation, static test policy, lint, typechecking, the two example unit tests, a clean build, and the compiled CLI test. No new test files were added. Structured results are in [Node 20 evidence](evidence/verify-node20.json) and [Node 22 evidence](evidence/verify-node22.json).

## Source review

Reviewed the accepted step exception handling, build dependency, nonempty diagnostic fields, staged router path, and documented focused-alias limitation. Documentation now records owners, enforced constraints, review obligations, setup, and failure recovery. This package retains the accepted implementation.

## Limits

Successful runs are evidence for the configured checks, not proof of every architectural or security property. Destination GitHub branch protection is not configured by this ZIP. Reassigned focused-test aliases remain a documented static-analysis gap. A filesystem failure during build cleanup was not simulated for this packaged revision; its exception-handling and dependency path were reviewed in source. Startup module-load failures precede the step exception boundary.

The greeting source and its three tests are replaceable examples. Do not treat their success as evidence for future application behavior.
