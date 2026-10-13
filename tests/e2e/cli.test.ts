import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { test } from "node:test";

test("compiled cli prints a greeting", () => {
  assert.ok(existsSync("dist/cli.js"), "dist/cli.js is missing: run `npm run build` first");
  const out = execFileSync("node", ["dist/cli.js", "Ada"], { encoding: "utf8" });
  assert.equal(out.trim(), "Hello, Ada!");
});
