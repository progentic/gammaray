// Secret scanning gate (INVARIANTS: credentials never appear in code, logs,
// reports, or error messages; secret scanning is part of verification).
// Usage:
//   node scripts/check-secrets.mjs              scan the working tree
//   node scripts/check-secrets.mjs --self-test  controls: synthetic credential,
//                                               clean file, abnormal reports
//                                               and actual unreadable report
//                                               fail closed on all exit codes
// The scanner is gitleaks, pinned to PINNED_VERSION. The pin is enforced, not
// advisory: a different version fails the check, because rule behavior is part
// of the gate's meaning. CI installs the pinned build (docs/CI_PLAN.md).
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { diagnostic, exitWithResult, formatDiagnostic, isMain } from "./lib/report.mjs";

const CHECK = "secret-scan";
const PINNED_VERSION = "8.30.1";
const CONFIG = ".gitleaks.toml";

// Positive-control credential: invented for this test, in AWS key format.
// It was never issued and belongs to no account. AWS's own published example
// pair ("AKIAIOSFODNN7EXAMPLE" / "...EXAMPLEKEY") cannot serve here: the
// gitleaks default rules allowlist it as documentation, so it does not fire
// (verified against gitleaks 8.30.1). A same-format synthetic value does.
// The value is assembled from fragments so this source file does not itself
// contain a credential-shaped string for the scanner to (correctly) flag;
// the control writes the assembled value only to a temporary directory.
const DUMMY_ACCESS_KEY = ["AKIA", "7KXQ2MNVPRT9WZ4J"].join("");
const DUMMY_SECRET_KEY = ["qW8eR2tY5uI0oP3aS6", "dF9gH1jK4lZ7xC8vB0nM2"].join("");
const DUMMY_CREDENTIAL = [
  `aws_access_key_id = "${DUMMY_ACCESS_KEY}"`,
  `aws_secret_access_key = "${DUMMY_SECRET_KEY}"`,
].join("\n");

function scannerBinary() {
  return process.env.GITLEAKS_BIN ?? "gitleaks";
}

function invoke(args, cwd) {
  const r = spawnSync(scannerBinary(), args, { encoding: "utf8", cwd });
  return { status: r.status, error: r.error, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function versionDiagnostic() {
  const r = invoke(["version"], process.cwd());
  if (r.error || r.status !== 0) {
    return diagnostic({
      check: CHECK,
      code: "SCANNER_UNAVAILABLE",
      problem: `The pinned secret scanner (gitleaks ${PINNED_VERSION}) is not runnable: ${r.error?.message ?? `exit ${r.status}`}. The scan did not run; an unscanned tree is not a clean tree.`,
      fix: `Install gitleaks ${PINNED_VERSION} (docs/TOOLS.md, docs/CI_PLAN.md) or set GITLEAKS_BIN to its path, then rerun verification.`,
    });
  }
  const found = r.stdout.trim().split(/\s+/).find((t) => /^\d+\.\d+\.\d+$/.test(t)) ?? r.stdout.trim();
  if (found !== PINNED_VERSION) {
    return diagnostic({
      check: CHECK,
      code: "SCANNER_VERSION_MISMATCH",
      where: "gitleaks version",
      problem: `gitleaks ${found} is installed; the gate is pinned to ${PINNED_VERSION}. Rule behavior differs between versions, so results are not comparable.`,
      fix: `Install gitleaks ${PINNED_VERSION}, or amend the pin in scripts/check-secrets.mjs and docs/CI_PLAN.md together as one reviewed change.`,
    });
  }
  return null;
}

// Gitleaks normally returns exit 0 with no report, or an empty report.
// ENOENT means absent. Every other read failure fails closed. Reading
// directly avoids masking permission errors as "missing" via existsSync.
export function readScanReport(reportPath) {
  try {
    return { reportText: readFileSync(reportPath, "utf8"), reportReadError: null };
  } catch (error) {
    if (error?.code === "ENOENT") return { reportText: null, reportReadError: null };
    const code = error?.code ?? "UNKNOWN";
    return { reportText: null, reportReadError: `gitleaks report cannot be read (${code}).` };
  }
}

// A clean exit with no report or an empty report is valid. Any non-empty
// report must be a JSON array, regardless of the scanner's exit status.
// A findings exit requires a nonempty array. An unreadable report always
// fails closed, even when gitleaks itself exits 0.
export function interpretScan(status, reportText, reportReadError = null) {
  if (reportReadError) return { findings: [], reportError: reportReadError };
  let parsed = null;
  if (reportText !== null && reportText !== "") {
    try {
      parsed = JSON.parse(reportText);
    } catch {
      return { findings: [], reportError: "gitleaks report is malformed JSON; scan result cannot be trusted." };
    }
    if (!Array.isArray(parsed)) {
      return { findings: [], reportError: "gitleaks report is not a JSON array; scan result cannot be trusted." };
    }
  }
  if (status === 0) {
    if (Array.isArray(parsed) && parsed.length > 0) {
      return {
        findings: [],
        reportError: `gitleaks exited 0 (clean) but its report lists ${parsed.length} finding(s); the result is contradictory and cannot be trusted.`,
      };
    }
    return { findings: [], reportError: null };
  }
  if (status === 1) {
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return {
        findings: [],
        reportError: "gitleaks exited 1 (findings) but its findings report is missing or empty; the findings cannot be enumerated, so the scan fails closed.",
      };
    }
    return { findings: parsed, reportError: null };
  }
  return { findings: [], reportError: null };
}

// Scans one directory. Reports abnormal or unreadable output as an error
// rather than treating scanner exit 0 as proof of a valid report.
function scanDir(dir, configPath) {
  const reportDir = mkdtempSync(join(tmpdir(), "gammaray-gitleaks-report-"));
  const reportPath = join(reportDir, "report.json");
  try {
    const r = invoke(
      ["dir", "--config", configPath, "--redact", "--no-banner",
       "--report-format", "json", "--report-path", reportPath, dir],
      process.cwd(),
    );
    const { reportText, reportReadError } = readScanReport(reportPath);
    const { findings, reportError } = interpretScan(r.status, reportText, reportReadError);
    return { status: r.status, findings, reportError, stderr: r.stderr };
  } finally {
    rmSync(reportDir, { recursive: true, force: true });
  }
}

export function run() {
  const unavailable = versionDiagnostic();
  if (unavailable) return { diagnostics: [unavailable], detail: "scanner unavailable" };

  const { status, findings, reportError, stderr } = scanDir(".", CONFIG);
  if (status !== 0 && status !== 1) {
    return {
      diagnostics: [diagnostic({
        check: CHECK,
        code: "SCANNER_ERROR",
        problem: `gitleaks exited with status ${status} instead of reporting a result. ${stderr.trim().split("\n")[0] ?? ""}`.trim(),
        fix: "Run `gitleaks dir --config .gitleaks.toml --redact .` directly to inspect the error, resolve it, then rerun verification.",
      })],
      detail: "scanner error",
    };
  }
  if (reportError) {
    return {
      diagnostics: [diagnostic({
        check: CHECK,
        code: "SCANNER_REPORT_INVALID",
        problem: reportError,
        fix: "Run `gitleaks dir --config .gitleaks.toml --redact --report-format json --report-path report.json .` directly and inspect the report; do not treat an abnormal scanner result as a clean scan.",
      })],
      detail: "scanner report abnormal — failed closed",
    };
  }
  if (status === 0) {
    return { diagnostics: [], detail: `gitleaks ${PINNED_VERSION}: no leaks in working tree` };
  }
  const diagnostics = findings.slice(0, 20).map((f) => diagnostic({
    check: CHECK,
    code: "SECRET_FOUND",
    where: `${f.File}:${f.StartLine}`,
    problem: `Possible credential in checked content (rule: ${f.RuleID}). The value is redacted here and must stay out of logs and reports.`,
    fix: "Remove the credential from the tree and rotate it if it was ever real. For a proven false positive, add the finding's exact fingerprint to .gitleaksignore with a recorded reason (docs/CI_PLAN.md).",
  }));
  if (findings.length > diagnostics.length) {
    diagnostics.push(diagnostic({
      check: CHECK,
      code: "SECRET_FOUND",
      problem: `${findings.length} findings in total; only the first ${diagnostics.length} are listed.`,
      fix: "Run `gitleaks dir --config .gitleaks.toml --redact .` for the full list.",
    }));
  }
  return { diagnostics, detail: `gitleaks ${PINNED_VERSION}: ${findings.length} finding(s)` };
}

// Controls. The gate is only evidence if it demonstrably fires:
// a directory holding the synthetic dummy credential must be flagged, and a
// clean directory must pass. Uses the repository's own config, so an
// over-broad allowlist fails this test instead of silently passing CI.
// The abnormal-report negative controls exercise interpretScan directly:
// a findings exit with a missing, malformed, non-array, or empty report
// must produce a reportError (fail closed) — the exact shape of the
// fail-open defect found in Phase 0 review — while a clean exit with no
// report and a findings exit with a well-formed report must not.
export function selfTest() {
  const unavailable = versionDiagnostic();
  if (unavailable) return { diagnostics: [unavailable], detail: "scanner unavailable" };

  const root = mkdtempSync(join(tmpdir(), "gammaray-gitleaks-control-"));
  try {
    const dirty = join(root, "dirty");
    const clean = join(root, "clean");
    mkdirSync(dirty);
    mkdirSync(clean);
    writeFileSync(join(dirty, "synthetic-credentials.txt"), `${DUMMY_CREDENTIAL}\n`);
    writeFileSync(join(clean, "plain.txt"), "nothing sensitive here\n");
    const configPath = join(process.cwd(), CONFIG);
    const dirtyResult = scanDir(dirty, configPath);
    const cleanResult = scanDir(clean, configPath);
    const diagnostics = [];
    if (dirtyResult.status !== 1 || dirtyResult.findings.length === 0) {
      diagnostics.push(diagnostic({
        check: CHECK,
        code: "POSITIVE_CONTROL_FAILED",
        problem: "The scanner did not flag a synthetic dummy credential. The gate cannot be trusted to catch a real one.",
        fix: "Inspect the gitleaks default rules and .gitleaks.toml allowlist for over-broad exclusions; the control must pass before the scan result means anything.",
      }));
    }
    if (cleanResult.status !== 0) {
      diagnostics.push(diagnostic({
        check: CHECK,
        code: "NEGATIVE_CONTROL_FAILED",
        problem: "The scanner flagged a directory containing only plain text. The gate would block clean work.",
        fix: "Inspect .gitleaks.toml and the reported rule; correct the configuration rather than the fixture.",
      }));
    }
    // Abnormal-report negative controls, including the two clean-exit
    // contradictions identified in the second Phase 0 review.
    const abnormalCases = [
      ["findings exit, report missing", interpretScan(1, null)],
      ["findings exit, report malformed", interpretScan(1, "this is not json")],
      ["findings exit, whitespace-only report", interpretScan(1, "   ")],
      ["findings exit, report not an array", interpretScan(1, '{"findings": []}')],
      ["findings exit, report empty", interpretScan(1, "[]")],
      ["clean exit, report malformed", interpretScan(0, "this is not json")],
      ["clean exit, whitespace-only report", interpretScan(0, "   ")],
      ["clean exit, report not an array", interpretScan(0, '{"findings": []}')],
      ["clean exit, report lists findings", interpretScan(0, '[{"RuleID": "x"}]')],
      ["clean exit, report unreadable", interpretScan(0, null, "EACCES")],
      ["findings exit, report unreadable", interpretScan(1, null, "EACCES")],
    ];
    for (const [label, result] of abnormalCases) {
      if (!result.reportError) {
        diagnostics.push(diagnostic({
          check: CHECK,
          code: "ABNORMAL_REPORT_CONTROL_FAILED",
          problem: `Abnormal scanner result was accepted as clean: ${label}. The abnormal-report fail-open is present.`,
          fix: "Restore fail-closed handling in interpretScan: a findings exit requires a nonempty JSON array; a clean exit must reject malformed, non-array, nonempty or unreadable reports.",
        }));
      }
    }
    const wellFormed = interpretScan(1, '[{"RuleID": "x", "File": "f", "StartLine": 1}]');
    if (wellFormed.reportError || wellFormed.findings.length !== 1) {
      diagnostics.push(diagnostic({
        check: CHECK,
        code: "ABNORMAL_REPORT_CONTROL_FAILED",
        problem: "A well-formed findings report was rejected or misread. The report handling is broken in the closed direction.",
        fix: "Fix interpretScan (scripts/check-secrets.mjs) so a findings exit with a non-empty JSON array report yields its findings.",
      }));
    }
    // Exercise actual report I/O failures independently from pure parsing.
    // A directory occupies the intended report path and is unreadable as a
    // file even when the self-test runs as root, unlike a chmod-only test.
    const unreadablePath = join(root, "report-is-directory");
    mkdirSync(unreadablePath);
    const unreadable = readScanReport(unreadablePath);
    if (!unreadable.reportReadError || !interpretScan(0, unreadable.reportText, unreadable.reportReadError).reportError) {
      diagnostics.push(diagnostic({
        check: CHECK,
        code: "ABNORMAL_REPORT_CONTROL_FAILED",
        problem: "An existing but unreadable scanner report was treated as absent or clean.",
        fix: "Keep readScanReport I/O failures distinct from a legitimately absent report.",
      }));
    }
    const trulyAbsent = readScanReport(join(root, "not-created.json"));
    if (trulyAbsent.reportText !== null || trulyAbsent.reportReadError || interpretScan(0, trulyAbsent.reportText).reportError) {
      diagnostics.push(diagnostic({
        check: CHECK,
        code: "ABNORMAL_REPORT_CONTROL_FAILED",
        problem: "The scanner's valid clean exit with no report was rejected.",
        fix: "Allow absent reports only when the scanner exits cleanly and no read error occurred.",
      }));
    }
    if (interpretScan(0, null).reportError || interpretScan(0, "[]").reportError) {
      diagnostics.push(diagnostic({
        check: CHECK,
        code: "ABNORMAL_REPORT_CONTROL_FAILED",
        problem: "A clean exit with no report or an empty array was rejected as abnormal.",
        fix: "Fix interpretScan (scripts/check-secrets.mjs): a missing or empty report is acceptable only with a clean exit (0).",
      }));
    }
    return { diagnostics, detail: "controls: synthetic credential and clean file; malformed/unreadable reports fail closed" };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (isMain(import.meta.url)) {
  if (process.argv.includes("--self-test")) {
    const { diagnostics, detail } = selfTest();
    exitWithResult(diagnostics, `secret-scan self-test OK: ${detail}`);
  } else {
    const { diagnostics, detail } = run();
    if (diagnostics.length > 0) {
      for (const d of diagnostics) console.error(formatDiagnostic(d));
      process.exit(1);
    }
    console.log(`secret-scan OK: ${detail}`);
  }
}
