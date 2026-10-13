# Phase 0 — Owner rulings and exit-gate corrections (2026-10-12)

**Scope:** documentation patch application, owner decision rulings, and the
`check-secrets.mjs` fail-open correction. **The Phase 0 exit gate is NOT
claimed**: `npm audit` and live CI remain blocked (below), and the D03 field
model remains conditional. Repository remains `v0.0.0`, no commits, no remote.

## Inputs applied

- `GammaRay_v0.0.0_Phase0_Architecture_Decisions_2026-10-12.zip`
  (sha256 `7897aabe1b0589748fb1de246e1b6ca3e4612b93d00d11da3329391b24decda7`;
  its `SHA256SUMS` verified 14/14 OK). Its `docs/` tree was copied over the
  repository `docs/` per its instructions, preserving repo-only files
  (`CI_PLAN.md`, `ROADMAP.md`, starter docs, prior evidence). New files:
  `docs/decisions/D05_DEPLOYMENT_PROFILE.md`,
  `docs/decisions/proposals/D03_NORMALIZED_EVENT.schema.json` + two examples,
  `docs/evidence/PHASE0_ARCHITECTURE_REVIEW_2026-10-12.md`. The patch's
  instructions were archived as
  `docs/evidence/PHASE0_REVIEW_INSTRUCTIONS_2026-10-12.md`.
- Owner rulings delivered in chat, 2026-10-12 (this record's authority).

## Rulings recorded

| ID | Outcome | Where recorded |
| --- | --- | --- |
| D05 | **Accepted with changes**: A2 target; raw store behind `src/raw/`; B1 dev/lab only; production claims require B3/B4 evidence at P7; P1 worksheet gating = DP-01, 02, 03, 07, 09, 12; capacity/HA/backup/CI-promotion deferred to P3/P7 | `docs/decisions/D05_DEPLOYMENT.md` §6; `D05_DEPLOYMENT_PROFILE.md` (DP-03 selected, gating note); register; `PHASE_PLAN.md` |
| D01 | **Accepted with changes**: B3 primary class; no physical dedup in v1; `raw_ref` opaque (pinned version + optional byte range); one-object-per-occurrence is the P1/P2 default, segment decision at P3 with measured EPS; segment adoption requires a stated ack policy for UDP-type sources; lock testing only in a throwaway vault with short synthetic retention; **D02 must close before real data lands in a locked vault** | `docs/decisions/D01_STORAGE.md` §2, §3.1, §8; register (incl. D02 row); `PHASE_PLAN.md` |
| D03 | **Accepted with changes — approach only**: native semantics (A), JSON Schema 2020-12 + generated TypeScript, one family/type per event, §5 timestamp rules accepted. **Field model not accepted.** Owner verified the draft schema is valid 2020-12, both examples validate, the `event_id` algorithm reproduces, and probed negatives were rejected (extra `message` key, oversized fields, family/type mismatch) — and still found the observables too narrow for CTI/CVE: no software name/version, CVE id, URL/domain, MD5/SHA-1, or vulnerability family | `docs/decisions/D03_CANONICAL_SCHEMA.md` §1, §5, §8 (acceptance condition: observable registry + P5-sized initial set) |
| D07 | §3 amended (owner instruction): findings key on the stable `raw_ref`; `event_id` is advisory only (it embeds the parser version) | `docs/decisions/D07_SENSITIVE_DATA.md` §3; D03 §5 note; register |

## Exit-gate correction: check-secrets fail-open

**Defect (as identified in review):** `scripts/check-secrets.mjs` `scanDir()`
parsed the gitleaks JSON report under a catch-all that treated a missing or
malformed report as zero findings. A findings exit (1) with an absent/invalid
report therefore returned no diagnostics — the gate reported clean.

**Fix:** report interpretation now lives in an exported `interpretScan(status,
reportText)` and is fail-closed. A findings exit requires a well-formed,
non-empty JSON array report; a clean exit whose report lists findings is
contradictory; both fail with `SCANNER_REPORT_INVALID`. A missing/empty report
remains acceptable only with a clean exit (0), which is gitleaks' normal
no-leaks shape.

**Controls (all run 2026-10-12, gitleaks 8.30.1 via `GITLEAKS_BIN`):**

- `node scripts/check-secrets.mjs --self-test` → PASS, now including
  abnormal-report negative controls (findings exit × missing / malformed /
  non-array / empty report; clean exit × findings-listing report; well-formed
  report and clean-exit/no-report shapes still accepted).
- End-to-end with stubbed scanner binaries: exit 1 with no report →
  `SCANNER_REPORT_INVALID`, process exit 1 (the old code path reported this
  clean); exit 0 with a findings-listing report → `SCANNER_REPORT_INVALID`,
  process exit 1.
- `node scripts/check-secrets.mjs` → "no leaks in working tree", exit 0.
- `npm run verify` → **8/8 passed** (router 1589/2048, secret-scan included).
  `docs/evidence/verify-node24.json` regenerated from this run
  (`ok: true`, 8 passed / 0 failed / 0 blocked), Node v24.20.0, npm 10.9.4.
- `docs/CI_PLAN.md` and `docs/PHASE_PLAN.md` updated to record the fix.

## Blocked (not passed, not waived)

- **`npm audit`**: attempted 2026-10-12 from this sandbox; the registry audit
  endpoint returned `403 Forbidden … policy_denied`
  (`zz_managed_internal_spaces_package_registries`) — the sandbox egress
  policy blocks the audit API, the same block recorded in Phase 0. The audit
  must run where the endpoint is reachable (CI, per `docs/CI_PLAN.md` step 9,
  or the owner's environment). No audit result is claimed here.
- **CI against a real repo**: the repository has no commits and no GitHub
  remote (standing owner rule: nothing committed or pushed without the
  owner's call), so no live GitHub Actions run exists. Creating the remote
  and pushing is an owner action; until then CI evidence remains the local
  Node 24 run and the workflow review in `PHASE0_VERIFICATION.md`.

## Still outstanding before the Phase 0 exit gate

1. D03 field-model condition: observable registry + initial P5-sized set
   (D03 §8), schema revised to match.
2. `npm audit` result from an unblocked environment.
3. Live CI run against the real repository, and required branch protection
   (owner, GitHub settings).
4. D02 (retention) — open; additionally gated by the D01 locked-vault ruling.
