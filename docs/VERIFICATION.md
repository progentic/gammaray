# Verification

## Definition of `verify`
`npm run verify` runs `scripts/verify.mjs`, which executes these steps in order:
router, test-policy, secret-scan, lint, typecheck, test:unit, build, test:e2e.
The secret-scan step runs the pinned gitleaks build (docs/CI_PLAN.md) over the
working tree; it fails verification if the scanner is unavailable, is the wrong
version, or finds a credential. CI additionally runs the scanner's positive
control, a full-history scan, and `npm audit --audit-level=high`
(docs/CI_PLAN.md).
- Independent steps keep running after a failure, so one run lists everything wrong.
- `test:e2e` needs `build`. `dist/` is deleted before building and the build does not emit on error, so a stale artifact cannot pass. If `build` fails, `test:e2e` is reported BLOCKED.
- Change the step list in `scripts/verify.mjs` and this doc, never in AGENTS.md.

## Output contract
- Text (default, ASCII): one status line per step (`ok`, `FAIL`, `BLOCKED`), then details for failures on stderr: the failing command, exit status, and native ESLint/tsc/test output unchanged.
- Repo-owned checks (router, test-policy) emit diagnostics with fields `check`, `code`, `where`, `problem`, `fix`. `fix` is never empty.
- `node scripts/verify.mjs --json` prints one JSON object on stdout (`ok`, `summary`, `steps`), including failed and blocked steps. No banners, timings, or raw child output. Use `npm run --silent verify -- --json` through npm.
- Exit codes: 0 all passed, 1 a step failed or was blocked, 2 usage error.

CI (`.github/workflows/verify.yml`) runs the same command on committed content and is the authority. The pre-commit hook is local feedback: it checks the staged router, then runs `verify` on the working tree.

## Required status checks
CI only gates merges once branch protection requires it. In GitHub, require the `verify` check on `main`. See `docs/CI_PLAN.md` for the runner contract and the manual settings.

## Checks
- [ ] `npm run verify` green
- [ ] no skipped, focused, or todo tests
- [ ] invariants of touched code still hold
- [ ] complexity review done (see docs/WORKFLOW.md)
- [ ] no new TODOs without issue link
- [ ] docs updated if contract changed
- [ ] commands run, results, and blocked checks recorded in the PR/commit notes

Fail any = not done.

## Recover from failures

Start with the first failed step named in the summary. Read its problem and fix hint. External failures include native output in text mode; rerun the named command to inspect it when using JSON. A blocked E2E step is not a test failure: correct build first. Exceptions inside steps are reported as `STEP_EXCEPTION`; restore missing files or resolve the displayed filesystem error.

Install dependencies before running verification. Startup or module-loading errors occur before the step exception handler and may prevent a structured report.

`npm test` runs example unit tests, builds, and runs E2E. It does not run lint, router validation, or the static focused-test check. Use `npm run verify` for the completion gate.
