import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  SCAN_CAPABILITY_IDS,
  reduceScanCompleteness,
  type CapabilityResult,
  type ScanCompleteness
} from "./scan-completeness.ts";

interface CompletenessCase {
  expected: ScanCompleteness;
  name: string;
  results: readonly CapabilityResult[];
}

const CASES: readonly CompletenessCase[] = [
  {
    name: "all capabilities succeeded",
    results: [
      { capabilityId: "file-metrics", status: "succeeded" },
      { capabilityId: "function-metrics", status: "succeeded" },
      { capabilityId: "duplicate-detection", status: "succeeded" }
    ],
    expected: "complete"
  },
  {
    name: "succeeded mixed with no-input and skipped",
    results: [
      { capabilityId: "file-metrics", status: "succeeded" },
      { capabilityId: "function-metrics", status: "no-input" },
      { capabilityId: "duplicate-detection", status: "skipped" }
    ],
    expected: "complete"
  },
  {
    name: "only skipped and no-input",
    results: [
      { capabilityId: "file-metrics", status: "no-input" },
      { capabilityId: "function-metrics", status: "no-input" },
      { capabilityId: "duplicate-detection", status: "skipped" }
    ],
    expected: "empty"
  },
  {
    name: "any failed capability takes precedence over success",
    results: [
      { capabilityId: "file-metrics", status: "succeeded" },
      {
        capabilityId: "function-metrics",
        status: "failed",
        diagnostic: {
          kind: "execution",
          message: "Lizard exited before producing metrics.",
          action: "Run the configured Lizard command and resolve the reported error."
        }
      },
      { capabilityId: "duplicate-detection", status: "skipped" }
    ],
    expected: "failed"
  }
];

// @case WB-RUNTIME-COMPLETENESS-001
describe("scan completeness model", () => {
  it("defines the stable current measurement capability IDs", () => {
    assert.deepEqual(SCAN_CAPABILITY_IDS, [
      "file-metrics",
      "function-metrics",
      "duplicate-detection"
    ]);
  });

  it("reduces final capability results without capability-specific rules", () => {
    for (const testCase of CASES) {
      assert.equal(
        reduceScanCompleteness(testCase.results),
        testCase.expected,
        testCase.name
      );
    }
  });
});
