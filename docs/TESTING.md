# Testing

## Layout
- Unit: `src/**/*.test.ts`, next to the code (`npm run test:unit`)
- E2E: `tests/e2e/*.test.ts`, run the compiled entrypoint in `dist/` (`npm run build` first; `npm test` does this, and `verify` orders it explicitly)
- Runner: `node:test` via `tsx`, launched by `scripts/run-tests.mjs` (file discovery is implemented without glob patterns; runs on the supported Node 24 runtime)

## Rules
- One behavior per test; name it as a sentence
- No network or clock dependence; inject or fake both
- Fix a bug → add the regression test in the same change
- No skipped, focused, or todo tests. `npm run check:tests` parses test files and flags skip/only/todo on `node:test` APIs (named, aliased, default, or namespace imports; dot access, `['skip']`, option objects, destructuring). It does not follow reassignment (`const c = test; c.only(...)`). `run-tests.mjs` additionally fails if the runner reports any skipped or todo test, so only focused tests rely on the static check alone
