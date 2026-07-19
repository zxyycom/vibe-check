import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseLizardCSV } from "./scanners/lizard.ts";
import {
  parseJscpdJsonReport,
  parseJscpdVersionOutput,
  scanWithJscpd
} from "./scanners/jscpd/scanner.ts";
import { SCC_BY_FILE_CSV_HEADER, parseSccCSV, scanWithScc } from "./scanners/scc.ts";
import { checkJscpd } from "./scanners/tool-availability/jscpd.ts";
import { checkLizard } from "./scanners/tool-availability/lizard.ts";
import { TEST_QUALITY_CONFIG } from "../../test/config.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("quality scanner output parsing", () => {
  // @case AUX-QUALITY-PARSER-001
  it("parses scc 3.7 Provider paths and rejects unknown CSV headers", () => {
    const csv = [
      SCC_BY_FILE_CSV_HEADER,
      "Rust,crates/docnav/src/lib.rs,lib.rs,120,90,20,10,17,4096,70",
      "TypeScript,scripts/quality/scan.ts,scan.ts,60,50,5,5,8,2048,45"
    ].join("\n");

    const result = parseSccCSV(csv, "/repo");

    assert.equal(result.ok, true);
    assert.deepEqual(result.files!.map((f) => f.path), [
      "crates/docnav/src/lib.rs",
      "scripts/quality/scan.ts"
    ]);
    assert.equal(result.files![0]!.decisionTokens.value, 17);
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
    assert.deepEqual(parseSccCSV(SCC_BY_FILE_CSV_HEADER, "/repo"), {
      ok: true,
      files: [],
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
      assert.equal(emptyComplexityResult.files[0]?.decisionTokens.value, null);
    }

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
  });

  it("parses Lizard 1.23 function rows", () => {
    const csv = [
      "271,88,1887,7,326,\"generateWarnings@35-360@scripts/tools/quality-core/src/output/warnings/generator.ts\",\"scripts/tools/quality-core/src/output/warnings/generator.ts\",\"generateWarnings\",\"generateWarnings ( files , functions , duplicates , config , scope , baseline , comparisonStatus )\",35,360"
    ].join("\n");

    const result = parseLizardCSV(csv);

    assert.equal(result.ok, true);
    assert.deepEqual(result.functions![0], {
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
      },
      isChanged: false
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
      const result = parseLizardCSV(malformedRow);

      assert.equal(result.ok, false, caseName);
      if (!result.ok) {
        assert.equal(result.reason, "invalid-result", caseName);
      }
    }

    const partialResult = parseLizardCSV([validRow, malformedRows[0][1]].join("\n"));
    assert.equal(partialResult.ok, false);

    const missingComplexityResult = parseLizardCSV(rowWith(1, ""));
    assert.equal(missingComplexityResult.ok, true);
    if (missingComplexityResult.ok) {
      assert.equal(missingComplexityResult.functions[0]?.cyclomaticComplexity.value, null);
    }
  });

  it("rejects malformed or partial Lizard CSV headers instead of treating them as zero functions", () => {
    for (const csv of ["not,lizard,csv", "NLOC,CCN", "NLOC,CCN,garbage"]) {
      const result = parseLizardCSV(csv);

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "invalid-result");
        assert.match(result.error, /Failed to parse lizard CSV/);
      }
    }
  });

  it("keeps legitimate Lizard zero-function output successful", () => {
    const emptyResult = parseLizardCSV("");
    const headerOnlyResult = parseLizardCSV(
      "NLOC,CCN,token count,parameter count,length,location,file path,function name,long name,start line,end line"
    );

    assert.deepEqual(emptyResult, { ok: true, functions: [] });
    assert.deepEqual(headerOnlyResult, { ok: true, functions: [] });
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
    assert.equal(result.ok, true);
    assert.equal(result.fragments[0]!.tokenCount, 50);
    assert.equal(result.fragments[0]!.lineCount, 10);
    assert.deepEqual(result.fragments[0]!.locations.map((location) => location.path), [
      "crates/docnav/src/a.rs",
      "crates/docnav/src/b.rs"
    ]);
    assert.deepEqual(result.fragments[0]!.locations.map((location) => [location.startLine, location.endLine]), [
      [10, 20],
      [5, 15]
    ]);
  });

  it("classifies invalid jscpd JSON and duplicate items as parse failures", () => {
    const invalidJson = parseJscpdJsonReport("{", "D:\\repo");
    assert.equal(invalidJson.ok, false);
    if (!invalidJson.ok) {
      assert.equal(invalidJson.reason, "jscpd-parse-failure");
    }

    const invalidDuplicate = parseJscpdJsonReport(JSON.stringify({ duplicates: [null] }), "D:\\repo");
    assert.equal(invalidDuplicate.ok, false);
    if (!invalidDuplicate.ok) {
      assert.equal(invalidDuplicate.reason, "jscpd-parse-failure");
      assert.match(invalidDuplicate.error, /duplicate #1 must be an object/);
    }
  });
});

describe("quality scc exact input projection", () => {
  // @case AUX-QUALITY-SCC-WRAPPER-001
  it("returns empty metrics without invoking scc when exact inputs are empty", () => {
    const result = scanWithScc({
      cwd: REPO_ROOT,
      includePaths: [],
      excludeDirs: [],
      toolConfig: {
        command: join(REPO_ROOT, `vibe-check-missing-scc-${process.pid}.cmd`),
        args: []
      }
    });

    assert.deepEqual(result, {
      ok: true,
      files: [],
      aggregates: { byLanguage: [] }
    });
  });

  it("rejects a successful scc invocation that produces no CSV header", () => {
    const toolConfig = createFakeSccToolConfig("");

    try {
      const result = scanWithScc({
        cwd: REPO_ROOT,
        includePaths: ["src"],
        excludeDirs: [],
        toolConfig
      });

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "invalid-result");
        assert.match(result.error, /header/i);
      }
    } finally {
      toolConfig.cleanup();
    }
  });
});

describe("quality lizard availability projection", () => {
  // @case AUX-QUALITY-LIZARD-AVAILABILITY-001
  it("classifies non-zero version exits with stderr as execution failures", async () => {
    const toolConfig = createFakeVersionToolConfig({
      stdout: "",
      stderr: "No module named lizard",
      exitCode: 1
    });

    try {
      const result = await checkLizard(REPO_ROOT, toolConfig);

      assert.equal(result.available, false);
      assert.equal(result.reason, "execution-error");
      assert.equal(result.version, null);
      assert.match(result.error ?? "", /lizard --version failed, exit 1: No module named lizard/);
    } finally {
      toolConfig.cleanup();
    }
  });

  it("classifies missing dependency commands as unavailable tools", async () => {
    const result = await checkLizard(REPO_ROOT, {
      command: join(REPO_ROOT, `vibe-check-missing-lizard-${process.pid}.cmd`),
      args: []
    });

    assert.equal(result.available, false);
    assert.equal(result.reason, "tool-unavailable");
    assert.equal(result.version, null);
    assert.match(result.error ?? "", /lizard command unavailable/);
  });
});

describe("quality jscpd wrapper failure projection", () => {
  // @case AUX-QUALITY-JSCPD-WRAPPER-001
  it("does not treat a successful jscpd run without JSON as a successful empty scan", () => {
    const toolConfig = createFakeJscpdToolConfig({ stdout: "", stderr: "", exitCode: 0 });

    try {
      const result = scanWithJscpd({
        files: ["scripts/a.ts", "scripts/b.ts"],
        cwd: REPO_ROOT,
        toolConfig,
        minimumTokens: 75,
        format: TEST_QUALITY_CONFIG.jscpd.formatByCodeArea["typescript-production-scripts"]
      });

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "jscpd-report-failure");
        assert.match(result.error, /jscpd JSON report missing/);
      }
    } finally {
      toolConfig.cleanup();
    }
  });

  it("classifies empty jscpd JSON reports as report failures", () => {
    const toolConfig = createFakeJscpdToolConfig({
      stdout: "",
      stderr: "",
      exitCode: 0,
      reportJson: "   \n"
    });

    try {
      const result = scanWithJscpd({
        files: ["scripts/a.ts", "scripts/b.ts"],
        cwd: REPO_ROOT,
        toolConfig,
        minimumTokens: 75,
        format: TEST_QUALITY_CONFIG.jscpd.formatByCodeArea["typescript-production-scripts"]
      });

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "jscpd-report-failure");
        assert.match(result.error, /jscpd JSON report is empty/);
      }
    } finally {
      toolConfig.cleanup();
    }
  });

  it("classifies commands missing after preflight as execution failures", () => {
    const result = scanWithJscpd({
      files: ["scripts/a.ts", "scripts/b.ts"],
      cwd: REPO_ROOT,
      toolConfig: {
        command: join(REPO_ROOT, `docnav-missing-jscpd-${process.pid}.cmd`),
        args: []
      },
      minimumTokens: 75,
      format: TEST_QUALITY_CONFIG.jscpd.formatByCodeArea["typescript-production-scripts"]
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "jscpd-execution-error");
      assert.match(result.error, /jscpd process error/);
    }
  });

  it("classifies unavailable jscpd dependency binaries in tool availability", async () => {
    const result = await checkJscpd(REPO_ROOT, {
      command: join(REPO_ROOT, `docnav-missing-jscpd-${process.pid}.cmd`),
      args: []
    });

    assert.equal(result.available, false);
    assert.equal(result.reason, "tool-unavailable");
    assert.match(result.error ?? "", /jscpd dependency binary unavailable/);
  });

  it("keeps real duplicate findings non-fatal and normalizes jscpd JSON", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "docnav-quality-jscpd-real-"));
    const duplicateSource = [
      "export function duplicatedExample(value: number): number {",
      "  let total = value;",
      "  total += 1;",
      "  total += 2;",
      "  total += 3;",
      "  total += 4;",
      "  total += 5;",
      "  total += 6;",
      "  total += 7;",
      "  total += 8;",
      "  total += 9;",
      "  total += 10;",
      "  return total;",
      "}",
      ""
    ].join("\n");

    writeFileSync(join(tempDir, "a.ts"), duplicateSource, "utf8");
    writeFileSync(join(tempDir, "b.ts"), duplicateSource, "utf8");

    try {
      const result = scanWithJscpd({
        files: [join(tempDir, "a.ts"), join(tempDir, "b.ts")],
        cwd: tempDir,
        toolConfig: TEST_QUALITY_CONFIG.tools.jscpd,
        format: TEST_QUALITY_CONFIG.jscpd.formatByCodeArea["typescript-production-scripts"],
        minimumTokens: 20
      });

      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.fragments.length, 1);
        assert.equal(result.fragments[0]!.locations.length, 2);
        assert.deepEqual(result.fragments[0]!.locations.map((location) => location.path), ["a.ts", "b.ts"]);
        assert.equal(result.fragments[0]!.hitsChangedScope, false);
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("classifies non-zero jscpd exits as execution failures", () => {
    const toolConfig = createFakeJscpdToolConfig({ stdout: "", stderr: "bad invocation", exitCode: 2 });

    try {
      const result = scanWithJscpd({
        files: ["scripts/a.ts", "scripts/b.ts"],
        cwd: REPO_ROOT,
        toolConfig,
        minimumTokens: 50,
        format: TEST_QUALITY_CONFIG.jscpd.formatByCodeArea["typescript-production-scripts"]
      });

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "jscpd-execution-error");
        assert.match(result.error, /jscpd exit 2: bad invocation/);
      }
    } finally {
      toolConfig.cleanup();
    }
  });
});

function createFakeVersionToolConfig({
  stdout,
  stderr,
  exitCode
}: {
  exitCode: number;
  stderr: string;
  stdout: string;
}) {
  const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-quality-version-tool-"));
  const fakeToolPath = join(tempDir, "fake-version-tool.ts");

  writeFileSync(fakeToolPath, `
process.stdout.write(${JSON.stringify(stdout)});
console.error(${JSON.stringify(stderr)});
process.exit(${JSON.stringify(exitCode)});
`, "utf8");

  return {
    command: process.execPath,
    args: [fakeToolPath],
    cleanup: () => rmSync(tempDir, { recursive: true, force: true })
  };
}

function createFakeSccToolConfig(stdout: string) {
  const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-quality-scc-"));
  const fakeSccPath = join(tempDir, "fake-scc.ts");

  writeFileSync(fakeSccPath, `process.stdout.write(${JSON.stringify(stdout)});\n`, "utf8");

  return {
    command: process.execPath,
    args: [fakeSccPath],
    cleanup: () => rmSync(tempDir, { recursive: true, force: true })
  };
}

function createFakeJscpdToolConfig({
  reportJson,
  stdout,
  stderr,
  exitCode
}: {
  exitCode: number;
  reportJson?: string;
  stderr: string;
  stdout: string;
}) {
  const tempDir = mkdtempSync(join(tmpdir(), "docnav-quality-jscpd-"));
  const fakeJscpdPath = join(tempDir, "fake-jscpd.ts");

  writeFileSync(fakeJscpdPath, `
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const outputIndex = process.argv.indexOf("--output");
if (${JSON.stringify(reportJson)} !== undefined && outputIndex >= 0) {
  const outputDir = process.argv[outputIndex + 1];
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "jscpd-report.json"), ${JSON.stringify(reportJson)}, "utf8");
}
process.stdout.write(${JSON.stringify(stdout)});
console.error(${JSON.stringify(stderr)});
process.exit(${JSON.stringify(exitCode)});
`, "utf8");

  return {
    command: process.execPath,
    args: [fakeJscpdPath],
    cleanup: () => rmSync(tempDir, { recursive: true, force: true })
  };
}
