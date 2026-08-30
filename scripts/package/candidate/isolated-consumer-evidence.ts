import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { errorMessage } from "../../error-message.ts";
import { isPathWithin } from "../../repository-files/paths.ts";
import { isAcceptedPackageDependencyVersion } from "../dependency-version.ts";
import { CANDIDATE_DEPENDENCIES } from "../package-contract.ts";
import { assertExternalConsumerCommandSucceeded } from "./external-consumer-command-result.ts";
import type { ExternalConsumerMaterial } from "./isolated-consumer-material.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Verifies runtime dependency containment and package Run behavior. */
export function assertExternalConsumerRuntime(
  material: Pick<ExternalConsumerMaterial, "consumerDirectory" | "resolvedEntryPath">
): void {
  const jscpd = resolveCandidateJscpd(material.resolvedEntryPath);
  assert.equal(isPathWithin(material.consumerDirectory, jscpd.manifestPath), true);
  assert.equal(isPathWithin(repositoryRoot, jscpd.manifestPath), false);
  assert.equal(isPathWithin(material.consumerDirectory, jscpd.binPath), true);
  assert.equal(isPathWithin(repositoryRoot, jscpd.binPath), false);
  assert.equal(
    isAcceptedPackageDependencyVersion({
      requirement: { kind: "range", range: CANDIDATE_DEPENDENCIES.jscpd },
      resolvedVersion: jscpd.version
    }),
    true
  );
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

type CandidateFixtureEvidence = Readonly<{
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
  parserEvidence: unknown;
  secondChangedFilesConsumer: unknown;
}>;

function runCandidateFixture(consumerDirectory: string): CandidateFixtureEvidence {
  const output = candidateFixtureOutput(consumerDirectory);
  const evidence = output.evidence;
  const kind = requiredString(evidence.kind, "isolated Run kind");
  const duplicateOutcome = optionalOutcome(evidence.duplicateOutcome, "isolated duplicate outcome");
  const jsonSchemaOutcome = optionalOutcome(
    evidence.jsonSchemaOutcome,
    "isolated JSON Schema outcome"
  );
  const markdownLinkOutcome = optionalOutcome(
    evidence.markdownLinkOutcome,
    "isolated Markdown Link outcome"
  );
  return projectCandidateFixtureEvidence({
    evidence,
    humanOutput: output.humanOutput,
    kind,
    duplicateOutcome,
    jsonSchemaOutcome,
    markdownLinkOutcome
  });
}

function projectCandidateFixtureEvidence(
  input: Readonly<{
    readonly evidence: Readonly<Record<string, unknown>>;
    readonly humanOutput: string;
    readonly kind: string;
    readonly duplicateOutcome: string | null;
    readonly jsonSchemaOutcome: string | null;
    readonly markdownLinkOutcome: string | null;
  }>
): CandidateFixtureEvidence {
  const { evidence, humanOutput, kind, duplicateOutcome, jsonSchemaOutcome, markdownLinkOutcome } =
    input;
  return Object.freeze({
    checkMessages: evidence.checkMessages,
    checkDurations: evidence.checkDurations,
    changedFilesCalls: evidence.changedFilesCalls,
    changedFilesFromMachine: evidence.changedFilesFromMachine,
    changedFilesFromRun: evidence.changedFilesFromRun,
    duplicateData: evidence.duplicateData,
    duplicateOutcome,
    firstChangedFilesConsumer: evidence.firstChangedFilesConsumer,
    humanOutput: humanOutput,
    kind,
    machineSchemaVersion: evidence.machineSchemaVersion,
    jsonSchemaData: evidence.jsonSchemaData,
    jsonSchemaOutcome,
    markdownLinkData: evidence.markdownLinkData,
    markdownLinkOutcome,
    parserEvidence: evidence.parserEvidence,
    secondChangedFilesConsumer: evidence.secondChangedFilesConsumer
  });
}

function candidateFixtureOutput(consumerDirectory: string): Readonly<{
  readonly evidence: Readonly<Record<string, unknown>>;
  readonly humanOutput: string;
}> {
  const result = spawnSync(process.execPath, ["run-fixture.mjs", consumerDirectory], {
    cwd: consumerDirectory,
    encoding: "utf8"
  });
  assertExternalConsumerCommandSucceeded(result, "isolated candidate Run");
  const marker = "__VIBE_CHECK_ISOLATED_RUN__";
  const markerIndex = result.stdout.lastIndexOf(marker);
  assert.notEqual(markerIndex, -1, "isolated Run did not emit its evidence marker");
  return Object.freeze({
    evidence: parseJsonRecord(
      result.stdout.slice(markerIndex + marker.length),
      "isolated candidate Run output"
    ),
    humanOutput: result.stdout.slice(0, markerIndex)
  });
}

function optionalOutcome(value: unknown, description: string): string | null {
  if (value !== null && typeof value !== "string")
    throw new TypeError(`${description} must be a string or null`);
  return value;
}

function assertCandidateRunEvidence(runEvidence: ReturnType<typeof runCandidateFixture>): void {
  assert.equal(runEvidence.kind, "completed");
  assert.equal(runEvidence.duplicateOutcome, "passed");
  assert.deepEqual(runEvidence.duplicateData, { blockingFindingCount: 0, findingCount: 0 });
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
  assert.deepEqual(runEvidence.parserEvidence, {
    attachedJson: {
      invalidFileCount: 0,
      issueCount: 0,
      scannedFileCount: 0,
      validFileCount: 0
    },
    duplicate: { blockingFindingCount: 0, findingCount: 0 },
    file: { blockingFindingCount: 0, findingCount: 0 },
    function: { blockingFindingCount: 0, findingCount: 0 },
    json: { invalidFileCount: 0, issueCount: 0, scannedFileCount: 0, validFileCount: 0 },
    jsonSchema: {
      bindingCount: 0,
      blockedBindingCount: 0,
      invalidBindingCount: 0,
      issueCount: 0,
      issuesTruncated: false,
      reportedIssueCount: 0,
      schemaCount: 0,
      validBindingCount: 0
    },
    maintenance: { entries: [] },
    markdown: { findingCount: 0, occurrenceCount: 0, sourceFileCount: 0, targetReadCount: 0 }
  });
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
