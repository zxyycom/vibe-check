import assert from "node:assert/strict";

import {
  commandCheck,
  defineConfig,
  run,
  type AfterCommand,
  type ProjectDefinition,
  type RunResult
} from "@zxyycom/vibe-check";

/** Acceptance-only output policy; the independently projected Definitions keep their defaults. */
export const quietControls = {
  outputs: {
    diagnosticLogging: { enabled: false },
    progressRendering: { enabled: false }
  }
};

export function completed(result: RunResult) {
  if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
  return result;
}

/** Read facts in the example's declared order, not the snapshot's presentation order. */
export function checkStatusesFor(definition: ProjectDefinition) {
  return (result: RunResult) => {
    const facts = completed(result).snapshot.checks;
    return definition.checks.map(
      ({ checkId }) => facts.find((fact) => fact.checkId === checkId)?.outcome.status
    );
  };
}

/** Both adapters promise this same projection and reject a whole group before reporting. */
export async function assertConfigurationDiagnostics(
  input: Readonly<{
    afterCommand: Pick<
      AfterCommand<{ exitCode: number; diagnosticsAvailable?: boolean }>,
      "execute"
    >;
    definition: ProjectDefinition;
    invalidOutputs: readonly string[];
  }>
) {
  const statuses = checkStatusesFor(input.definition);
  const valid = completed(await run(input.definition, quietControls));
  assert.equal(valid.aggregate, "failed");
  assert.deepEqual(statuses(valid), ["failed"]);
  assert.equal(valid.snapshot.records.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(valid.snapshot.records[0]?.data)), {
    path: "config/app.json",
    line: 3,
    code: "missing-name"
  });
  const validOutcome = valid.snapshot.checks[0]?.outcome;
  if (validOutcome?.status !== "failed") throw new Error("Expected tool failure");
  assert.equal(validOutcome.data.diagnosticsAvailable, true);
  const checkId = input.definition.checks[0]?.checkId;
  if (checkId === undefined) throw new Error("Expected one diagnostic Check");
  for (const output of input.invalidOutputs) {
    const malformed = commandCheck({
      checkId,
      displayName: "Configuration diagnostics",
      executable: process.execPath,
      arguments: [
        "--eval",
        "process.stdout.write(" + JSON.stringify(output) + "); process.exit(1);"
      ],
      timeoutMs: 5_000,
      outputByteLimit: 64 * 1024,
      afterCommand: input.afterCommand
    });
    const rejected = completed(
      await run(defineConfig({ ...input.definition, checks: [malformed] }), quietControls)
    );
    assert.deepEqual(statuses(rejected), ["failed"]);
    assert.equal(rejected.aggregate, "failed");
    assert.equal(rejected.snapshot.records.length, 0);
    const outcome = rejected.snapshot.checks[0]?.outcome;
    if (outcome?.status !== "failed") throw new Error("Expected retained tool failure");
    assert.equal(outcome.data.diagnosticsAvailable, false);
  }
}
