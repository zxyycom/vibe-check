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

    for (const progressRendering of [
      { recordPreviewLimit: -1 },
      { messagePreviewLimit: Number.NaN },
      { textPreviewCodePointLimit: Number.POSITIVE_INFINITY },
      { formatter: "not-a-function" },
      { unexpected: true }
    ]) {
      assert.equal(
        validateRunControls({ outputs: { progressRendering } }).ok,
        false,
        JSON.stringify(progressRendering)
      );
    }
  });
});
