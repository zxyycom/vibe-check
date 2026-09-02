import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isPathWithin } from "../../../repository-files/paths.ts";
import { isAcceptedPackageDependencyVersion } from "../../dependency-version.ts";
import { CANDIDATE_DEPENDENCIES } from "../../package-contract.ts";
import { assertExternalConsumerCommandSucceeded } from "./command-result.ts";
import type { ExternalConsumerMaterial } from "./material.ts";
import {
  assertCandidateRunEvidence,
  type CandidateFixtureEvidence
} from "./runtime-evidence-assertions.ts";
import {
  isRecord,
  optionalOutcome,
  parseJsonRecord,
  readJsonRecord,
  requiredString
} from "./runtime-evidence-values.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** Verifies runtime dependency containment and package Run behavior. */
export function assertExternalConsumerRuntime(
  material: Pick<ExternalConsumerMaterial, "consumerDirectory" | "resolvedEntryPath">
): void {
  const jscpd = resolveCandidateJscpd(material.resolvedEntryPath);
  assert.equal(isPathWithin(material.consumerDirectory, jscpd.manifestPath), true);
  assert.equal(isPathWithin(repositoryRoot, jscpd.manifestPath), false);
  assert.equal(isPathWithin(material.consumerDirectory, jscpd.binPath), true);
  assert.equal(isPathWithin(repositoryRoot, jscpd.binPath), false);
  assert.equal(runJscpdEngine(jscpd.binPath), jscpd.version);
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
  const packageDirectory = dirname(manifestPath);
  const binPath = resolve(packageDirectory, declaredBin);
  assert.equal(
    isPathWithin(packageDirectory, binPath),
    true,
    `resolved jscpd bin escapes its package directory: ${binPath}`
  );
  assert.equal(existsSync(binPath), true, `resolved jscpd bin is missing at ${binPath}`);
  return Object.freeze({ binPath, manifestPath, version });
}

function declaredJscpdBin(bin: unknown): string | undefined {
  if (typeof bin === "string") return bin;
  if (!isRecord(bin)) return undefined;
  return requiredString(bin.jscpd, "resolved jscpd bin target");
}

function runJscpdEngine(binPath: string): string {
  const result = spawnSync(process.execPath, [binPath, "--version"], { encoding: "utf8" });
  assert.equal(result.error, undefined, "resolved jscpd engine did not start");
  assert.equal(result.status, 0, result.stderr);
  const version = result.stdout.trim().match(/(?:jscpd|cpd)\s+([^\s]+)/iu)?.[1];
  if (version === undefined) throw new TypeError("resolved jscpd engine returned no version");
  return version;
}

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
    cacheComputations: evidence.cacheComputations,
    changedFilesCalls: evidence.changedFilesCalls,
    blockedChangedFilesConsumer: evidence.blockedChangedFilesConsumer,
    blockedChangedFilesConsumerCalls: evidence.blockedChangedFilesConsumerCalls,
    firstCacheRead: evidence.firstCacheRead,
    secondCacheRead: evidence.secondCacheRead,
    changedFilesFromMachine: evidence.changedFilesFromMachine,
    changedFilesFromRun: evidence.changedFilesFromRun,
    duplicateData: evidence.duplicateData,
    duplicateOutcome,
    duplicateRecords: evidence.duplicateRecords,
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
