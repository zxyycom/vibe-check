import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyzeFunctionMetrics } from "./analysis.ts";
import type { FunctionMetric } from "./measurement-model.ts";

const COMPLETE_METRIC: FunctionMetric = {
  complexityContributors: [{ line: 2, token: "if" }],
  cyclomaticComplexity: { source: "typescript-analyzer", value: 2 },
  endLine: 3,
  file: "src/complete.ts",
  lines: 3,
  name: "complete",
  nestingDepth: { source: "typescript-analyzer", value: 1 },
  parameterCount: 1,
  startLine: 1
};

describe("functionMetrics Product metric analysis", () => {
  it("fails closed when a supplied metric omits or corrupts selected-extension facts", () => {
    assert.ok(analyzeFunctionMetrics([COMPLETE_METRIC]) !== undefined);
    for (const metric of [
      { ...COMPLETE_METRIC, complexityContributors: [{ line: 0, token: "if" }] },
      { ...COMPLETE_METRIC, complexityContributors: [{ line: 2, token: 1 }] },
      { ...COMPLETE_METRIC, nestingDepth: { source: "typescript-analyzer", value: -1 } },
      { ...COMPLETE_METRIC, nestingDepth: { source: "other", value: 1 } },
      { ...COMPLETE_METRIC, nestingDepth: undefined }
    ]) {
      assert.equal(analyzeFunctionMetrics([metric]), undefined);
    }
  });
});
