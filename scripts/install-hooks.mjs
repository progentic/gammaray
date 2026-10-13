// Points git at .githooks/ without clobbering an existing choice.
// Set HOOKS_PATH=replace to override an existing core.hooksPath.
import { spawnSync } from "node:child_process";

const HOOKS = ".githooks";
const git = (...args) => spawnSync("git", args, { encoding: "utf8" });

const probe = git("rev-parse", "--git-dir");
if (probe.error?.code === "ENOENT") {
  console.log("install-hooks: git not found; skipping (CI still enforces verify).");
  process.exit(0);
}
if (probe.status !== 0) {
  console.log("install-hooks: not a git checkout; skipping.");
  process.exit(0);
}

const current = git("config", "--get", "core.hooksPath").stdout.trim();
if (current === HOOKS) process.exit(0);
if (current !== "" && process.env.HOOKS_PATH !== "replace") {
  console.log(`install-hooks: core.hooksPath is already "${current}"; leaving it. Set HOOKS_PATH=replace to override.`);
  process.exit(0);
}

const set = git("config", "core.hooksPath", HOOKS);
if (set.status !== 0) {
  console.error(`install-hooks: failed to set core.hooksPath: ${set.stderr.trim() || set.error?.message}`);
  process.exit(1);
}
