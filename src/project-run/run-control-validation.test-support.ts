import assert from "node:assert/strict";

import { run } from "./run.ts";
import { check, definition, PASSED } from "./run-fixtures.test-support.ts";

export async function assertInvalidRunControlsAndDefinition(calls: () => number): Promise<void> {
  const source = definition([
    check({
      execution: () => {
        calls();
        return PASSED;
      }
    })
  ]);
  const unknown = await run(source, { changedFiles: ["src/a.ts"] });
  const emptyDirectory = await run(source, {
    outputs: { diagnosticLogging: { directory: "" } }
  });
  const nulDirectory = await run(source, {
    outputs: { machinePublication: { directory: "machine\0output" } }
  });
  const unknownOutputKey = await run(source, {
    outputs: { diagnosticLogging: { directory: "diagnostic", unexpected: true } }
  });
  const invalidCheckArtifactDirectory = await run(source, { checkArtifactBaseDirectory: "" });
  const nulCheckArtifactDirectory = await run(source, { checkArtifactBaseDirectory: "checks\0" });
  const invalidProgressLogFile = await run(source, { progressLogFile: "" });
  const nulProgressLogFile = await run(source, { progressLogFile: "progress\0.log" });
  const invalidDefinition = await run({ ...source, unexpected: true }, {});
  assertInvalidControl(unknown, "controls.changedFiles", "unknown-key");
  assertInvalidControl(emptyDirectory, "controls.outputs", "invalid-value");
  assertInvalidControl(nulDirectory, "controls.outputs", "invalid-value");
  assertInvalidControl(unknownOutputKey, "controls.outputs", "invalid-value");
  assertInvalidControl(invalidProgressLogFile, "controls.progressLogFile", "invalid-value");
  assertInvalidControl(nulProgressLogFile, "controls.progressLogFile", "invalid-value");
  assertInvalidControl(
    invalidCheckArtifactDirectory,
    "controls.checkArtifactBaseDirectory",
    "invalid-value"
  );
  assertInvalidControl(
    nulCheckArtifactDirectory,
    "controls.checkArtifactBaseDirectory",
    "invalid-value"
  );
  assert.equal(invalidDefinition.kind, "configuration");
}

export async function assertBlockedPreflight(
  calls: () => number,
  observed: (value: boolean) => void
): Promise<void> {
  const result = await run(
    definition([
      {
        ...check({
          execution: () => {
            calls();
            return PASSED;
          }
        }),
        options: { accepted: false },
        preflight: (options) => {
          observed(Object.isFrozen(options));
          return { status: "failure", action: "block", reason: { code: "invalid-options" } };
        }
      }
    ])
  );
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") return;
  assert.deepEqual(result.snapshot.checks[0]?.outcome, {
    status: "unavailable",
    reason: { code: "invalid-options" }
  });
  assert.deepEqual(result.checkDurations, [{ checkId: "custom", durationMs: null }]);
}

function assertInvalidControl(
  result: Awaited<ReturnType<typeof run>>,
  path: string,
  reason: string
): void {
  assert.deepEqual(result, {
    kind: "configuration",
    definitionWarnings: [],
    diagnostic: { kind: "invalid-run-controls", path, reason }
  });
}
