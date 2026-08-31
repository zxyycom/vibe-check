import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { parseJscpdJsonReport, parseJscpdVersionOutput } from "./scanner.ts";

describe("quality scanner output parsing", () => {
  it("parses jscpd version and JSON output", () => {
    const json = JSON.stringify({
      duplicates: [
        {
          firstFile: {
            name: "\\\\?\\D:\\repo\\crates\\docnav\\src\\a.rs:rust",
            start: 10,
            end: 20,
            startLoc: { line: 10 },
            endLoc: { line: 20 }
          },
          secondFile: {
            name: "\\\\?\\D:\\repo\\crates\\docnav\\src\\b.rs:rust",
            start: 5,
            end: 15,
            startLoc: { line: 5 },
            endLoc: { line: 15 }
          },
          format: "rust",
          lines: 10,
          tokens: 50
        }
      ],
      statistics: { total: { clones: 1 } }
    });

    const result = parseJscpdJsonReport(json, "D:\\repo");

    // jscpd 5.x delegates to its bundled Rust binary, which reports a cpd prefix.
    assert.equal(parseJscpdVersionOutput("cpd 5.0.11"), "5.0.11");
    assert.equal(parseJscpdVersionOutput("not a version"), null);
    if (!result.ok) {
      assert.fail(result.error);
    }
    assert.equal(result.measurements[0].payload.tokenCount, 50);
    assert.equal(result.measurements[0].payload.lineCount, 10);
    assert.deepEqual(
      result.measurements[0].payload.locations.map((location) => location.path),
      ["crates/docnav/src/a.rs", "crates/docnav/src/b.rs"]
    );
    assert.deepEqual(result.measurements[0].sourcePaths, [
      "crates/docnav/src/a.rs",
      "crates/docnav/src/b.rs"
    ]);
    assert.deepEqual(
      result.measurements[0].payload.locations.map((location) => [
        location.startLine,
        location.endLine
      ]),
      [
        [10, 20],
        [5, 15]
      ]
    );
  });

  it("classifies invalid jscpd JSON and duplicate items as parse failures", () => {
    const invalidJson = parseJscpdJsonReport("{", "D:\\repo");
    assert.equal(invalidJson.ok, false);
    if (!invalidJson.ok) {
      assert.equal(invalidJson.reason, "jscpd-parse-failure");
    }

    const invalidDuplicate = parseJscpdJsonReport(
      JSON.stringify({ duplicates: [null] }),
      "D:\\repo"
    );
    assert.equal(invalidDuplicate.ok, false);
    if (!invalidDuplicate.ok) {
      assert.equal(invalidDuplicate.reason, "jscpd-parse-failure");
      assert.match(invalidDuplicate.error, /duplicate #1 must be an object/);
    }

    const fractionalMeasurement = parseJscpdJsonReport(
      JSON.stringify({
        duplicates: [
          {
            firstFile: { name: "src/a.ts", start: 1, end: 2 },
            secondFile: { name: "src/b.ts", start: 1, end: 2 },
            lines: 1,
            tokens: 1.5
          }
        ]
      }),
      "/repo"
    );
    assert.equal(fractionalMeasurement.ok, false);
    if (!fractionalMeasurement.ok) {
      assert.equal(fractionalMeasurement.reason, "jscpd-parse-failure");
      assert.match(fractionalMeasurement.error, /tokens.*safe integer/);
    }
  });
});
