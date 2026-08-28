import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { SCC_BY_FILE_CSV_HEADER, parseSccCSV } from "./scanner.ts";

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
});
function assertSccEmptyAndValidOutputs(): void {
  assert.deepEqual(parseSccCSV(SCC_BY_FILE_CSV_HEADER, "/repo"), {
    ok: true,
    measurements: []
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
