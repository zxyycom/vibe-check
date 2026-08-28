import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { parseLizardCSV } from "./parser.ts";

describe("quality scanner output parsing", () => {
  it("parses Lizard 1.23 function rows", () => {
    const csv = [
      '271,88,1887,7,326,"generateWarnings@35-360@scripts/tools/quality-core/src/output/warnings/generator.ts","scripts/tools/quality-core/src/output/warnings/generator.ts","generateWarnings","generateWarnings ( files , functions , duplicates , config , scope , baseline , comparisonStatus )",35,360'
    ].join("\n");

    const result = parseLizardCSV(csv, "/repo");

    if (!result.ok) {
      assert.fail(result.error);
    }
    assert.deepEqual(result.measurements[0], {
      sourcePaths: ["scripts/tools/quality-core/src/output/warnings/generator.ts"],
      payload: {
        name: "generateWarnings",
        file: "scripts/tools/quality-core/src/output/warnings/generator.ts",
        startLine: 35,
        endLine: 360,
        lines: 271,
        parameterCount: 7,
        cyclomaticComplexity: {
          value: 88,
          source: "lizard"
        }
      }
    });
  });

  it("rejects malformed Lizard rows without accepting partial output", () => {
    const validParts = [
      "12",
      "2",
      "30",
      "1",
      "12",
      "example@1-12@src/example.ts",
      "src/example.ts",
      "example",
      "example()",
      "1",
      "12"
    ];
    const rowWith = (column: number, value: string): string => {
      const parts = [...validParts];
      parts[column] = value;
      return parts.join(",");
    };
    const validRow = validParts.join(",");
    const malformedRows = [
      ["partial NLOC integer", rowWith(0, "12junk")],
      ["invalid parameter count", rowWith(3, "garbage")],
      ["empty file path", rowWith(6, "")],
      ["invalid optional CCN", rowWith(1, "garbage")],
      ["unsafe integer", rowWith(0, "9007199254740992")],
      ["negative NLOC", rowWith(0, "-1")],
      ["negative parameter count", rowWith(3, "-1")],
      ["zero start line", rowWith(9, "0")],
      ["end line before start line", rowWith(9, "13")]
    ] as const;

    for (const [caseName, malformedRow] of malformedRows) {
      const result = parseLizardCSV(malformedRow, "/repo");

      assert.equal(result.ok, false, caseName);
      if (!result.ok) {
        assert.equal(result.reason, "invalid-result", caseName);
      }
    }

    const partialResult = parseLizardCSV([validRow, malformedRows[0][1]].join("\n"), "/repo");
    assert.equal(partialResult.ok, false);

    const missingComplexityResult = parseLizardCSV(rowWith(1, ""), "/repo");
    assert.equal(missingComplexityResult.ok, true);
    if (missingComplexityResult.ok) {
      assert.equal(
        missingComplexityResult.measurements[0]?.payload.cyclomaticComplexity.value,
        null
      );
    }
  });

  it("rejects malformed or partial Lizard CSV headers instead of treating them as zero functions", () => {
    for (const csv of ["not,lizard,csv", "NLOC,CCN", "NLOC,CCN,garbage"]) {
      const result = parseLizardCSV(csv, "/repo");

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "invalid-result");
        assert.match(result.error, /Failed to parse lizard CSV/);
      }
    }
  });

  it("keeps legitimate Lizard zero-function output successful", () => {
    const emptyResult = parseLizardCSV("", "/repo");
    const headerOnlyResult = parseLizardCSV(
      "NLOC,CCN,token count,parameter count,length,location,file path,function name,long name,start line,end line",
      "/repo"
    );

    assert.deepEqual(emptyResult, { ok: true, measurements: [] });
    assert.deepEqual(headerOnlyResult, { ok: true, measurements: [] });
  });
});
