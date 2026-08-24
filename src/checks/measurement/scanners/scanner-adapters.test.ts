import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { parseLizardCSV } from "./lizard/scanner.ts";
import { parseJscpdJsonReport, parseJscpdVersionOutput } from "./jscpd/scanner.ts";
import { SCC_BY_FILE_CSV_HEADER, parseSccCSV } from "./scc/scanner.ts";

describe("quality scanner output parsing", () => {
  it("parses scc 3.7 Provider paths and rejects unknown CSV headers", () => {
    const csv = [
      SCC_BY_FILE_CSV_HEADER,
      "Rust,crates/docnav/src/lib.rs,lib.rs,120,90,20,10,17,4096,70",
      "TypeScript,scripts/quality/scan.ts,scan.ts,60,50,5,5,8,2048,45",
      "TypeScript,/repo/src/absolute.ts,absolute.ts,40,30,5,5,4,1024,25"
    ].join("\n");

    const result = parseSccCSV(csv, "/repo");

    if (!result.ok) {
      assert.fail(result.error);
    }
    assert.deepEqual(
      result.measurements.map((measurement) => measurement.payload.path),
      ["crates/docnav/src/lib.rs", "scripts/quality/scan.ts", "src/absolute.ts"]
    );
    assert.deepEqual(
      result.measurements.map((measurement) => measurement.sourcePaths),
      [["crates/docnav/src/lib.rs"], ["scripts/quality/scan.ts"], ["src/absolute.ts"]]
    );
    assert.equal(result.measurements[0].payload.decisionTokens.value, 17);
    const invalidResult = parseSccCSV(
      "Language,Location,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes\n",
      "/repo"
    );
    assert.equal(invalidResult.ok, false);
    if (!invalidResult.ok) {
      assert.equal(invalidResult.reason, "invalid-result");
    }
  });

  it("rejects malformed scc rows without losing valid zero-file output", () => {
    assertSccEmptyAndValidOutputs();
    assertMalformedSccRows();
  });

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
        codeArea: "unknown",
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

  it("parses jscpd version and JSON output", () => {
    const json = JSON.stringify({
      duplicates: [
        {
          firstFile: {
            name: "\\\\?\\D:\\repo\\crates\\docnav\\src\\a.rs",
            start: 10,
            end: 20,
            startLoc: { line: 10 },
            endLoc: { line: 20 }
          },
          secondFile: {
            name: "\\\\?\\D:\\repo\\crates\\docnav\\src\\b.rs",
            start: 5,
            end: 15,
            startLoc: { line: 5 },
            endLoc: { line: 15 }
          },
          lines: 10,
          tokens: 50
        }
      ],
      statistics: { total: { clones: 1 } }
    });

    const result = parseJscpdJsonReport(json, "D:\\repo");

    // jscpd 5.x delegates to its bundled Rust binary, which reports a cpd prefix.
    assert.equal(parseJscpdVersionOutput("cpd 5.0.11"), "5.0.11");
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
  });
});

function assertSccEmptyAndValidOutputs(): void {
  assert.deepEqual(parseSccCSV(SCC_BY_FILE_CSV_HEADER, "/repo"), {
    ok: true,
    measurements: [],
    aggregates: { byLanguage: [] }
  });
  for (const missingHeader of ["", " \n\t\n"]) {
    const result = parseSccCSV(missingHeader, "/repo");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "invalid-result");
      assert.match(result.error, /header/i);
    }
  }

  const validRow = "TypeScript,src/example.ts,example.ts,12,8,2,2,1,256,8";
  assert.equal(parseSccCSV([SCC_BY_FILE_CSV_HEADER, validRow].join("\n"), "/repo").ok, true);
  const emptyComplexityResult = parseSccCSV(
    [SCC_BY_FILE_CSV_HEADER, "TypeScript,src/example.ts,example.ts,12,8,2,2,,256,8"].join("\n"),
    "/repo"
  );
  assert.equal(emptyComplexityResult.ok, true);
  if (emptyComplexityResult.ok) {
    assert.equal(emptyComplexityResult.measurements[0]?.payload.decisionTokens.value, null);
  }
}

function assertMalformedSccRows(): void {
  const validRow = "TypeScript,src/example.ts,example.ts,12,8,2,2,1,256,8";
  const malformedRows = [
    "TypeScript,src/example.ts",
    "TypeScript,src/example.ts,,12,8,2,2,1,256,8",
    "TypeScript,src/example.ts,example.ts,invalid,8,2,2,1,256,8",
    "TypeScript,src/example.ts,example.ts,12,invalid,2,2,1,256,8",
    "TypeScript,src/example.ts,example.ts,12,8,invalid,2,1,256,8",
    "TypeScript,src/example.ts,example.ts,12,8,2,invalid,1,256,8",
    "TypeScript,src/example.ts,example.ts,12,8,2,2,invalid,256,8"
  ];
  for (const malformedRow of malformedRows) {
    const result = parseSccCSV([SCC_BY_FILE_CSV_HEADER, malformedRow].join("\n"), "/repo");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "invalid-result");
      assert.match(result.error, /row|field/i);
    }
  }

  const partialResult = parseSccCSV(
    [SCC_BY_FILE_CSV_HEADER, validRow, malformedRows[0]].join("\n"),
    "/repo"
  );
  assert.equal(partialResult.ok, false);
}
