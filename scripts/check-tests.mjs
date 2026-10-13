// Syntax-aware test-policy check. Flags skip/only/todo used on Node's test API via dot access,
// ['skip'], option objects, and destructuring. Strings and comments are ignored.
// Scope: receivers are the names imported from "node:test" in that file (named, aliased, default,
// or namespace imports) plus the conventional names below. It does not follow reassignment
// (const c = test; c.only(...)). Skipped/todo are also caught at runtime by scripts/run-tests.mjs;
// focused tests (.only) are caught only here.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { diagnostic, exitWithResult, isMain } from "./lib/report.mjs";

const ROOTS = ["src", "tests"];
const BANNED = new Set(["skip", "only", "todo"]);
const DEFAULT_ROOTS = ["test", "it", "describe", "suite", "t"];
const TEST_MODULES = new Set(["node:test", "test"]);
const LABEL = { skip: "skipped test", only: "focused test", todo: "todo test" };

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.test\.[cm]?[jt]sx?$/.test(name)) yield path;
  }
}

function rootName(node) {
  let n = node;
  while (
    n &&
    (ts.isPropertyAccessExpression(n) ||
      ts.isElementAccessExpression(n) ||
      ts.isCallExpression(n) ||
      ts.isParenthesizedExpression(n) ||
      ts.isNonNullExpression(n) ||
      ts.isAsExpression(n))
  ) {
    n = n.expression;
  }
  return n && ts.isIdentifier(n) ? n.text : undefined;
}

function literalText(node) {
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined;
}

function keyName(name) {
  if (!name) return undefined;
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isComputedPropertyName(name)) return literalText(name.expression);
  return literalText(name);
}

function importedRoots(sourceFile) {
  const roots = new Set(DEFAULT_ROOTS);
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt) || !TEST_MODULES.has(literalText(stmt.moduleSpecifier))) continue;
    const clause = stmt.importClause;
    if (!clause) continue;
    if (clause.name) roots.add(clause.name.text);
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) roots.add(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings)) for (const el of bindings.elements) roots.add(el.name.text);
  }
  return roots;
}

function findings(sourceFile) {
  const TEST_ROOTS = importedRoots(sourceFile);
  const out = [];
  const flag = (node, kind, form) => {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    out.push(diagnostic({
      check: "test-policy",
      code: `TEST_${kind.toUpperCase()}`,
      where: `${sourceFile.fileName}:${line + 1}`,
      problem: `Found ${form}, which declares a ${LABEL[kind]}. Verification does not allow it.`,
      fix: kind === "only"
        ? "Remove the only modifier so every test runs."
        : `Remove the ${kind} modifier, then fix or delete the test.`,
    }));
  };

  const visit = (node) => {
    if (ts.isPropertyAccessExpression(node) && BANNED.has(node.name.text) && TEST_ROOTS.has(rootName(node.expression))) {
      flag(node, node.name.text, `.${node.name.text}`);
    } else if (ts.isElementAccessExpression(node) && BANNED.has(literalText(node.argumentExpression)) && TEST_ROOTS.has(rootName(node.expression))) {
      const kind = literalText(node.argumentExpression);
      flag(node, kind, `['${kind}']`);
    } else if (ts.isCallExpression(node) && TEST_ROOTS.has(rootName(node.expression))) {
      for (const arg of node.arguments) {
        if (!ts.isObjectLiteralExpression(arg)) continue;
        for (const prop of arg.properties) {
          const key = keyName(prop.name);
          if (!BANNED.has(key)) continue;
          if (ts.isPropertyAssignment(prop) && prop.initializer.kind === ts.SyntaxKind.FalseKeyword) continue;
          flag(prop, key, `option "${key}"`);
        }
      }
    } else if (ts.isBindingElement(node)) {
      const key = keyName(node.propertyName ?? node.name);
      const decl = node.parent?.parent;
      if (BANNED.has(key) && decl && ts.isVariableDeclaration(decl) && TEST_ROOTS.has(rootName(decl.initializer))) {
        flag(node, key, `destructured "${key}"`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return out;
}

export function run() {
  const diagnostics = [];
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
      diagnostics.push(...findings(sf));
    }
  }
  return { diagnostics, detail: "" };
}

if (isMain(import.meta.url)) {
  const { diagnostics } = run();
  exitWithResult(diagnostics, "Test policy OK");
}
