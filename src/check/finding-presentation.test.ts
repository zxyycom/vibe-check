import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { presentCheckFindings } from "./finding-presentation.ts";

describe("Check Finding presentation", () => {
  it("lets the producing Check own the visible limit and overflow navigation", () => {
    const findings = [
      { path: "src/first.ts", blocking: false },
      { path: "src/second.ts", blocking: true },
      { path: "src/third.ts", blocking: true }
    ];
    const formattedIndexes: number[] = [];

    const messages = presentCheckFindings({
      findings,
      limit: 2,
      message: (finding, index) => {
        formattedIndexes.push(index);
        return {
          code: "finding-detail",
          level: finding.blocking ? "error" : "warning",
          message: finding.path
        };
      },
      omittedMessage: (overflow) => {
        assert.equal(Object.isFrozen(overflow), true);
        assert.equal(Object.isFrozen(overflow.omittedFindings), true);
        assert.equal(overflow.omittedFindings[0], findings[2]);
        assert.deepEqual(
          {
            omittedCount: overflow.omittedCount,
            presentedCount: overflow.presentedCount,
            totalCount: overflow.totalCount
          },
          { omittedCount: 1, presentedCount: 2, totalCount: 3 }
        );
        return {
          code: "findings-omitted",
          level: "error",
          message: "1 more finding; inspect reports/custom-check.json for full details."
        };
      }
    });

    assert.deepEqual(formattedIndexes, [0, 1]);
    assert.deepEqual(messages, [
      { code: "finding-detail", level: "warning", message: "src/first.ts" },
      { code: "finding-detail", level: "error", message: "src/second.ts" },
      {
        code: "findings-omitted",
        level: "error",
        message: "1 more finding; inspect reports/custom-check.json for full details."
      }
    ]);
    assert.equal(Object.isFrozen(messages), true);
    assert.equal(Object.isFrozen(messages[0]), true);

    assert.deepEqual(
      presentCheckFindings({
        findings: ["hidden"],
        limit: 0,
        message: () => {
          throw new Error("A zero limit must not format a Finding detail");
        },
        omittedMessage: ({ omittedCount }) => ({
          code: "findings-omitted",
          level: "info",
          message: `${omittedCount} hidden`
        })
      }),
      [{ code: "findings-omitted", level: "info", message: "1 hidden" }]
    );
    assert.throws(
      () =>
        presentCheckFindings({
          findings: [],
          limit: -1,
          message: () => ({ code: "unused", level: "info", message: "unused" }),
          omittedMessage: () => ({ code: "unused", level: "info", message: "unused" })
        }),
      /non-negative safe integer/
    );
  });
});
