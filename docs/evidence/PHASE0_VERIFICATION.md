# Phase 0 Verification Evidence

**Date:** 2026-10-12
**Environment:** Node **v24.20.0**, npm **10.9.4** (real Node 24 environment,
system Node on this machine), gitleaks **8.30.1**, actionlint **1.7.12**
**Repository state:** `v0.0.0`, no commits, no GitHub remote configured.
Nothing in this record claims a GitHub-hosted run or enforced branch
protection; both are outstanding (see Blockers).

## Baseline reconciliation (before any Phase 0 change)

The owner supplied a rev 3 starter package
(`GammaRay_starter_package_2026-10-12.zip`, sha256
`80d49fc54de2d2e94a48ba0e0b53588e01aba3643d42d2cde88364520c5b62ac`).
Its `SHA256SUMS` verified **35/35 OK**. Diffed against the repo, rev 3
changed exactly four files, which were copied in before work began:
`AGENTS.md` (+2 routing rows), `README.md` (+ roadmap/phase-plan references),
`docs/PHASE_PLAN.md` (new), `docs/ROADMAP.md` (new). `SHA256SUMS` remains
package-only by the established convention. The Phase 0 task prompt zip
sha256: `dc0c22ca71e387a31326062c8e94fe44f420a77f27e92bd80ec62e10d772e5a9`.

## Workstream B — Node 24 alignment

| Check | Command / method | Result |
| --- | --- | --- |
| Runtime present | `node --version; npm --version` | v24.20.0 / 10.9.4 |
| Engines | `package.json` edit | `engines.node` = `>=24 <25` |
| Version hint | `.nvmrc` created | contains `24` |
| Type definitions | `npm install --save-dev @types/node@24` (manifest + lockfile together, per TOOLS.md) | `@types/node` 22.20.5 → **24.19.2** |
| Lockfile delta scope | parsed diff of `package-lock.json` vs the rev 3 baseline | Only `@types/node` 22.20.5→24.19.2 and its dependency `undici-types` 6.21.0→7.24.6 changed. No unrelated upgrades. Product version stays `0.0.0` |
| Clean install | `rm -rf node_modules && npm ci --no-fund` | 114 packages, clean |
| Pipeline (pre-CI changes) | `npm run verify` | 7/7 passed |
| Pipeline (final state) | `npm run verify` | **8/8 passed**, incl. secret-scan; router 1589/2048 bytes |
| Structured evidence | `npm run --silent verify -- --json` | `docs/evidence/verify-node24.json`: `ok: true`, 8 passed / 0 failed / 0 blocked |
| Residual Node 20/22 references | repo-wide grep | Only in labeled historical evidence (`docs/ACCEPTANCE.md`, `docs/evidence/verify-node20/22.json`), past-tense plan text, and transitive dependencies' own `engines` metadata in the lockfile. No 20/22 lane or policy remains |

## Workstream C — CI workflow and security gates

Pin verification (all checked against upstream, not copied on trust):

| Item | Claimed | Verified by | Result |
| --- | --- | --- | --- |
| actions/checkout v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `git ls-remote` on the tag | Match (tag points directly at the commit) |
| actions/setup-node v7.1.0 | `949feb2413d6458794dcd2491c4babbbce0c15c1` | GitHub git-refs API | Match (object type: commit) |
| gitleaks 8.30.1 linux x64 tarball | sha256 `551f6fc8…f3e7ca7b3f2470eb` | Official release `checksums.txt`, `sha256sum -c` | OK |
| actionlint 1.7.12 linux amd64 tarball | release checksums file | `sha256sum -c` | OK |

| Check | Result |
| --- | --- |
| `actionlint .github/workflows/verify.yml` | Exit 0, no findings |
| Workflow structure (parsed) | Triggers: push to `main`, `pull_request`, `workflow_dispatch`. Permissions: `contents: read`. Single job `verify` on `ubuntu-24.04`, timeout 20 min, 9 steps. Checkout `persist-credentials: false`, `fetch-depth: 0`. No `pull_request_target` |
| Runtime assertion, real runtime | `node -e` major check on Node v24.20.0 → exit 0 |
| Runtime assertion, wrong major | Same assertion logic against a simulated `"22"` version string → exit 1, "Node 24 required". (Only Node 24 is installed here; the failure arm is demonstrated against the version value, not a second interpreter) |
| Failed verify ⇒ failing job | Temp copy of the repo with a deliberate lint break: `npm run verify` → 7 ok, 1 failed (lint), **exit 1**. A red step fails the CI job; no step uses `continue-on-error` |
| Secret scan, repository tree | `node scripts/check-secrets.mjs` → "no leaks in working tree", exit 0. Also a step inside `npm run verify` (8/8 run above) |
| Scanner fail-closed | Same command with gitleaks absent from PATH → `SCANNER_UNAVAILABLE` diagnostic, exit 1. An unscanned tree never reports clean |
| Scanner version pin | `check-secrets.mjs` rejects any gitleaks version other than 8.30.1 (`SCANNER_VERSION_MISMATCH`) |
| Positive control | `node scripts/check-secrets.mjs --self-test` → PASS: synthetic dummy credential flagged; clean file passed |
| Control design finding | AWS's published documentation example pair is **allowlisted by the gitleaks default rules** (verified: exit 0), so the control uses an invented same-format pair (never issued, no account). A lone AWS access key ID without its secret is likewise **not flagged** in plain text (verified) — recorded as a known gate limitation in `docs/CI_PLAN.md` |
| Control self-detection | The control's first version embedded the dummy literally in `scripts/check-secrets.mjs`; the scan correctly flagged the script itself (`generic-api-key`). The dummy is now assembled from fragments in memory and written only to a temp directory; the script scans clean and the control still fires |
| History scan control | Temp git repo: synthetic credential pair committed, then deleted in a second commit. `gitleaks git` → 2 commits scanned, 1 leak, exit 1. `gitleaks dir` on the same repo → no leaks, exit 0. The two scans are complementary; the workflow runs both |

## Dependency audit — BLOCKED locally (implemented in CI)

`npm audit` from this environment cannot execute: the registry audit
endpoint returns **HTTP 403 `policy_denied`** (managed-registry egress
policy), exit 1 with no vulnerability data. This is an environment
restriction, not a finding about the dependencies. The workflow runs
`npm audit --audit-level=high` on GitHub-hosted runners; its first real
execution will be the first live CI run. **The audit gate is implemented
but unverified until then** and is not claimed as passing.

Transitive/audit findings recorded per the task: the install notes
`eslint@9.39.5` (locked) as deprecated upstream — pre-existing from the
starter, unchanged by this task; impact: none on the Node 24 pipeline
(lint passes); resolution path: a reviewed eslint upgrade as its own
change, not bundled here.

## Workstream A — decision packages (review scenarios, not executed behavior)

The four Proposed ADRs were reasoned against these synthetic cases. These
are **design reviews of the proposed documents**; no application code
implements them yet, and nothing here claims otherwise.

| Scenario | Handling under the proposals |
| --- | --- |
| Missing timestamps (a CSV row with no time column value) | D03 §5.2: `event_time_utc` = ingest time, `time_zone_status = missing`; the substitution is visible in queries and reports, never silent |
| Duplicate records (same batch re-ingested) | INVARIANTS dedupe key (source id, content hash, source position) in D01's envelope index unique constraint; re-ingest creates no second raw record |
| Unauthorized raw request (analyst without raw permission) | D07: raw is `restricted`; access only via the `raw_ref` drill-down path with the distinct permission; denial is audited |
| Hostile log text (markup/script in a log line) | INVARIANTS output-encoding rule; D07 keeps `message` verbatim in storage and escaped at every render (UI and PDF) |
| Source lag (a feed falls behind) | ARCHITECTURE/INVARIANTS completeness status: lag renders as a data gap with quarantine counts, never as zero activity |
| Sensitive fields in a PDF export | D07: PDF inherits the generator's permissions with the most-masked default; `restricted` fields excluded without raw permission; EXSUM carries aggregates only; generation is audited |

## Blockers and limitations

1. **Decisions D01, D03, D05, D07 are Proposed.** Owner approval is
   outstanding; Phase 0 is **not accepted** and Phase 1 must not begin.
2. **No live CI.** No GitHub remote is configured from this workspace; the
   workflow has never run on GitHub, and branch protection / required
   status checks are manual steps recorded in `docs/CI_PLAN.md`.
3. **Dependency audit unverified** (see above): registry audit endpoint is
   blocked from this environment.
4. **D08 is decided** (Node 24 only, owner directive in the Phase 0 task)
   and implemented; D02, D04, D06, D09, D10 remain open by design.
5. Nothing was committed, pushed, tagged, or deployed.
