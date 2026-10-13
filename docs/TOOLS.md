# Tools and setup

## Requirements

Use Node.js 24 only (any maintained 24.x patch release; `engines` requires `>=24 <25`) and npm 10 or newer. CI runs the same single Node 24 line. Run commands from the repository root. `.nvmrc` pins the major version (`24`) for version managers.

`npm ci` reproduces the committed dependency set. Authorized dependency updates may use `npm install <package>`; commit the manifest and regenerated lockfile together. Do not edit the lockfile by hand. No global tools are required beyond the secret scanner below.

## Secret scanner

Verification includes a secret-scanning step (`scripts/check-secrets.mjs`) that requires **gitleaks 8.30.1** — the version is pinned and enforced, locally and in CI. Install it from the project release (`https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1`, verify the download against the release checksums) and put it on `PATH`, or set `GITLEAKS_BIN` to the binary's path. Without it, `npm run verify` fails at the secret-scan step by design.

## Hooks

Installation runs `prepare`, which sets `core.hooksPath` to `.githooks` if no existing path is configured. It preserves another configured path. In that case, integrate the supplied hook into the existing system if you want local feedback.

To explicitly replace a hook path:

```sh
HOOKS_PATH=replace npm run prepare
```

That changes repository hook configuration. Check your existing hooks before using it. The installer skips when Git is unavailable or the directory is not a checkout. Local hooks can be bypassed; required CI supplies merge enforcement.

## Environment

`.env.example` contains placeholder `DATABASE_URL` and `API_KEY` names. The greeting application does not use them or load `.env`. Introduce real environment requirements only when an application feature needs them. Never commit credentials.

## Generated files

`node_modules/` and `dist/` are generated and excluded from Git. Verification clears `dist/` before building. A standalone `npm run build` compiles source but does not perform that cleanup; use full verification for acceptance.
