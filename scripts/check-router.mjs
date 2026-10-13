// Usage: node scripts/check-router.mjs [--staged]
// --staged validates the git index (the proposed commit) instead of the working tree.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { diagnostic, exitWithResult, isMain } from "./lib/report.mjs";

const CHECK = "router";
const ROUTER_LIMIT = 2048;
const REQUIRED_SECTIONS = ["Routing", "Commands", "Core Rules", "Done Gate"];

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

export function run({ staged = false } = {}) {
  const readFile = (path) => (staged ? git("show", `:${path}`) : readFileSync(path, "utf8"));
  const fileExists = (path) => {
    if (!staged) return existsSync(path);
    try {
      git("cat-file", "-e", `:${path}`);
      return true;
    } catch {
      return false;
    }
  };

  const text = readFile("AGENTS.md");
  const diagnostics = [];
  const size = Buffer.byteLength(text);

  if (size > ROUTER_LIMIT) {
    diagnostics.push(diagnostic({
      check: CHECK,
      code: "ROUTER_TOO_LARGE",
      where: "AGENTS.md",
      problem: `AGENTS.md is ${size} bytes; the limit is ${ROUTER_LIMIT}.`,
      fix: "Move detail into the matching docs/ file and keep only a link in the routing table.",
    }));
  }
  for (const name of REQUIRED_SECTIONS) {
    if (!new RegExp(`^## ${name}\\b`, "m").test(text)) {
      diagnostics.push(diagnostic({
        check: CHECK,
        code: "ROUTER_SECTION_MISSING",
        where: "AGENTS.md",
        problem: `The required "## ${name}" section is missing.`,
        fix: `Restore the "## ${name}" heading and its content.`,
      }));
    }
  }
  for (const [, path] of text.matchAll(/`(docs\/[A-Z_]+\.md)`/g)) {
    if (!fileExists(path)) {
      diagnostics.push(diagnostic({
        check: CHECK,
        code: "ROUTER_LINK_BROKEN",
        where: "AGENTS.md",
        problem: `AGENTS.md links ${path}, which does not exist${staged ? " in the index" : ""}.`,
        fix: `Create ${path}, or remove the link from the routing table.`,
      }));
    }
  }

  return { diagnostics, detail: `${size}/${ROUTER_LIMIT} bytes (${staged ? "staged" : "working tree"})` };
}

if (isMain(import.meta.url)) {
  const { diagnostics, detail } = run({ staged: process.argv.includes("--staged") });
  exitWithResult(diagnostics, `AGENTS.md OK: ${detail}`);
}
