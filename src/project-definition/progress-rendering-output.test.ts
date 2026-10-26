import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineConfig, type ProjectDefinition } from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";

describe("Project Definition", () => {
  it("validates progress presentation defaults and closed authoring", () => {
    const definition = defineConfig({});
    const directDefinition: ProjectDefinition = {
      ...definition,
      outputs: { ...definition.outputs, progressRendering: { enabled: false } }
    };
    const validated = validateProjectDefinition(directDefinition);
    assert(validated.ok);
    assert.deepEqual(validated.value.outputs.progressRendering, {
      enabled: false,
      flagMismatchPreviewLimit: 0,
      formatter: null,
      messagePreviewLimit: 5,
      recordPreviewLimit: 5,
      textPreviewCodePointLimit: 240
    });
    assert.equal(Object.isFrozen(validated.value.outputs.progressRendering), true);
    const formatter = () => "formatted";
    for (const flagMismatchPreviewLimit of [0, 2, Number.MAX_SAFE_INTEGER]) {
      const configured = validateProjectDefinition({
        ...definition,
        outputs: {
          ...definition.outputs,
          progressRendering: {
            enabled: false,
            flagMismatchPreviewLimit,
            formatter,
            messagePreviewLimit: 0,
            recordPreviewLimit: 1,
            textPreviewCodePointLimit: 2
          }
        }
      });
      assert(configured.ok);
      assert.equal(configured.value.outputs.progressRendering.formatter, formatter);
      assert.equal(
        configured.value.outputs.progressRendering.flagMismatchPreviewLimit,
        flagMismatchPreviewLimit
      );
    }
    for (const progressRendering of [
      ...[-1, 1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "1", null].map(
        (flagMismatchPreviewLimit) => ({ enabled: false, flagMismatchPreviewLimit })
      ),
      { enabled: false, recordPreviewLimit: -1 },
      { enabled: false, messagePreviewLimit: 1.5 },
      { enabled: false, textPreviewCodePointLimit: 0 },
      { enabled: false, formatter: {} },
      { enabled: false, unexpected: true }
    ]) {
      const rejected = validateProjectDefinition({
        ...definition,
        outputs: { ...definition.outputs, progressRendering }
      });
      assert(!rejected.ok);
      assert.deepEqual(rejected.error, {
        kind: "invalid-project-definition",
        path: "definition.outputs",
        reason: "invalid-value"
      });
    }
  });
});
