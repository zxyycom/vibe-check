import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "node:test";

import { CURRENT_PUBLIC_CONTRACT } from "../../src/product/public-contract/current.ts";
import { preparePackageCandidate } from "./index.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const tsgoPath = resolve(repositoryRoot, "node_modules/@typescript/native-preview/bin/tsgo.js");

it("accepts a candidate in an external consumer", { timeout: 20_000 }, async () => {
  const accepted = await preparePackageCandidate();
  const reused = await preparePackageCandidate();
  assert.equal(reused.reused, true);
  assert.equal(reused.artifactPath, accepted.artifactPath);
  assert.equal(reused.sha256, accepted.sha256);
  assert.equal(isAbsolute(accepted.artifactPath), true);

  const consumerDirectory = mkdtempSync(join(tmpdir(), "vibe-check-isolated-consumer-"));
  try {
    assert.equal(isWithin(repositoryRoot, consumerDirectory), false);
    writeConsumerFiles(consumerDirectory);
    installCandidate(consumerDirectory, accepted.artifactPath);

    const resolvedEntryPath = resolvePublicEntry(consumerDirectory);
    const installedPackageDirectory = join(consumerDirectory, "node_modules", "vibe-check");
    assert.equal(isWithin(installedPackageDirectory, resolvedEntryPath), true);
    assert.equal(isWithin(repositoryRoot, resolvedEntryPath), false);

    typecheckPublicImports(consumerDirectory);
    const jscpd = resolveCandidateJscpd(resolvedEntryPath);
    assert.equal(isWithin(consumerDirectory, jscpd.manifestPath), true);
    assert.equal(isWithin(repositoryRoot, jscpd.manifestPath), false);
    assert.equal(isWithin(consumerDirectory, jscpd.binPath), true);
    assert.equal(isWithin(repositoryRoot, jscpd.binPath), false);
    assert.equal(jscpd.version, "5.0.11");

    const runEvidence = runDuplicateFixture(consumerDirectory);
    assert.equal(runEvidence.kind, "completed");
    assert.equal(runEvidence.duplicateOutcome, "passed");
    assert.deepEqual(runEvidence.duplicateData, { findingCount: 0 });
    assert.equal(runEvidence.changedFilesCalls, 1);
    assert.deepEqual(runEvidence.changedFilesFromMachine, {
      files: ["src/duplicate-a.ts", "src/duplicate-b.ts"],
      version: 1
    });
    assert.deepEqual(runEvidence.changedFilesFromRun, runEvidence.changedFilesFromMachine);
    assert.deepEqual(runEvidence.firstChangedFilesConsumer, { fileCount: 2 });
    assert.deepEqual(runEvidence.secondChangedFilesConsumer, {
      firstFile: "src/duplicate-a.ts"
    });
    assert.equal(runEvidence.machineSchemaVersion, "vibe-check.run.v4");
    assert.deepEqual(runEvidence.checkMessages, [
      {
        checkId: "installed-terminal-note",
        code: "installed-terminal-note",
        level: "info",
        message: "Installed candidate terminal message."
      }
    ]);
    assert.match(runEvidence.humanOutput, /total\s+5\s+checks/i);
    assert.match(runEvidence.humanOutput, /Checks:/);
    assert.match(runEvidence.humanOutput, /\[1\/5\].*duplicate detection/i);
    assert.match(runEvidence.humanOutput, /\[5\/5\].*Installed terminal note/i);
    assert.match(runEvidence.humanOutput, /\[info\] Installed candidate terminal message\./);
    assert.match(runEvidence.humanOutput, /Execution summary:/);
    assert.equal(runEvidence.humanOutput.includes("\u001B"), false);
    assertCanonicalExecutedDuration(runEvidence.checkDurations, "duplicate-detection");
    assertCanonicalExecutedDuration(runEvidence.checkDurations, "changed-files");
    assertCanonicalExecutedDuration(runEvidence.checkDurations, "first-changed-files-consumer");
    assertCanonicalExecutedDuration(runEvidence.checkDurations, "second-changed-files-consumer");
    assertCanonicalExecutedDuration(runEvidence.checkDurations, "installed-terminal-note");
  } finally {
    rmSync(consumerDirectory, { force: true, recursive: true });
  }
});

function writeConsumerFiles(consumerDirectory: string): void {
  writeFileSync(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify({ name: "vibe-check-isolated-consumer", private: true, type: "module" })}\n`,
    "utf8"
  );
  writeFileSync(join(consumerDirectory, "tsconfig.json"), typecheckConfig(), "utf8");
  writeFileSync(join(consumerDirectory, "public-imports.ts"), publicImports(), "utf8");
  writeFileSync(join(consumerDirectory, "run-fixture.mjs"), runFixture(), "utf8");
  writeFileSync(join(consumerDirectory, "duplicate-a.ts"), duplicateSource(), "utf8");
  writeFileSync(join(consumerDirectory, "duplicate-b.ts"), duplicateSource(), "utf8");
}

function installCandidate(consumerDirectory: string, artifactPath: string): void {
  const result = spawnSync(
    process.execPath,
    ["install", "--no-save", "--ignore-scripts", artifactPath],
    { cwd: consumerDirectory, encoding: "utf8" }
  );
  assertCommandSucceeded(result, "isolated bun install");
}

function resolvePublicEntry(consumerDirectory: string): string {
  const result = spawnSync(
    process.execPath,
    ["-e", "process.stdout.write(import.meta.resolve(process.argv[1]))", "vibe-check"],
    { cwd: consumerDirectory, encoding: "utf8" }
  );
  assertCommandSucceeded(result, "isolated public-entry resolution");
  const resolved = result.stdout.trim();
  assert.equal(resolved.startsWith("file:"), true, `expected file URL, received ${resolved}`);
  return fileURLToPath(resolved);
}

function typecheckPublicImports(consumerDirectory: string): void {
  assert.equal(existsSync(tsgoPath), true, `repository-pinned tsgo is missing at ${tsgoPath}`);
  const result = spawnSync(process.execPath, [tsgoPath, "--project", "tsconfig.json"], {
    cwd: consumerDirectory,
    encoding: "utf8"
  });
  assertCommandSucceeded(result, "isolated public-import typecheck");
}

function resolveCandidateJscpd(candidateEntryPath: string): Readonly<{
  binPath: string;
  manifestPath: string;
  version: string;
}> {
  const manifestPath = createRequire(candidateEntryPath).resolve("jscpd/package.json");
  const manifest = readJsonRecord(manifestPath, "resolved jscpd manifest");
  const version = requiredString(manifest.version, "resolved jscpd version");
  const declaredBin = declaredJscpdBin(manifest.bin);
  if (declaredBin === undefined) {
    throw new TypeError("resolved jscpd manifest does not declare a jscpd bin");
  }
  const binPath = resolve(dirname(manifestPath), declaredBin);
  assert.equal(existsSync(binPath), true, `resolved jscpd bin is missing at ${binPath}`);
  return Object.freeze({ binPath, manifestPath, version });
}

function declaredJscpdBin(bin: unknown): string | undefined {
  if (typeof bin === "string") return bin;
  if (!isRecord(bin)) return undefined;
  return requiredString(bin.jscpd, "resolved jscpd bin target");
}

function runDuplicateFixture(consumerDirectory: string): Readonly<{
  checkMessages: unknown;
  checkDurations: unknown;
  changedFilesCalls: unknown;
  changedFilesFromMachine: unknown;
  changedFilesFromRun: unknown;
  duplicateData: unknown;
  duplicateOutcome: string | null;
  firstChangedFilesConsumer: unknown;
  humanOutput: string;
  kind: string;
  machineSchemaVersion: unknown;
  secondChangedFilesConsumer: unknown;
}> {
  const result = spawnSync(process.execPath, ["run-fixture.mjs", consumerDirectory], {
    cwd: consumerDirectory,
    encoding: "utf8"
  });
  assertCommandSucceeded(result, "isolated duplicate-detection Run");
  const marker = "__VIBE_CHECK_ISOLATED_RUN__";
  const markerIndex = result.stdout.lastIndexOf(marker);
  assert.notEqual(markerIndex, -1, "isolated Run did not emit its evidence marker");
  const evidence = parseJsonRecord(
    result.stdout.slice(markerIndex + marker.length),
    "isolated duplicate-detection Run output"
  );
  const kind = requiredString(evidence.kind, "isolated Run kind");
  const duplicateOutcome = evidence.duplicateOutcome;
  if (duplicateOutcome !== null && typeof duplicateOutcome !== "string") {
    throw new TypeError("isolated duplicate outcome must be a string or null");
  }
  return Object.freeze({
    checkMessages: evidence.checkMessages,
    checkDurations: evidence.checkDurations,
    changedFilesCalls: evidence.changedFilesCalls,
    changedFilesFromMachine: evidence.changedFilesFromMachine,
    changedFilesFromRun: evidence.changedFilesFromRun,
    duplicateData: evidence.duplicateData,
    duplicateOutcome,
    firstChangedFilesConsumer: evidence.firstChangedFilesConsumer,
    humanOutput: result.stdout.slice(0, markerIndex),
    kind,
    machineSchemaVersion: evidence.machineSchemaVersion,
    secondChangedFilesConsumer: evidence.secondChangedFilesConsumer
  });
}

function assertCanonicalExecutedDuration(checkDurations: unknown, checkId: string): void {
  if (!isUnknownArray(checkDurations)) {
    throw new TypeError("isolated Run checkDurations must be an array");
  }
  const duration = checkDurations.find(
    (candidate): candidate is Readonly<Record<string, unknown>> =>
      isRecord(candidate) && candidate.checkId === checkId
  );
  assert.notEqual(duration, undefined, `isolated Run duration is missing for ${checkId}`);
  if (!isRecord(duration)) throw new TypeError("isolated Run duration must be an object");
  assert.equal(duration.checkId, checkId);
  if (typeof duration.durationMs !== "number") {
    throw new TypeError("isolated Run durationMs must be a number");
  }
  assert.equal(Number.isFinite(duration.durationMs), true);
  assert.equal(duration.durationMs >= 0, true);
}

function assertCommandSucceeded(result: SpawnSyncReturns<string>, description: string): void {
  assert.equal(result.error, undefined, `${description} could not start: ${result.error?.message}`);
  assert.equal(result.signal, null, `${description} was terminated by ${result.signal}`);
  assert.equal(
    result.status,
    0,
    `${description} failed with exit ${String(result.status)}:\n${result.stderr || result.stdout}`
  );
}

function readJsonRecord(path: string, description: string): Readonly<Record<string, unknown>> {
  return parseJsonRecord(readFileSync(path, "utf8"), description);
}

function parseJsonRecord(source: string, description: string): Readonly<Record<string, unknown>> {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error: unknown) {
    throw new Error(`${description} is not JSON: ${errorMessage(error)}`, { cause: error });
  }
  if (!isRecord(value)) throw new TypeError(`${description} must be an object`);
  return value;
}

function requiredString(value: unknown, description: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${description} must be a non-empty string`);
  }
  return value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isWithin(parent: string, child: string): boolean {
  const pathFromParent = relative(resolve(parent), resolve(child));
  return (
    pathFromParent.length > 0 &&
    pathFromParent !== ".." &&
    !pathFromParent.startsWith(`..${sep}`) &&
    !isAbsolute(pathFromParent)
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function typecheckConfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        module: "nodenext",
        moduleResolution: "nodenext",
        noEmit: true,
        strict: true,
        target: "esnext",
        verbatimModuleSyntax: true
      },
      include: ["public-imports.ts"]
    },
    null,
    2
  )}\n`;
}

function publicImports(): string {
  const typeImports = Object.values(CURRENT_PUBLIC_CONTRACT.types)
    .sort((left, right) => left.localeCompare(right))
    .map((name) => `  type ${name}`)
    .join(",\n");
  return `import {
  defineCheck,
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  inherit,
  run,
${typeImports}
} from "vibe-check";

const directCheck = defineCheck({
  checkId: "isolated-public-import",
  displayName: "Isolated public import",
  execution: (context) => {
    const selected = context.project.flags.includes("isolated-consumer");
    context.records.report({ id: "selection" }, { selected });
    return selected
      ? { status: "passed", data: { selected } }
      : { status: "failed", data: { selected } };
  }
});
interface ChangedFilesData {
  readonly files: readonly string[];
  readonly version: 1;
}

const changedFilesData: ChangedFilesData = {
  files: ["src/duplicate-a.ts", "src/duplicate-b.ts"],
  version: 1
};

const changedFiles = defineCheck({
  checkId: "isolated-changed-files",
  displayName: "Isolated changed files",
  parseData(data): ChangedFilesData {
    if (
      data.version !== 1 ||
      !Array.isArray(data.files) ||
      !data.files.every((value): value is string => typeof value === "string")
    ) {
      throw new TypeError("Unsupported isolated changed-files data");
    }
    return { files: data.files, version: 1 };
  },
  execution: () => ({
    status: "passed",
    data: changedFilesData
  })
});

const asyncChangedFilesParser = async (
  _data: Readonly<Record<string, unknown>>
): Promise<ChangedFilesData> => changedFilesData;
defineCheck({
  checkId: "isolated-async-provider",
  displayName: "Isolated async provider",
  execution: () => ({ status: "passed", data: changedFilesData }),
  // @ts-expect-error emitted provider declarations require a synchronous parser.
  parseData: asyncChangedFilesParser
});

const changedFilesConsumer = defineCheck({
  checkId: "isolated-changed-files-consumer",
  displayName: "Isolated changed-files consumer",
  dependsOn: [changedFiles.checkId],
  execution: ({ dependencies }) => {
    const read = dependencies.get(changedFiles.checkId);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };
    const parsedChangedFiles = changedFiles.parseData(read.data);
    return { status: read.status, data: { fileCount: parsedChangedFiles.files.length } };
  }
});

const definition: ProjectDefinition = defineConfig({
  checks: [duplicateDetection, directCheck, changedFiles, changedFilesConsumer]
});
const inheritedCheckIds = inherit({ add: [directCheck.checkId] });
const aggregation: CheckAggregation = {
  checks: [directCheck.checkId],
  empty: "failed",
  mode: "all",
  notApplicable: "fail",
  unavailable: "propagate"
};
const result: Promise<RunResult> = run(definition, {
  checkAggregation: aggregation,
  flags: ["isolated-consumer"]
});

const authorResult: CheckResult = { status: "passed", data: new Date() };
const messagedResult: CheckResult = {
  status: "not-applicable",
  messages: [{ code: "not-required", level: "info", message: "Not required" }]
};
const attentionCheck: Check = {
  checkId: "isolated-attention",
  displayName: "Isolated attention",
  execution: () => messagedResult,
  visibility: "attention"
};
const settledOutcome: CheckOutcome = { status: "passed", data: { selected: true } };
if (settledOutcome.status === "passed") {
  // @ts-expect-error Settled Run outcomes expose readonly canonical data.
  settledOutcome.data.selected = false;
}

function observeFinalDurations(runResult: RunResult): void {
  if (
    runResult.kind === "completed" ||
    runResult.kind === "effect" ||
    (runResult.kind === "cancelled" && runResult.phase === "execution")
  ) {
    const durations: readonly Readonly<{ readonly checkId: string; readonly durationMs: number | null }>[] =
      runResult.checkDurations;
    const messages: readonly Readonly<{
      readonly checkId: string;
      readonly code: string;
      readonly level: "info" | "warning" | "error";
      readonly message: string;
    }>[] = runResult.checkMessages;
    void durations;
    void messages;
    if (runResult.kind === "completed" || runResult.kind === "effect") {
      const aggregate: CheckAggregate | null = runResult.aggregate;
      void aggregate;
    }
  }
}

void [
  defineCheck,
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  inherit,
  run,
  aggregation,
  attentionCheck,
  authorResult,
  changedFiles,
  changedFilesData,
  changedFilesConsumer,
  inheritedCheckIds,
  observeFinalDurations,
  result
];
`;
}

function runFixture(): string {
  return `import { readFileSync } from "node:fs";
import { join } from "node:path";

import { defineCheck, defineConfig, duplicateDetection, run } from "vibe-check";

const projectRoot = process.argv[2];
if (projectRoot === undefined) throw new Error("fixture project root is required");

const terminalNote = defineCheck({
  checkId: "installed-terminal-note",
  displayName: "Installed terminal note",
  visibility: "attention",
  execution: () => ({
    status: "passed",
    data: {},
    messages: [
      {
        code: "installed-terminal-note",
        level: "info",
        message: "Installed candidate terminal message."
      }
    ]
  })
});

let changedFilesCalls = 0;
const changedFiles = defineCheck({
  checkId: "changed-files",
  displayName: "Changed files",
  parseData(data) {
    if (
      data.version !== 1 ||
      !Array.isArray(data.files) ||
      !data.files.every((value) => typeof value === "string")
    ) {
      throw new TypeError("Unsupported changed-files data");
    }
    return { files: data.files, version: 1 };
  },
  execution: () => {
    changedFilesCalls += 1;
    return {
      status: "passed",
      data: { files: ["src/duplicate-a.ts", "src/duplicate-b.ts"], version: 1 }
    };
  }
});

const firstChangedFilesConsumer = defineCheck({
  checkId: "first-changed-files-consumer",
  displayName: "First changed-files consumer",
  dependsOn: [changedFiles.checkId],
  execution: ({ dependencies }) => {
    const read = dependencies.get(changedFiles.checkId);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };
    const parsedChangedFiles = changedFiles.parseData(read.data);
    return { status: read.status, data: { fileCount: parsedChangedFiles.files.length } };
  }
});

const secondChangedFilesConsumer = defineCheck({
  checkId: "second-changed-files-consumer",
  displayName: "Second changed-files consumer",
  dependsOn: [changedFiles.checkId],
  execution: ({ dependencies }) => {
    const read = dependencies.get(changedFiles.checkId);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };
    const parsedChangedFiles = changedFiles.parseData(read.data);
    return { status: read.status, data: { firstFile: parsedChangedFiles.files[0] } };
  }
});

const result = await run(
  defineConfig({
    checks: [
      {
        ...duplicateDetection,
        options: {
          ...duplicateDetection.options,
          defaultMinimumTokens: 20
        }
      },
      changedFiles,
      firstChangedFilesConsumer,
      secondChangedFilesConsumer,
      terminalNote
    ],
    effects: {
      cache: { enabled: false },
      output: { directory: "machine-output", enabled: true }
    },
    scheduler: { maxParallel: 1 }
  }),
  { projectRoot }
);
const duplicate = result.kind === "completed"
  ? result.snapshot.checks.find((check) => check.checkId === "duplicate-detection")
  : undefined;
const runChangedFilesCheck = result.kind === "completed"
  ? result.snapshot.checks.find((check) => check.checkId === changedFiles.checkId)
  : undefined;
const publishedRun = JSON.parse(readFileSync(join(projectRoot, "machine-output/run.json"), "utf8"));
const publishedChangedFilesCheck = publishedRun.checks.find(
  (check) => check.checkId === changedFiles.checkId
);
const parsedChangedFilesFromMachine = changedFiles.parseData(
  publishedChangedFilesCheck.outcome.data
);
const parsedChangedFilesFromRun = runChangedFilesCheck?.outcome.status === "passed"
  ? changedFiles.parseData(runChangedFilesCheck.outcome.data)
  : null;
const firstConsumerCheck = result.kind === "completed"
  ? result.snapshot.checks.find((check) => check.checkId === firstChangedFilesConsumer.checkId)
  : undefined;
const secondConsumerCheck = result.kind === "completed"
  ? result.snapshot.checks.find((check) => check.checkId === secondChangedFilesConsumer.checkId)
  : undefined;

function settledFinalData(check) {
  if (check?.outcome.status !== "passed" && check?.outcome.status !== "failed") return null;
  return check.outcome.data;
}

process.stdout.write("__VIBE_CHECK_ISOLATED_RUN__" + JSON.stringify({
  checkMessages: result.kind === "completed" ? result.checkMessages : null,
  checkDurations: result.kind === "completed" ? result.checkDurations : null,
  changedFilesCalls,
  changedFilesFromMachine: parsedChangedFilesFromMachine,
  changedFilesFromRun: parsedChangedFilesFromRun,
  kind: result.kind,
  firstChangedFilesConsumer: settledFinalData(firstConsumerCheck),
  machineSchemaVersion: publishedRun.schemaVersion,
  secondChangedFilesConsumer: settledFinalData(secondConsumerCheck),
  duplicateData: settledFinalData(duplicate),
  duplicateOutcome: duplicate?.outcome.status ?? null
}));
`;
}

function duplicateSource(): string {
  return `export function duplicateExample(value: number): number {
  let total = value;
  total += 1;
  total += 2;
  total += 3;
  total += 4;
  total += 5;
  total += 6;
  total += 7;
  total += 8;
  total += 9;
  total += 10;
  total += 11;
  total += 12;
  total += 13;
  total += 14;
  total += 15;
  return total;
}
`;
}
