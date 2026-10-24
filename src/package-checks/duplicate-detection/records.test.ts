import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DuplicateCodeFragment } from "./measurement-model.ts";
import type { ResolvedDuplicateDetectionOptions } from "./options.ts";
import { buildDuplicateRecordCandidates } from "./records.ts";

describe("duplicate record candidates", () => {
  it("marks a finding blocking exactly when any common area is blocking", () => {
    const fragment: DuplicateCodeFragment = {
      codeAreas: ["also-shared", "shared"],
      id: 1,
      lineCount: 12,
      locations: [
        { path: "src/a.ts", startLine: 1, endLine: 12 },
        { path: "scripts/b.ts", startLine: 1, endLine: 12 }
      ],
      tokenCount: 120
    };
    const nonBlocking: ResolvedDuplicateDetectionOptions["codeAreas"][string] = {
      files: { patterns: ["**/*.ts"], useDefaultExcludes: true },
      findingPolicy: "non-blocking",
      minimumLines: 10,
      minimumTokens: 90
    };
    const blocking = { ...nonBlocking, findingPolicy: "blocking" as const };
    for (const { first, second, expected } of [
      { first: nonBlocking, second: nonBlocking, expected: false },
      { first: blocking, second: nonBlocking, expected: true },
      { first: nonBlocking, second: blocking, expected: true },
      { first: blocking, second: blocking, expected: true }
    ]) {
      const candidates = buildDuplicateRecordCandidates([fragment], {
        "also-shared": first,
        shared: second,
        unrelated: blocking
      });
      assert.deepEqual(
        candidates?.map(({ data }) => data),
        [
          {
            blocking: expected,
            codeAreas: ["also-shared", "shared"],
            lineCount: 12,
            locations: [
              { endLine: 12, path: "scripts/b.ts", startLine: 1 },
              { endLine: 12, path: "src/a.ts", startLine: 1 }
            ],
            metric: "duplicate-tokens",
            tokenCount: 120
          }
        ]
      );
    }
  });
});
