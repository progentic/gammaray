# CI Plan — GitHub Actions verification

**Status:** Implemented locally; **not yet live**. The destination repository
has no GitHub remote configured in this workspace, so no GitHub-hosted run
has occurred and no branch protection exists yet. This document is the plan
and the manual setup record; a YAML file is not proof of enforcement.

## Purpose

One required check — the `verify` job in `.github/workflows/verify.yml` —
runs the repository's own verification pipeline plus the CI-only gates
(secret-scanner control, history scan, dependency audit) on every push to
`main` and every pull request. CI runs the same `npm run verify` command as
local development; it adds environment guarantees (clean runner, pinned
tools) and the gates that need a network or full history.

The CI runner is a **build environment only**. Production deployment is a
separate decision (D05); nothing in this workflow deploys, and no production
data, production credentials, or real log content may enter CI — fixtures
are synthetic (`docs/INVARIANTS.md`).

## Threat model

| Threat | Mitigation in the workflow |
| --- | --- |
| Malicious or careless PR code executes with write access | `permissions: contents: read` for the whole workflow; checkout with `persist-credentials: false`; no `pull_request_target`; no repository secrets are defined or referenced |
| A credential is committed (now, or deleted later) | Working-tree secret scan inside `npm run verify`; full-history secret scan as a separate step; positive control proves the scanner fires |
| A compromised or retagged third-party action | `actions/checkout` and `actions/setup-node` are pinned to full commit SHAs verified against the upstream tags (checkout v7.0.1 `3d3c42e5…`, setup-node v7.1.0 `949feb24…`); the gitleaks tarball is verified against a pinned SHA-256 before use |
| Dependency confusion / silent dependency change | `npm ci` installs exactly the committed lockfile; npm caching is disabled (`package-manager-cache: false`) until its benefit is established; `npm audit --audit-level=high` fails on high/critical findings |
| Wrong runtime silently used | Node is installed explicitly (`node-version: "24"`) and asserted in a dedicated step; the job fails on any other major |
| A failing check is reported as success | Every gate is a plain step: a non-zero exit fails the job. There are no `continue-on-error` steps, no skipped security steps, and no artifact uploads that could carry log content or secrets |
| Resource abuse / runaway jobs | `timeout-minutes: 20`; concurrency cancels superseded runs on the same ref |

Out of scope for CI: production deployment, branch protection itself (a
repository setting — see below), and self-hosted runners. If a future phase
requires self-hosted or network-isolated CI, it needs its own approved
runner threat model first.

The `--self-test` additionally rejects malformed or non-array reports even with scanner exit 0 and tests the difference between an absent JSON report and an existing but unreadable report. These are reviewable negative controls in `scripts/check-secrets.mjs` (v0.0.1, retained unchanged in v0.0.2).

## Checks, in order

1. **Checkout** (pinned SHA, no persisted credentials, full history).
2. **Node 24 setup** (pinned SHA, caching off).
3. **Runtime assertion** — prints `node --version` / `npm --version`, exits
   non-zero unless the major is 24.
4. **Pinned scanner install** — gitleaks **8.30.1** (linux x64), SHA-256
   `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`
   verified before extraction.
5. **`npm ci --no-fund`** — reproducible install from the committed lockfile.
6. **`npm run verify`** — the repository pipeline: router, test-policy,
   **secret-scan** (working tree, same pinned gitleaks, enforced version),
   lint, typecheck, unit tests, build, e2e tests. Described in
   `docs/VERIFICATION.md`.
7. **Scanner positive control** — `node scripts/check-secrets.mjs
   --self-test`: a synthetic dummy credential in a temp directory must be
   flagged, and clean content must pass. If the scanner ever stops firing,
   this step fails the job even if step 6 is green.
8. **History secret scan** — `gitleaks git` over all commits; catches a
   credential that was committed and later deleted, which tree scanning
   cannot see.
9. **Dependency audit** — `npm audit --audit-level=high`.

### Severity and exception policy

- **Secrets:** any scanner finding fails. A proven false positive is
  recorded by its exact gitleaks fingerprint in `.gitleaksignore` with the
  reason in the change description — never by excluding a path, a rule, or
  a file class. `.gitleaks.toml` allowlists only the generated directories
  `node_modules/` and `dist/`.
- **Dependencies:** high and critical audit findings fail the job. Moderate
  and low findings do not block, but are triaged at dependency-update time
  and recorded if accepted. A finding that cannot be fixed because the
  pinned scanner/registry is unreachable makes the step fail (blocked is
  not passed); it is never replaced by a skip.
- **Known scanner limitation (verified locally, 2026-10-12):** the gitleaks
  default rules do not flag a lone AWS access key ID without its secret in
  plain text, and they allowlist AWS's published documentation example
  keys. The working controls use a same-format synthetic pair. Treat the
  gate as strong against committed secrets, not as proof that no identifier
  of any kind is present.
- **Abnormal scanner results fail closed (fixed 2026-10-12):** a findings
  exit (1) with a missing, malformed, non-array, or empty JSON report — or
  a clean exit (0) whose report lists findings — fails the gate with
  `SCANNER_REPORT_INVALID`; it is never read as a clean scan. The
  `check-secrets.mjs --self-test` step above includes negative controls
  for these shapes.

## Failure behavior

Any step's failure fails the job and therefore the `verify` check. Partial
success is not reported as success. Inside `npm run verify`, independent
steps continue after a failure so one run lists everything wrong; blocked
steps count as not passed (`docs/VERIFICATION.md`).

## Manual GitHub settings (required before this gates anything)

These are repository settings; they cannot be established from this
workspace and are **not yet done**:

1. Push the repository to GitHub and confirm the `verify` workflow runs on
   a pull request and on a push to `main`.
2. In **Settings → Branches** (or a ruleset on `main`): require a pull
   request before merging, and require the status check **`verify`** —
   the job name from `.github/workflows/verify.yml` — to pass before
   merging. Require branches to be up to date if the owner wants strict
   ordering.
3. Confirm enforcement with a deliberate failing change on a test branch:
   the merge must be blocked while `verify` is red.
4. Record the confirmation (date, screenshot or run URL) in the phase
   evidence. Until steps 1–3 are done, local `npm run verify` is the only
   operative gate and must be described that way.

## Runner record

- Planned runner: GitHub-hosted `ubuntu-24.04`, x64, Node 24 installed by
  the pinned setup-node action.
- Locally validated 2026-10-12: workflow YAML passes `actionlint` 1.7.12
  with no findings; all steps except the GitHub-hosted execution itself
  were exercised locally on Node v24.20.0 (see
  `docs/evidence/PHASE0_VERIFICATION.md`).
- Not yet done: an actual GitHub-hosted run. No claim is made that CI is
  passing or that required checks are enforced.
