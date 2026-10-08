import { strict as assert } from "node:assert";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

// Read-only investigation of a caller-selected package/source tree.
// Fixture functions are analyzed as text, never imported or executed.
const root = resolve(process.argv[2] ?? ".");
const sourceMode = process.argv.includes("--source");
const extension = sourceMode ? ".ts" : ".mjs";
const analyzerRoot = join(root, sourceMode ? "src" : "dist/esm",
  "package-checks/function-metrics/analyzer");
const load = (path) => import(pathToFileURL(path).href);
const api = await load(join(root, sourceMode ? "src/index.ts" : "index.mjs"));
const { analyzeLizardSource } = await load(join(analyzerRoot, "port-facade" + extension));
const { TypeScriptReader } = await load(join(analyzerRoot, "readers/typescript" + extension));
const { CodeStateMachine } = await load(join(analyzerRoot, "shared/code-reader" + extension));
const metadata = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const tail = [
  "if (true) {",
  "  for (const value of [1]) {",
  "    if (true) {",
  "      void value;",
  "    }",
  "  }",
  "}"
].join("\n") + "\n";
const marker = (typed) =>
  "function marker()" + (typed ? ": string" : "") + ' {\n  return "marker";\n}\n';
const defaults = (expressions, parameters = "a: number | undefined") =>
  "function defaults(" + parameters + ") {\n  return [" + expressions.join(", ") + "];\n}\n";
const fourParameters =
  "a: number | undefined, b: number | undefined, c: number | undefined, d: number | undefined";
const samples = {
  "typed-only.ts": marker(true),
  "inferred-only.ts": marker(false),
  "typed-tail.ts": marker(true) + tail,
  "inferred-tail.ts": marker(false) + tail,
  "baseline-four.ts": defaults(["a", "b", "c", "d"], fourParameters),
  "coalesce-one.ts": defaults(["a ?? 0"]),
  "coalesce-four.ts": defaults(["a ?? 0", "b ?? 0", "c ?? 0", "d ?? 0"], fourParameters),
  "coalesce-compact.ts": defaults(["a??0"]),
  "optional-parameter.ts": defaults(["a"], "a?: number"),
  "ternary-one.ts": defaults(["a == null ? 0 : a"]),
  "ternary-four.ts": defaults(["a == null ? 0 : a", "b == null ? 0 : b",
    "c == null ? 0 : c", "d == null ? 0 : d"], fourParameters)
};
const output = {
  target: { name: metadata.name, version: metadata.version, sourceMode,
    host: process.versions.bun ? "bun" : "node",
    hostVersion: process.versions.bun ?? process.version,
    nodeCompatibilityVersion: process.version },
  samples,
  profiles: []
};
function metrics(filename, sourceCode) {
  const result = analyzeLizardSource({ filename, sourceCode });
  assert.ok(result, "unsupported sample");
  return result.function_list;
}
output.analysis = Object.entries(samples).map(([filename, sourceCode]) => ({
  filename,
  questionTokens: [...TypeScriptReader.generateTokens(sourceCode)].filter((token) => token.includes("?")),
  functions: metrics(filename, sourceCode)
}));
// Exploration control: semicolons in a classic for-header affect Lizard ND.
// Do not infer an AST nesting definition from the for-of sample's ND=3.
output.classicForTail = metrics("classic-for-tail.ts", marker(true) + tail
  .replace("for (const value of [1])", "for (let i = 0; i < 1; i++)")
  .replace("void value", "void i"));
const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-ts-metrics-"));
try {
  for (const [filename, sourceCode] of Object.entries(samples)) {
    writeFileSync(join(fixtureRoot, filename), sourceCode);
  }
  for (const diagnostic of [true, false]) {
    const check = api.functionMetrics({
      findingPolicy: "blocking",
      codeAreas: {
        samples: {
          files: { source: "filesystem", include: ["*.ts"], exclude: [] },
          ...(diagnostic ? { limits: {
            cyclomaticComplexity: { maximum: 1 }, nestingDepth: { maximum: 1 }
          } } : {})
        }
      }
    });
    const result = await api.run(api.defineConfig({
      checks: [check],
      outputs: {
        progressRendering: { enabled: false },
        machinePublication: { enabled: false },
        diagnosticLogging: { enabled: false }
      }
    }), { projectRoot: fixtureRoot });
    assert.equal(result.kind, "completed", JSON.stringify(result));
    const outcome = result.snapshot.checks.find((item) => item.checkId === check.checkId)?.outcome;
    assert.ok(["passed", "failed"].includes(outcome?.status), JSON.stringify(outcome));
    output.profiles.push({
      name: diagnostic ? "diagnostic-limits" : "default-limits",
      aggregate: result.aggregate,
      outcome,
      findings: result.snapshot.records.map((record) => record.data)
    });
  }
} finally {
  // Only remove the fixture directory created above; never the target tree.
  rmSync(fixtureRoot, { recursive: true, force: true });
}

function probeCallback() {
  const events = [];
  const machine = new CodeStateMachine({});
  machine.state = () => true;
  machine.savedState = () => false;
  machine.callback = function () {
    events.push("old callback");
    this.subState(() => false, () => events.push("new callback"));
    events.push("installed: " + typeof this.callback);
  };
  machine.consume("probe");
  events.push("after consume: " + typeof machine.callback);
  return events;
}
output.callbackProbe = probeCallback();
const originalConsume = CodeStateMachine.prototype.consume;
try {
  // Causal experiment only. A parent-process patch does not patch the public
  // producer's Worker, nor establish cross-reader compatibility.
  CodeStateMachine.prototype.consume = function (token) {
    const completed = this.invokeCurrentState(token);
    if (completed) {
      this.next(this.savedState);
      const callback = this.callback;
      this.callback = undefined;
      callback?.call(this);
    }
    this.lastToken = token;
    return this.toExit;
  };
  output.callbackCandidate = {
    probe: probeCallback(),
    analysis: Object.entries(samples).map(([filename, sourceCode]) => ({
      filename, functions: metrics(filename, sourceCode)
    })),
    nestedControl: metrics("nested.ts",
      'function nested(): string {\n  if (true) {\n    for (const value of [1]) {\n      if (true) { return "yes"; }\n    }\n  }\n  return "no";\n}\n' + tail)
  };
} finally {
  CodeStateMachine.prototype.consume = originalConsume;
}
console.log(JSON.stringify(output, null, 2));
