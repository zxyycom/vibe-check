import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import { effectiveOutputs } from "../outputs/configuration.ts";
import { validateRunControls } from "./validation.ts";

describe("Package Run output overrides", () => {
  it("merges bounded progress previews field by field and clears a Definition formatter", () => {
    const formatter = () => "Definition text";
    const definition = defineConfig({
      outputs: {
        progressRendering: {
          formatter,
          messagePreviewLimit: 3,
          recordPreviewLimit: 2,
          textPreviewCodePointLimit: 12
        }
      }
    });
    const callerControls = {
      outputs: {
        progressRendering: {
          formatter: null,
          messagePreviewLimit: 0,
          recordPreviewLimit: undefined,
          textPreviewCodePointLimit: 1
        }
      }
    };
    const validated = validateRunControls(callerControls);
    assert.equal(validated.ok, true);
    if (!validated.ok) return;
    const effective = effectiveOutputs(definition, validated.value);
    assert.deepEqual(effective.progressRendering, {
      enabled: true,
      formatter: null,
      messagePreviewLimit: 0,
      recordPreviewLimit: 2,
      textPreviewCodePointLimit: 1
    });
    assert.equal(
      Object.hasOwn(validated.value.outputs?.progressRendering ?? {}, "recordPreviewLimit"),
      false
    );
    assert.equal(definition.outputs.progressRendering.formatter, formatter);
    assert.equal(Object.isFrozen(validated.value.outputs?.progressRendering), true);
  });

  it("locates rejected output fields with closed expectations and without reading accessors", () => {
    let accessorCalls = 0;
    const accessor = Object.defineProperty({}, "enabled", {
      enumerable: true,
      get() {
        accessorCalls += 1;
        throw new Error("Synthetic accessor must not run");
      }
    });
    const invalidValues = [
      { outputs: null, path: "controls.outputs", expected: "plain-data-object" },
      { outputs: [], path: "controls.outputs", expected: "plain-data-object" },
      {
        outputs: { diagnosticLogging: null },
        path: "controls.outputs.diagnosticLogging",
        expected: "plain-data-object"
      },
      {
        outputs: { machinePublication: [] },
        path: "controls.outputs.machinePublication",
        expected: "plain-data-object"
      },
      {
        outputs: { progressRendering: accessor },
        path: "controls.outputs.progressRendering",
        expected: "plain-data-object"
      },
      {
        outputs: { machinePublication: accessor },
        path: "controls.outputs.machinePublication",
        expected: "plain-data-object"
      },
      {
        outputs: { machinePublication: { enabled: 1 } },
        path: "controls.outputs.machinePublication.enabled",
        expected: "boolean"
      },
      {
        outputs: { diagnosticLogging: { directory: "" } },
        path: "controls.outputs.diagnosticLogging.directory",
        expected: "non-empty-string-without-nul"
      },
      {
        outputs: { machinePublication: { directory: "synthetic\0value" } },
        path: "controls.outputs.machinePublication.directory",
        expected: "non-empty-string-without-nul"
      },
      {
        outputs: { progressRendering: { enabled: "false" } },
        path: "controls.outputs.progressRendering.enabled",
        expected: "boolean"
      },
      {
        outputs: { progressRendering: { enabled: false, recordPreviewLimit: -1 } },
        path: "controls.outputs.progressRendering.recordPreviewLimit",
        expected: "non-negative-safe-integer"
      },
      {
        outputs: { progressRendering: { messagePreviewLimit: Number.NaN } },
        path: "controls.outputs.progressRendering.messagePreviewLimit",
        expected: "non-negative-safe-integer"
      },
      {
        outputs: { progressRendering: { textPreviewCodePointLimit: 0 } },
        path: "controls.outputs.progressRendering.textPreviewCodePointLimit",
        expected: "positive-safe-integer"
      },
      {
        outputs: { progressRendering: { textPreviewCodePointLimit: Number.POSITIVE_INFINITY } },
        path: "controls.outputs.progressRendering.textPreviewCodePointLimit",
        expected: "positive-safe-integer"
      },
      {
        outputs: { progressRendering: { formatter: "synthetic-private-text" } },
        path: "controls.outputs.progressRendering.formatter",
        expected: "function-or-null"
      }
    ];
    for (const { outputs, path, expected } of invalidValues) {
      assert.deepEqual(validateRunControls({ outputs }), {
        ok: false,
        error: { kind: "invalid-run-controls", path, reason: "invalid-value", expected }
      });
    }
    for (const { outputs, path } of [
      { outputs: { unexpected: true }, path: "controls.outputs.unexpected" },
      {
        outputs: { diagnosticLogging: { unexpected: true } },
        path: "controls.outputs.diagnosticLogging.unexpected"
      },
      {
        outputs: { machinePublication: { unexpected: true } },
        path: "controls.outputs.machinePublication.unexpected"
      },
      {
        outputs: { progressRendering: { unexpected: true } },
        path: "controls.outputs.progressRendering.unexpected"
      }
    ]) {
      assert.deepEqual(validateRunControls({ outputs }), {
        ok: false,
        error: { kind: "invalid-run-controls", path, reason: "unknown-key" }
      });
    }
    assert.equal(accessorCalls, 0);
  });
});
