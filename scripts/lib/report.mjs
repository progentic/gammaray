// Shared diagnostic contract for repo-owned checks.
// Fields: check, code, where (optional), problem, fix. Text and JSON render from the same record.
// External tools (ESLint, tsc, node:test) keep their native diagnostics; they are not re-shaped here.
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";

const WIDTH = 78;

export function diagnostic({ check, code, where, problem, fix }) {
  if (!check || !code) throw new Error("diagnostic: check and code are required");
  if (!problem?.trim()) throw new Error(`diagnostic ${code}: problem must be non-empty`);
  if (!fix?.trim()) throw new Error(`diagnostic ${code}: fix must be non-empty`);
  return { check, code, ...(where ? { where } : {}), problem, fix };
}

// Wraps prose only. Paths and native output are never wrapped.
function wrapProse(label, text) {
  const indent = " ".repeat(label.length);
  const lines = [];
  let line = label;
  for (const word of text.split(/\s+/)) {
    if (line.trim() !== "" && line.length + 1 + word.length > WIDTH && line !== label) {
      lines.push(line);
      line = `${indent}${word}`;
    } else {
      line += line === label ? word : ` ${word}`;
    }
  }
  lines.push(line);
  return lines.join("\n");
}

export function formatDiagnostic(d) {
  const lines = [`FAIL [${d.check}] ${d.code}`];
  if (d.where) lines.push(`  where:   ${d.where}`);
  lines.push(wrapProse("  problem: ", d.problem));
  lines.push(wrapProse("  fix:     ", d.fix));
  return lines.join("\n");
}

// Entry point for a check script run directly (hook, CI step, or by hand).
export function exitWithResult(diagnostics, okMessage) {
  if (diagnostics.length > 0) {
    for (const d of diagnostics) console.error(formatDiagnostic(d));
    process.exit(1);
  }
  console.log(okMessage);
}

export function isMain(metaUrl) {
  const entry = process.argv[1];
  return Boolean(entry) && pathToFileURL(realpathSync(entry)).href === metaUrl;
}
