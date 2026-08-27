import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { errorMessage } from "../../error-message.ts";
import { isPathWithin } from "../../repository-files/paths.ts";
import { assertExternalConsumerCommandSucceeded } from "./external-consumer-command-result.ts";
import type { ExternalConsumerMaterial } from "./isolated-consumer-material.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const ISOLATED_JSON_SCHEMA_ID = "https://schemas.vibe-check.example/person";

/** Writes tool-resolution and Run-evidence inputs contributed by runtime acceptance. */
export function writeExternalConsumerRuntimeFixture(consumerDirectory: string): void {
  writeFileSync(join(consumerDirectory, "run-fixture.mjs"), runFixture(), "utf8");
  writeFileSync(join(consumerDirectory, "duplicate-a.ts"), duplicateSource(), "utf8");
  writeFileSync(join(consumerDirectory, "duplicate-b.ts"), duplicateSource(), "utf8");
  writeFileSync(
    join(consumerDirectory, "schema.json"),
    `${JSON.stringify({
      $id: ISOLATED_JSON_SCHEMA_ID,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      properties: { name: { type: "string" } },
      required: ["name"],
      type: "object"
    })}\n`,
    "utf8"
  );
  writeFileSync(join(consumerDirectory, "instance.json"), '{"name":"Ada"}\n', "utf8");
  writeFileSync(
    join(consumerDirectory, "link-source.md"),
    "[target](link-target.md#target)\n",
    "utf8"
  );
  writeFileSync(join(consumerDirectory, "link-target.md"), "# Target\n", "utf8");
}

/** Verifies runtime dependency containment and package Run behavior. */
export function assertExternalConsumerRuntime(
  material: Pick<ExternalConsumerMaterial, "consumerDirectory" | "resolvedEntryPath">
): void {
  const jscpd = resolveCandidateJscpd(material.resolvedEntryPath);
  assert.equal(isPathWithin(material.consumerDirectory, jscpd.manifestPath), true);
  assert.equal(isPathWithin(repositoryRoot, jscpd.manifestPath), false);
  assert.equal(isPathWithin(material.consumerDirectory, jscpd.binPath), true);
  assert.equal(isPathWithin(repositoryRoot, jscpd.binPath), false);
  assert.equal(jscpd.version, "5.0.11");
  assertCandidateRunEvidence(runCandidateFixture(material.consumerDirectory));
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

function runCandidateFixture(consumerDirectory: string): Readonly<{
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
  jsonSchemaData: unknown;
  jsonSchemaOutcome: string | null;
  markdownLinkData: unknown;
  markdownLinkOutcome: string | null;
  machineSchemaVersion: unknown;
  secondChangedFilesConsumer: unknown;
}> {
  const result = spawnSync(process.execPath, ["run-fixture.mjs", consumerDirectory], {
    cwd: consumerDirectory,
    encoding: "utf8"
  });
  assertExternalConsumerCommandSucceeded(result, "isolated candidate Run");
  const marker = "__VIBE_CHECK_ISOLATED_RUN__";
  const markerIndex = result.stdout.lastIndexOf(marker);
  assert.notEqual(markerIndex, -1, "isolated Run did not emit its evidence marker");
  const evidence = parseJsonRecord(
    result.stdout.slice(markerIndex + marker.length),
    "isolated candidate Run output"
  );
  const kind = requiredString(evidence.kind, "isolated Run kind");
  const duplicateOutcome = evidence.duplicateOutcome;
  if (duplicateOutcome !== null && typeof duplicateOutcome !== "string") {
    throw new TypeError("isolated duplicate outcome must be a string or null");
  }
  const jsonSchemaOutcome = evidence.jsonSchemaOutcome;
  if (jsonSchemaOutcome !== null && typeof jsonSchemaOutcome !== "string") {
    throw new TypeError("isolated JSON Schema outcome must be a string or null");
  }
  const markdownLinkOutcome = evidence.markdownLinkOutcome;
  if (markdownLinkOutcome !== null && typeof markdownLinkOutcome !== "string") {
    throw new TypeError("isolated Markdown Link outcome must be a string or null");
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
    jsonSchemaData: evidence.jsonSchemaData,
    jsonSchemaOutcome,
    markdownLinkData: evidence.markdownLinkData,
    markdownLinkOutcome,
    secondChangedFilesConsumer: evidence.secondChangedFilesConsumer
  });
}

function assertCandidateRunEvidence(runEvidence: ReturnType<typeof runCandidateFixture>): void {
  assert.equal(runEvidence.kind, "completed");
  assert.equal(runEvidence.duplicateOutcome, "passed");
  assert.deepEqual(runEvidence.duplicateData, { findingCount: 0 });
  assert.equal(runEvidence.jsonSchemaOutcome, "passed");
  assert.deepEqual(runEvidence.jsonSchemaData, {
    bindingCount: 1,
    blockedBindingCount: 0,
    invalidBindingCount: 0,
    issueCount: 0,
    issuesTruncated: false,
    reportedIssueCount: 0,
    schemaCount: 1,
    validBindingCount: 1
  });
  assert.equal(runEvidence.markdownLinkOutcome, "passed");
  assert.deepEqual(runEvidence.markdownLinkData, {
    findingCount: 0,
    occurrenceCount: 1,
    sourceFileCount: 2,
    targetReadCount: 1
  });
  assert.equal(runEvidence.changedFilesCalls, 1);
  assert.deepEqual(runEvidence.changedFilesFromMachine, {
    files: ["src/duplicate-a.ts", "src/duplicate-b.ts"],
    version: 1
  });
  assert.deepEqual(runEvidence.changedFilesFromRun, runEvidence.changedFilesFromMachine);
  assert.deepEqual(runEvidence.firstChangedFilesConsumer, { fileCount: 2 });
  assert.deepEqual(runEvidence.secondChangedFilesConsumer, { firstFile: "src/duplicate-a.ts" });
  assert.equal(runEvidence.machineSchemaVersion, "vibe-check.run.v4");
  assert.deepEqual(runEvidence.checkMessages, [
    {
      checkId: "installed-terminal-note",
      code: "installed-terminal-note",
      level: "info",
      message: "Installed candidate terminal message."
    }
  ]);
  assert.match(runEvidence.humanOutput, /total\s+8\s+checks/i);
  assert.match(runEvidence.humanOutput, /Checks:/);
  assert.match(runEvidence.humanOutput, /\[1\/8\].*duplicate detection/i);
  assert.match(runEvidence.humanOutput, /\[8\/8\].*Installed terminal note/i);
  assert.match(runEvidence.humanOutput, /\[info\] Installed candidate terminal message\./);
  assert.match(runEvidence.humanOutput, /Execution summary:/);
  assert.equal(runEvidence.humanOutput.includes("\u001B"), false);
  for (const checkId of [
    "duplicate-detection",
    "json-schema-validation",
    "markdown-link-validation",
    "changed-files",
    "first-changed-files-consumer",
    "second-changed-files-consumer",
    "installed-terminal-note"
  ]) {
    assertCanonicalExecutedDuration(runEvidence.checkDurations, checkId);
  }
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

function runFixture(): string {
  return `import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  defineCheck,
  defineConfig,
  duplicateDetection,
  jsonSchemaValidation,
  jsonValidation,
  markdownLinkValidation,
  run
} from "vibe-check";

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
      jsonValidation,
      {
        ...jsonSchemaValidation,
        options: {
          ...jsonSchemaValidation.options,
          bindings: [
            {
              id: "person",
              instancePath: "instance.json",
              schemaId: "${ISOLATED_JSON_SCHEMA_ID}"
            }
          ],
          schemas: [
            { id: "${ISOLATED_JSON_SCHEMA_ID}", path: "schema.json" }
          ]
        }
      },
      markdownLinkValidation,
      changedFiles,
      firstChangedFilesConsumer,
      secondChangedFilesConsumer,
      terminalNote
    ],
    outputs: {
      machinePublication: { directory: "machine-output", enabled: true }
    },
    scheduler: { maxParallel: 1 }
  }),
  { projectRoot }
);
const duplicate = result.kind === "completed"
  ? result.snapshot.checks.find((check) => check.checkId === "duplicate-detection")
  : undefined;
const jsonSchemaCheck = result.kind === "completed"
  ? result.snapshot.checks.find((check) => check.checkId === "json-schema-validation")
  : undefined;
const markdownLink = result.kind === "completed"
  ? result.snapshot.checks.find((check) => check.checkId === "markdown-link-validation")
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
  duplicateOutcome: duplicate?.outcome.status ?? null,
  jsonSchemaData: settledFinalData(jsonSchemaCheck),
  jsonSchemaOutcome: jsonSchemaCheck?.outcome.status ?? null,
  markdownLinkData: settledFinalData(markdownLink),
  markdownLinkOutcome: markdownLink?.outcome.status ?? null
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
