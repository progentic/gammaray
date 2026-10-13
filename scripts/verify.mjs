// Sequential verification with explicit dependencies.
// Usage: node scripts/verify.mjs [--json]
// Exit codes: 0 all steps passed, 1 a step failed or was blocked, 2 usage error.
// Text mode: one status line per step, then details for failures on stderr.
// --json: exactly one JSON object on stdout; no banners, timings, or raw child output.
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { run as runRouter } from "./check-router.mjs";
import { run as runTestPolicy } from "./check-tests.mjs";
import { run as runSecretScan } from "./check-secrets.mjs";
import { diagnostic, formatDiagnostic } from "./lib/report.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const unknown = args.filter((a) => a !== "--json");
if (unknown.length > 0) {
  console.error(`verify: unknown option "${unknown[0]}". Usage: node scripts/verify.mjs [--json]`);
  process.exit(2);
}

function npmRun(script) {
  const viaNpm = process.env.npm_execpath;
  const [cmd, base] = viaNpm ? [process.execPath, [viaNpm]] : ["npm", []];
  const r = spawnSync(cmd, [...base, "run", "--silent", script], {
    encoding: "utf8",
    shell: !viaNpm && process.platform === "win32",
  });
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? `\n${r.error.message}` : ""}`.trimEnd();
  return { command: `npm run ${script}`, exitCode: r.status ?? 1, output };
}

const internal = (fn) => () => {
  const { diagnostics, detail } = fn();
  return { ok: diagnostics.length === 0, diagnostics, detail };
};

const external = (script, before) => () => {
  before?.();
  const r = npmRun(script);
  const ok = r.exitCode === 0;
  return {
    ok,
    command: r.command,
    exitCode: r.exitCode,
    output: ok ? "" : r.output,
    diagnostics: ok
      ? []
      : [diagnostic({
          check: script,
          code: "COMMAND_FAILED",
          where: r.command,
          problem: `\`${r.command}\` exited with status ${r.exitCode}.`,
          fix: `Run \`${r.command}\` to inspect diagnostics, correct the reported errors, then rerun verification.`,
        })],
  };
};

const steps = [
  { id: "router", run: internal(() => runRouter()) },
  { id: "test-policy", run: internal(() => runTestPolicy()) },
  // The secret scan is a hard gate, not an advisory: if the pinned scanner is
  // unavailable or the tree contains a credential, verification fails.
  { id: "secret-scan", run: internal(() => runSecretScan()) },
  { id: "lint", run: external("lint") },
  { id: "typecheck", run: external("typecheck") },
  { id: "test:unit", run: external("test:unit") },
  // dist/ is removed first so a stale artifact can never satisfy the compiled-CLI check.
  { id: "build", run: external("build", () => rmSync("dist", { recursive: true, force: true })) },
  { id: "test:e2e", needs: ["build"], run: external("test:e2e") },
];

// Any exception inside a step (missing file, unreadable directory, failed cleanup) becomes a failed
// step with a shared-format diagnostic, so later independent steps and the final report still run.
function execute(step) {
  try {
    const { ok, ...rest } = step.run();
    return { id: step.id, status: ok ? "pass" : "fail", ...rest };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      id: step.id,
      status: "fail",
      diagnostics: [diagnostic({
        check: step.id,
        code: "STEP_EXCEPTION",
        problem: `The step could not complete: ${reason}`,
        fix: "Resolve the reported error (for example a missing or unreadable file), then rerun verification.",
      })],
    };
  }
}

const STATUS_LABEL = { pass: "ok", fail: "FAIL", blocked: "BLOCKED" };
const results = [];
const statusOf = new Map();

for (const step of steps) {
  const blockedBy = (step.needs ?? []).filter((id) => statusOf.get(id) !== "pass");
  let result;
  if (blockedBy.length > 0) {
    result = {
      id: step.id,
      status: "blocked",
      blockedBy,
      diagnostics: [diagnostic({
        check: step.id,
        code: "STEP_BLOCKED",
        problem: `Not run because ${blockedBy.join(", ")} did not pass.`,
        fix: `Fix ${blockedBy.join(", ")} first.`,
      })],
    };
  } else {
    result = execute(step);
  }
  statusOf.set(step.id, result.status);
  results.push(result);

  if (!json) {
    const note = result.status === "blocked" ? `needs ${result.blockedBy.join(", ")}` : result.detail ?? "";
    console.log(`  ${STATUS_LABEL[result.status].padEnd(8)} ${step.id.padEnd(12)} ${note}`.trimEnd());
  }
}

const count = (status) => results.filter((r) => r.status === status).length;
const summary = { passed: count("pass"), failed: count("fail"), blocked: count("blocked") };
const ok = summary.failed === 0 && summary.blocked === 0;

if (json) {
  const steps_ = results.map((r) => ({
    id: r.id,
    status: r.status,
    ...(r.command ? { command: r.command, exitCode: r.exitCode } : {}),
    ...(r.detail ? { detail: r.detail } : {}),
    ...(r.blockedBy ? { blockedBy: r.blockedBy } : {}),
    diagnostics: r.diagnostics,
  }));
  process.stdout.write(`${JSON.stringify({ ok, summary, steps: steps_ }, null, 2)}\n`);
} else {
  for (const r of results.filter((x) => x.status === "fail")) {
    console.error("");
    for (const d of r.diagnostics) console.error(formatDiagnostic(d));
    if (r.output) console.error(`\n-- native output of ${r.command} (exit ${r.exitCode}) --\n${r.output}`);
  }
  const first = results.find((r) => r.status === "fail");
  console.log(
    ok
      ? `\nAll ${results.length} steps passed.`
      : `\n${summary.passed} ok, ${summary.failed} failed, ${summary.blocked} blocked. Start with: ${first?.id}.`,
  );
}
process.exit(ok ? 0 : 1);
