// Discovers test files without relying on node --test globs (unsupported before Node 21)
// and fails if any test reports as skipped or todo, whatever syntax produced it.
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/run-tests.mjs <dir>");
  process.exit(2);
}

function* walk(root) {
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.test\.[cm]?tsx?$/.test(name)) yield path;
  }
}

const files = [...walk(dir)].sort();
if (files.length === 0) {
  console.error(`No test files found under ${dir}`);
  process.exit(1);
}

const run = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-reporter=tap", ...files],
  { encoding: "utf8" },
);
process.stdout.write(run.stdout);
process.stderr.write(run.stderr);

const count = (label) =>
  [...run.stdout.matchAll(new RegExp(`^# ${label} (\\d+)`, "gm"))].reduce((n, m) => n + Number(m[1]), 0);
const skipped = count("skipped");
const todo = count("todo");
if (skipped > 0 || todo > 0) {
  console.error(`Test policy violation: ${skipped} skipped, ${todo} todo.`);
  process.exit(1);
}
process.exit(run.status ?? 1);
