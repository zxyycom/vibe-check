import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = "/home/dev/.codex/worktrees/d20e/vibe-check";
const REQUEST_PATH = resolve(
  ROOT,
  "docs/investigations/_resources/compare-lizard-python-typescript-performance/b-fixed-lizard-1.24-warmed-operation-full/representative-batch-request.json"
);
const OUTPUT_PATH = "/tmp/vibe-lizard-facade-acceptance.json";
const PORT_FACADE_PATH = resolve(
  ROOT,
  "src/package-checks/function-metrics/analyzer/port-facade.ts"
);
const CORE_PATH = resolve(ROOT, "src/package-checks/function-metrics/analyzer/core.ts");
const REGISTRY_PATH = resolve(ROOT, "src/package-checks/function-metrics/analyzer/reader-registry.ts");
const HARNESS_PATH = resolve(
  ROOT,
  "src/package-checks/function-metrics/analyzer/performance-harness.test-support.ts"
);

const { analyzeLizardSource } = await import(`${ROOT}/src/package-checks/function-metrics/analyzer/port-facade.ts`);
const { analyzeSourceCode } = await import(`${ROOT}/src/package-checks/function-metrics/analyzer/core.ts`);
const { get_reader_for } = await import(
  `${ROOT}/src/package-checks/function-metrics/analyzer/reader-registry.ts`
);

interface RequestFile {
  readonly path: string;
  readonly source: string;
}
interface Request {
  readonly files: readonly RequestFile[];
  readonly rootDir: string;
}
interface LizardFunction {
  readonly cyclomatic_complexity: number;
  readonly end_line: number;
  readonly filename: string;
  readonly name: string;
  readonly nloc: number;
  readonly parameter_count: number;
  readonly start_line: number;
}
interface Analysis {
  readonly function_list: readonly LizardFunction[];
}
interface Metric {
  readonly ccn: number;
  readonly endLine: number;
  readonly file: string;
  readonly name: string;
  readonly nloc: number;
  readonly parameterCount: number;
  readonly startLine: number;
}
interface Sample {
  readonly block: number;
  readonly condition: "before-original-facade" | "after-current-facade";
  readonly digest: string;
  readonly metricCount: number;
  readonly operationMs: number;
  readonly ordinal: number;
  readonly pattern: "ABBA" | "BAAB";
  readonly resultJsonBytes: number;
}

if (process.versions.bun !== "1.3.14")
  throw new Error(`This acceptance must use Bun 1.3.14; found ${process.versions.bun ?? "unknown"}`);

const requestBytes = readFileSync(REQUEST_PATH);
const request = JSON.parse(requestBytes.toString("utf8")) as Request;
assert.equal(request.files.length, 3456, "expected the 3,456-file representative request");

/** The old port façade path, including its function_list mapping/freezes, reconstructed verbatim. */
function analyzeBeforeOriginalFacade(files: readonly RequestFile[]): readonly Metric[] {
  const metrics: Metric[] = [];
  for (const file of files) {
    const reader = get_reader_for(file.path);
    if (reader === undefined) throw new Error(`unsupported benchmark source: ${file.path}`);

    const fileInformation = analyzeSourceCode(file.path, file.source, reader);
    const analysis: Analysis = Object.freeze({
      function_list: Object.freeze(
        fileInformation.function_list.map((functionInfo) =>
          Object.freeze({
            cyclomatic_complexity: functionInfo.cyclomatic_complexity,
            end_line: functionInfo.end_line,
            filename: functionInfo.filename,
            name: functionInfo.name,
            nloc: functionInfo.nloc,
            parameter_count: functionInfo.parameter_count,
            start_line: functionInfo.start_line
          })
        )
      )
    });
    appendBenchmarkMetrics(metrics, file.path, analysis);
  }
  return Object.freeze(metrics);
}

/** The current façade path, with exactly the same benchmark metric mapping/freezes as before. */
function analyzeAfterCurrentFacade(files: readonly RequestFile[]): readonly Metric[] {
  const metrics: Metric[] = [];
  for (const file of files) {
    const analysis = analyzeLizardSource({ filename: file.path, sourceCode: file.source });
    if (analysis === undefined) throw new Error(`unsupported benchmark source: ${file.path}`);
    appendBenchmarkMetrics(metrics, file.path, analysis);
  }
  return Object.freeze(metrics);
}

function appendBenchmarkMetrics(metrics: Metric[], path: string, analysis: Analysis): void {
  for (const functionInfo of analysis.function_list) {
    metrics.push(
      Object.freeze({
        ccn: functionInfo.cyclomatic_complexity,
        endLine: functionInfo.end_line,
        file: path,
        name: functionInfo.name,
        nloc: functionInfo.nloc,
        parameterCount: functionInfo.parameter_count,
        startLine: functionInfo.start_line
      })
    );
  }
}

function digest(value: unknown): { readonly jsonBytes: number; readonly sha256: string } {
  const json = JSON.stringify(value);
  return Object.freeze({
    jsonBytes: Buffer.byteLength(json),
    sha256: createHash("sha256").update(json).digest("hex")
  });
}

function runOperation(
  condition: Sample["condition"],
  block: number,
  ordinal: number,
  pattern: Sample["pattern"],
  expectedDigest: string
): Sample {
  const started = performance.now();
  const metrics =
    condition === "before-original-facade"
      ? analyzeBeforeOriginalFacade(request.files)
      : analyzeAfterCurrentFacade(request.files);
  const operationMs = performance.now() - started;
  const result = digest(metrics);
  assert.equal(result.sha256, expectedDigest, `${condition} output drift at sample ${ordinal}`);
  return Object.freeze({
    block,
    condition,
    digest: result.sha256,
    metricCount: metrics.length,
    operationMs,
    ordinal,
    pattern,
    resultJsonBytes: result.jsonBytes
  });
}

function summarize(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const at = (percentile: number) => sorted[Math.max(0, Math.ceil(sorted.length * percentile) - 1)]!;
  return Object.freeze({
    maxMs: sorted.at(-1)!,
    medianMs: at(0.5),
    minMs: sorted[0]!,
    p90Ms: at(0.9),
    valuesMs: Object.freeze([...values])
  });
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

// Preflight is intentionally outside all timed observations and verifies the exact full metric JSON.
const beforePreflight = analyzeBeforeOriginalFacade(request.files);
const afterPreflight = analyzeAfterCurrentFacade(request.files);
assert.deepStrictEqual(afterPreflight, beforePreflight, "before/after deep output preflight");
const beforeBytes = JSON.stringify(beforePreflight);
const afterBytes = JSON.stringify(afterPreflight);
assert.equal(afterBytes, beforeBytes, "before/after byte-identical JSON preflight");
const expected = digest(beforePreflight);
assert.equal(beforePreflight.length, 3456, "expected representative function count");

// Both paths receive two uncounted same-process warmed operations before the alternating sample sequence.
const warmups = [
  Object.freeze({ condition: "before-original-facade", result: digest(analyzeBeforeOriginalFacade(request.files)) }),
  Object.freeze({ condition: "after-current-facade", result: digest(analyzeAfterCurrentFacade(request.files)) }),
  Object.freeze({ condition: "before-original-facade", result: digest(analyzeBeforeOriginalFacade(request.files)) }),
  Object.freeze({ condition: "after-current-facade", result: digest(analyzeAfterCurrentFacade(request.files)) })
];
for (const warmup of warmups) assert.equal(warmup.result.sha256, expected.sha256, "warmup output drift");

const samples: Sample[] = [];
for (let block = 1; block <= 15; block += 1) {
  const pattern: Sample["pattern"] = block % 2 === 1 ? "ABBA" : "BAAB";
  const sequence: readonly Sample["condition"][] =
    pattern === "ABBA"
      ? ["before-original-facade", "after-current-facade", "after-current-facade", "before-original-facade"]
      : ["after-current-facade", "before-original-facade", "before-original-facade", "after-current-facade"];
  for (const condition of sequence)
    samples.push(runOperation(condition, block, samples.length + 1, pattern, expected.sha256));
}

const before = samples.filter((sample) => sample.condition === "before-original-facade");
const after = samples.filter((sample) => sample.condition === "after-current-facade");
assert.equal(before.length, 30);
assert.equal(after.length, 30);

const pairedBlocks = Array.from({ length: 15 }, (_, index) => {
  const block = index + 1;
  const beforeSamples = before.filter((sample) => sample.block === block);
  const afterSamples = after.filter((sample) => sample.block === block);
  assert.equal(beforeSamples.length, 2);
  assert.equal(afterSamples.length, 2);
  const beforeGeometricMeanMs = Math.sqrt(beforeSamples[0]!.operationMs * beforeSamples[1]!.operationMs);
  const afterGeometricMeanMs = Math.sqrt(afterSamples[0]!.operationMs * afterSamples[1]!.operationMs);
  return Object.freeze({
    afterGeometricMeanMs,
    beforeGeometricMeanMs,
    block,
    deltaMs: beforeGeometricMeanMs - afterGeometricMeanMs,
    pattern: beforeSamples[0]!.pattern,
    ratioBeforeOverAfter: beforeGeometricMeanMs / afterGeometricMeanMs
  });
});

const pairedSamples = pairedBlocks.flatMap(({ block, pattern }) => {
  const beforeSamples = before.filter((sample) => sample.block === block);
  const afterSamples = after.filter((sample) => sample.block === block);
  return [0, 1].map((index) =>
    Object.freeze({
      afterOrdinal: afterSamples[index]!.ordinal,
      afterMs: afterSamples[index]!.operationMs,
      beforeOrdinal: beforeSamples[index]!.ordinal,
      beforeMs: beforeSamples[index]!.operationMs,
      block,
      deltaMs: beforeSamples[index]!.operationMs - afterSamples[index]!.operationMs,
      pattern,
      ratioBeforeOverAfter: beforeSamples[index]!.operationMs / afterSamples[index]!.operationMs,
      withinConditionOccurrence: index + 1
    })
  );
});

const scriptPath = fileURLToPath(import.meta.url);
const output = Object.freeze({
  acceptance: Object.freeze({
    beforePath:
      "get_reader_for -> analyzeSourceCode -> original port-facade function_list map/Object.freeze -> performance-harness metric map/Object.freeze",
    afterPath:
      "analyzeLizardSource -> performance-harness metric map/Object.freeze",
    parity: "byte-identical JSON and deepStrictEqual before timing; SHA-256 checked after every timed operation",
    requiredBlocks: 15,
    sequence: "odd blocks ABBA, even blocks BAAB; each side has 30 timed samples",
    temperature: "same-process warmed operation; two uncounted full operations per side after preflight",
    timerScope:
      "performance.now encloses the selected façade path and benchmark metric mapping; request parse/import/preflight/warmup/digest calculation are outside the timed operation"
  }),
  environment: Object.freeze({
    arch: process.arch,
    bun: process.versions.bun,
    cpu: os.cpus()[0]?.model ?? "unknown",
    cpuCount: os.cpus().length,
    hostname: os.hostname(),
    kernel: os.release(),
    platform: process.platform,
    processExecPath: process.execPath,
    totalMemoryBytes: os.totalmem(),
    uname: execFileSync("uname", ["-a"], { encoding: "utf8" }).trim()
  }),
  identity: Object.freeze({
    coreSha256: sha256File(CORE_PATH),
    gitDirtyPorcelain: git("status", "--porcelain"),
    gitHead: git("rev-parse", "HEAD"),
    harnessSha256: sha256File(HARNESS_PATH),
    portFacadeSha256: sha256File(PORT_FACADE_PATH),
    registrySha256: sha256File(REGISTRY_PATH),
    requestPath: REQUEST_PATH,
    requestSha256: createHash("sha256").update(requestBytes).digest("hex"),
    script: basename(scriptPath),
    scriptSha256: sha256File(scriptPath),
    worktree: ROOT
  }),
  outputPreflight: Object.freeze({
    byteIdenticalJson: true,
    deepStrictEqual: true,
    digestSha256: expected.sha256,
    functionCount: beforePreflight.length,
    jsonBytes: expected.jsonBytes
  }),
  paired: Object.freeze({
    blocks: Object.freeze(pairedBlocks),
    blockDeltaMs: summarize(pairedBlocks.map((pair) => pair.deltaMs)),
    blockRatioBeforeOverAfter: summarize(pairedBlocks.map((pair) => pair.ratioBeforeOverAfter)),
    samples: Object.freeze(pairedSamples),
    sampleDeltaMs: summarize(pairedSamples.map((pair) => pair.deltaMs)),
    sampleRatioBeforeOverAfter: summarize(pairedSamples.map((pair) => pair.ratioBeforeOverAfter))
  }),
  rawSamples: Object.freeze(samples),
  results: Object.freeze({
    afterCurrentFacade: summarize(after.map((sample) => sample.operationMs)),
    beforeOriginalFacade: summarize(before.map((sample) => sample.operationMs))
  }),
  warmups: Object.freeze(warmups.map((warmup) => Object.freeze({
    condition: warmup.condition,
    digestSha256: warmup.result.sha256,
    jsonBytes: warmup.result.jsonBytes
  }))),
  warning: "Same-host/same-process evidence only; this is not a cross-host budget or a long-lived Product-session measurement."
});
writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ outputPath: OUTPUT_PATH, outputPreflight: output.outputPreflight, results: output.results, paired: output.paired }, null, 2));
