import assert from "node:assert/strict";

import { run } from "./run.ts";
import { check, definition, PASSED } from "./run-fixtures.test-support.ts";

export async function assertInvalidRunControlsAndDefinition(calls: () => number): Promise<void> {
  const source = definition([
    {
      ...check({
        execute: () => {
          calls();
          return PASSED;
        }
      }),
      prepare: (options) => {
        calls();
        return { status: "success", preparedOptions: options };
      }
    }
  ]);
  const unknown = await run(source, { changedFiles: ["src/a.ts"] });
  const invalidPreview = await run(source, {
    outputs: { progressRendering: { enabled: false, recordPreviewLimit: -1 } }
  });
  const invalidCheckArtifactDirectory = await run(source, { checkArtifactBaseDirectory: "" });
  const nulCheckArtifactDirectory = await run(source, { checkArtifactBaseDirectory: "checks\0" });
  const invalidProgressLogFile = await run(source, { progressLogFile: "" });
  const nulProgressLogFile = await run(source, { progressLogFile: "progress\0.log" });
  const invalidDefinition = await run({ ...source, unexpected: true }, {});
  assertInvalidControl(unknown, "controls.changedFiles", "unknown-key");
  assertInvalidControl(
    invalidPreview,
    "controls.outputs.progressRendering.recordPreviewLimit",
    "invalid-value",
    "non-negative-safe-integer"
  );
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

export async function assertBlockedPreparation(
  calls: () => number,
  observed: (value: boolean) => void
): Promise<void> {
  const result = await run(
    definition([
      {
        ...check({
          execute: () => {
            calls();
            return PASSED;
          }
        }),
        options: { accepted: false },
        prepare: (options) => {
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
  reason: string,
  expected?: string
): void {
  assert.deepEqual(result, {
    kind: "configuration",
    definitionWarnings: [],
    diagnostic: {
      kind: "invalid-run-controls",
      path,
      reason,
      ...(expected === undefined ? {} : { expected })
    }
  });
}
