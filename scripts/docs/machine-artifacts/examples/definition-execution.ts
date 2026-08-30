import path from "node:path";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { createJiti } from "jiti";

import * as packageApi from "../../../../src/index.ts";
import { createPublicationModelV4 } from "../../../../src/machine-output/v4/publication-model.ts";
import { projectMachinePublicationV4 } from "../../../../src/machine-output/v4/projection.ts";
import { validateProjectDefinition } from "../../../../src/project-definition/project-definition-validation.ts";
import { isNonArrayRecord } from "../../../value-guards.ts";
import {
  FIXED_MACHINE_EXAMPLE_INVOCATION,
  MACHINE_EXAMPLE_DEFINITION_PATH,
  type CanonicalMachineExample
} from "./contract.ts";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const definitionLoader = createJiti(import.meta.url, {
  fsCache: false,
  moduleCache: false,
  tryNative: false,
  virtualModules: { "vibe-check": packageApi }
});
const exampleProjectManifest = '{"name":"vibe-check-machine-example","private":true}\n';
const expectedCheckOutcomes = [
  { checkId: "example-external-review", status: "unavailable" },
  { checkId: "example-optional-documentation", status: "not-applicable" },
  { checkId: "example-release-inputs", status: "passed" },
  { checkId: "example-release-policy", status: "failed" },
  { checkId: "json-validation", status: "passed" }
] as const satisfies readonly Readonly<{
  checkId: string;
  status: packageApi.CheckOutcome["status"];
}>[];
type ExampleSnapshot = Awaited<ReturnType<typeof executeExampleDefinition>>;

/** Executes the public example Definition through the complete public Run boundary. */
export async function buildCanonicalMachineExample(): Promise<CanonicalMachineExample> {
  const definition = loadExampleDefinition();
  assertExampleOutputConfiguration(definition);
  const snapshot = await executeExampleDefinition(definition);
  assertExampleFacts(snapshot);
  const model = createPublicationModelV4({
    invocation: FIXED_MACHINE_EXAMPLE_INVOCATION,
    snapshot
  });
  return Object.freeze({ model, publication: projectMachinePublicationV4(model) });
}

function loadExampleDefinition(): packageApi.ProjectDefinition {
  const definitionPath = path.join(workspaceRoot, MACHINE_EXAMPLE_DEFINITION_PATH);
  const loaded: unknown = definitionLoader.evalModule(readFileSync(definitionPath, "utf8"), {
    filename: definitionPath
  });
  const candidate = isNonArrayRecord(loaded) ? loaded.default : undefined;
  const validation = validateProjectDefinition(candidate);
  if (!validation.ok) {
    throw new Error(
      `machine example Definition is invalid at ${validation.error.path}: ${validation.error.reason}`
    );
  }
  return validation.value;
}

function assertExampleOutputConfiguration(definition: packageApi.ProjectDefinition): void {
  const machine = definition.outputs.machinePublication;
  if (
    !machine.enabled ||
    machine.directory !== "artifacts/vibe-check" ||
    definition.outputs.progressRendering.enabled
  ) {
    throw new Error(
      "machine example Definition must publish to artifacts/vibe-check with progress disabled"
    );
  }
}

async function executeExampleDefinition(definition: packageApi.ProjectDefinition) {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "vibe-check-machine-example-"));
  writeFileSync(path.join(projectRoot, "package.json"), exampleProjectManifest, "utf8");
  try {
    const result = await packageApi.run(definition, {
      outputs: {
        machinePublication: { enabled: false },
        progressRendering: { enabled: false }
      },
      projectRoot
    });
    if (result.kind !== "completed") {
      throw new Error(`machine example Run did not complete: ${result.kind}`);
    }
    if (result.definitionWarnings.length !== 0) {
      throw new Error("machine example Definition must not produce authoring warnings");
    }
    assertExampleMessages(result.checkMessages);
    return result.snapshot;
  } finally {
    rmSync(projectRoot, { force: true, recursive: true });
  }
}

function assertExampleMessages(messages: ReadonlyArray<Readonly<{ readonly code: string }>>): void {
  const codes = new Set(messages.map(({ code }) => code));
  for (const code of [
    "default-release-input",
    "release-policy-failed",
    "review-service-unconfigured"
  ]) {
    if (!codes.has(code)) throw new Error(`machine example Run is missing message: ${code}`);
  }
  if (messages.length !== codes.size || messages.length !== 3) {
    throw new Error("machine example Run must produce exactly three distinct messages");
  }
}

function assertExampleFacts(snapshot: ExampleSnapshot): void {
  assertExampleOutcomeStatuses(snapshot);
  assertExpectedExampleCheckOutcomes(snapshot);
  assertExampleSnapshotCardinality(snapshot);
  assertExampleJsonValidation(snapshot);
  assertExampleRecords(snapshot);
}

function assertExampleOutcomeStatuses(snapshot: ExampleSnapshot): void {
  const statuses = new Set(snapshot.checks.map(({ outcome }) => outcome.status));
  for (const status of ["passed", "failed", "not-applicable", "unavailable"] as const) {
    if (!statuses.has(status)) {
      throw new Error(`machine example Definition is missing ${status} outcome`);
    }
  }
}

function assertExpectedExampleCheckOutcomes(snapshot: ExampleSnapshot): void {
  for (const expected of expectedCheckOutcomes) {
    const receivedStatus = exampleCheckOutcomeStatus(snapshot, expected.checkId);
    if (receivedStatus !== expected.status) {
      throw new Error(
        `machine example Check ${expected.checkId} must be ${expected.status}; received ${receivedStatus ?? "missing"}`
      );
    }
  }
}

function exampleCheckOutcomeStatus(
  snapshot: ExampleSnapshot,
  checkId: string
): packageApi.CheckOutcome["status"] | undefined {
  return snapshot.checks.find((check) => check.checkId === checkId)?.outcome.status;
}

function assertExampleSnapshotCardinality(snapshot: ExampleSnapshot): void {
  if (snapshot.checks.length !== expectedCheckOutcomes.length || snapshot.records.length !== 2) {
    throw new Error("machine example Definition must produce five Checks and two Records");
  }
}

function assertExampleJsonValidation(snapshot: ExampleSnapshot): void {
  const jsonCheck = snapshot.checks.find(({ checkId }) => checkId === "json-validation");
  if (
    jsonCheck?.outcome.status !== "passed" ||
    jsonCheck.outcome.data.scannedFileCount !== 1 ||
    jsonCheck.outcome.data.invalidFileCount !== 0 ||
    jsonCheck.outcome.data.rejectedInputCount !== 0
  ) {
    throw new Error("machine example built-in JSON validation did not validate one manifest");
  }
}

function assertExampleRecords(snapshot: ExampleSnapshot): void {
  if (
    snapshot.records.some(({ checkId }) => checkId !== "example-release-policy") ||
    !snapshot.records.some(({ id }) => id === "minimum-file-count") ||
    !snapshot.records.some(({ id }) => id === "selected:package.json")
  ) {
    throw new Error("machine example Records must describe release-policy inputs and threshold");
  }
}
