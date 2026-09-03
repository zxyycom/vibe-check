import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  analyzeLizardSource,
  isLizardSourceSupported,
  lizardSourceExtensions
} from "./port-facade.ts";

describe("Lizard port façade", () => {
  it("provides case-insensitive suffix capability and supplied-source Lizard-domain analysis", () => {
    assert.equal(lizardSourceExtensions().length, 55);
    assert.equal(isLizardSourceSupported("source/upper-case.CPP"), true);
    assert.equal(isLizardSourceSupported("source/unsupported.md"), false);

    const analysis = analyzeLizardSource({
      filename: "source/example.cpp",
      sourceCode: "int classify(int value) {\n  if (value) return value;\n  return 0;\n}"
    });

    assert.deepEqual(analysis, {
      function_list: [
        {
          cyclomatic_complexity: 2,
          end_line: 4,
          filename: "source/example.cpp",
          name: "classify",
          nloc: 4,
          parameter_count: 1,
          start_line: 1
        }
      ]
    });
    assert.equal(Object.isFrozen(analysis), true);
    assert.equal(Object.isFrozen(analysis?.function_list), true);
    assert.equal(
      analyzeLizardSource({ filename: "source/unsupported.md", sourceCode: "# heading" }),
      undefined
    );
  });
});
