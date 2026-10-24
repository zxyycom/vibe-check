import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyDuplicateAreaPolicy } from "./area-policy.ts";
import type { DuplicateCodeFragment, DuplicateDetectionAreaInput } from "./measurement-model.ts";

describe("duplicate area policy", () => {
  it("retains exactly the common areas and applies their strictest line and token thresholds", () => {
    const fragment: DuplicateCodeFragment = {
      codeAreas: ["stale"],
      id: 1,
      lineCount: 12,
      locations: [
        { path: "src/a.ts", startLine: 1, endLine: 12 },
        { path: "scripts/b.ts", startLine: 1, endLine: 12 }
      ],
      tokenCount: 120
    };
    const privateAreas: readonly DuplicateDetectionAreaInput[] = [
      {
        approvedExactPaths: ["src/a.ts"],
        codeArea: "source",
        minimumLines: 100,
        minimumTokens: 1000
      },
      {
        approvedExactPaths: ["scripts/b.ts"],
        codeArea: "scripts",
        minimumLines: 100,
        minimumTokens: 1000
      }
    ];
    const shared: DuplicateDetectionAreaInput = {
      approvedExactPaths: ["scripts/b.ts", "src/a.ts"],
      codeArea: "shared",
      minimumLines: 10,
      minimumTokens: 90
    };
    const alsoShared = { ...shared, codeArea: "also-shared", minimumLines: 12, minimumTokens: 120 };
    for (const { commonAreas, expected } of [
      { commonAreas: [], expected: [] },
      { commonAreas: [shared], expected: ["shared"] },
      { commonAreas: [shared, alsoShared], expected: ["also-shared", "shared"] },
      { commonAreas: [shared, { ...alsoShared, minimumLines: 13 }], expected: [] },
      { commonAreas: [shared, { ...alsoShared, minimumTokens: 121 }], expected: [] }
    ]) {
      assert.deepEqual(
        applyDuplicateAreaPolicy([fragment], [...privateAreas, ...commonAreas]),
        expected.length === 0 ? [] : [{ ...fragment, codeAreas: expected }]
      );
    }
  });
});
