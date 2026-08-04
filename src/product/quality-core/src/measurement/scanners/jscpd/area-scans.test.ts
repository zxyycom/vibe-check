import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ToolAvailability } from "../../../model/schema.ts";
import {
  planJscpdAreaScanTasks,
  scanJscpdAreasWithCache,
  type JscpdAreaScanFailure
} from "./area-scans.ts";
import {
  TEST_QUALITY_CONFIG,
  TEST_SCANNER_DEPENDENCIES
} from "../../../../test/config.ts";

describe("jscpd tasks", () => {
  it("plans one scan task per code area", () => {
    const tasks = planJscpdAreaScanTasks([
      {
        area: "rust-production",
        files: ["crates/b/src/lib.rs", "crates/a/src/lib.rs"],
        minimumTokens: 75
      },
      {
        area: "typescript-production-scripts",
        files: ["scripts/a.ts", "scripts/b.ts"],
        minimumTokens: 75
      }
    ]);

    assert.deepEqual(tasks.map((task) => task.id), [
      "jscpd:rust-production",
      "jscpd:typescript-production-scripts"
    ]);
    assert.deepEqual(tasks[0]!.files, [
      "crates/a/src/lib.rs",
      "crates/b/src/lib.rs"
    ]);
  });

  it("hands exact TypeScript, Rust, and mixed paths to jscpd without format overrides", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-jscpd-exact-input-"));
    const capturePath = join(tempDir, "invocations.ndjson");
    const fakeJscpdPath = join(tempDir, "capturing-jscpd.ts");
    const fileMap = new Map([
      [
        "typescript-production-scripts",
        [
          "scripts/a.ts",
          "scripts/b.ts",
          "vendor/ignored.ts",
          "scripts/generated/ignored.ts"
        ]
      ],
      [
        "rust-default",
        ["crates/b/src/lib.rs", "crates/a/src/lib.rs"]
      ],
      [
        "mixed-area",
        ["mixed/b.ts", "mixed/a.rs"]
      ],
      [
        "insufficient-area",
        ["single/only.ts", "single/generated/ignored.ts"]
      ]
    ]);
    const fingerprints = Object.fromEntries(
      Array.from(fileMap, ([area, files]) => [
        area,
        {
          fileCount: files.length,
          fileList: [...files],
          fingerprint: `sha256:${area}`
        }
      ])
    );

    writeFileSync(fakeJscpdPath, capturingJscpdSource(capturePath), "utf8");

    try {
      const fragments = await withMutedConsoleLog(() =>
        scanJscpdAreasWithCache({
          cacheRootDir: tempDir,
          commitSha: "exact-input",
          config: {
            ...TEST_QUALITY_CONFIG,
            checks: {
              ...TEST_QUALITY_CONFIG.checks,
              duplication: {
                ...TEST_QUALITY_CONFIG.checks.duplication,
                minimumTokensByCodeArea: {
                  ...TEST_QUALITY_CONFIG.checks.duplication.minimumTokensByCodeArea,
                  "mixed-area": 45
                }
              }
            },
            codeAreas: {
              ...TEST_QUALITY_CONFIG.codeAreas,
              "insufficient-area": testCodeArea("single/**/*.ts"),
              "mixed-area": testCodeArea("mixed/**/*.{rs,ts}"),
              "rust-default": testCodeArea("crates/**/*.rs")
            },
            excludeDirs: [...TEST_QUALITY_CONFIG.excludeDirs, "vendor"]
          },
          cwd: tempDir,
          dependency: {
            args: [fakeJscpdPath],
            availabilityArgs: [fakeJscpdPath, "--version"],
            executable: process.execPath,
            maxConcurrency: 1
          },
          fileMap,
          fingerprints,
          logPrefix: "",
          scanKind: "current",
          throwOnFailure: true,
          toolResults: availableJscpd()
        })
      );
      const invocations = readFileSync(capturePath, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as CapturedJscpdInvocation);

      assert.deepEqual(fragments, []);
      assert.deepEqual(
        invocations.map(({ config }) => ({
          minTokens: config.minTokens,
          path: config.path
        })),
        [
          {
            minTokens: 75,
            path: ["scripts/a.ts", "scripts/b.ts"]
          },
          {
            minTokens: 100,
            path: ["crates/a/src/lib.rs", "crates/b/src/lib.rs"]
          },
          {
            minTokens: 45,
            path: ["mixed/a.rs", "mixed/b.ts"]
          }
        ]
      );
      for (const invocation of invocations) {
        assert.equal(Object.hasOwn(invocation.config, "format"), false);
        assert.equal(invocation.argv.includes("--format"), false);
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("records current failures and throws baseline failures for invalid jscpd output", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "docnav-quality-jscpd-area-"));
    const fakeJscpdPath = join(tempDir, "fake-jscpd.ts");
    const scannerFailures: JscpdAreaScanFailure[] = [];

    writeFileSync(fakeJscpdPath, "process.exit(0);\n", "utf8");

    try {
      const scanOptions = {
        cacheRootDir: tempDir,
        commitSha: "abc123",
        config: TEST_QUALITY_CONFIG,
        cwd: tempDir,
        dependency: {
          ...TEST_SCANNER_DEPENDENCIES.duplication,
          args: [fakeJscpdPath],
          availabilityArgs: [fakeJscpdPath, "--version"],
          executable: process.execPath
        },
        fileMap: new Map([
          ["typescript-production-scripts", ["scripts/a.ts", "scripts/b.ts"]]
        ]),
        fingerprints: {
          "typescript-production-scripts": {
            fileCount: 2,
            fileList: ["scripts/a.ts", "scripts/b.ts"],
            fingerprint: "sha256:test"
          }
        },
        logPrefix: "",
        toolResults: availableJscpd()
      };
      const fragments = await withMutedConsoleLog(() =>
        scanJscpdAreasWithCache({
          ...scanOptions,
          scanKind: "current",
          scannerFailures,
          throwOnFailure: false
        })
      );

      assert.deepEqual(fragments, []);
      assert.equal(scannerFailures.length, 1);
      assert.equal(scannerFailures[0]!.reason, "jscpd-report-failure");
      assert.match(
        scannerFailures[0]!.error,
        /jscpd scan failed for task jscpd:typescript-production-scripts/
      );
      assert.match(scannerFailures[0]!.error, /jscpd JSON report missing/);

      await assert.rejects(
        withMutedConsoleLog(() =>
          scanJscpdAreasWithCache({
            ...scanOptions,
            scanKind: "baseline",
            throwOnFailure: true
          })
        ),
        /baseline jscpd scan failed for task jscpd:typescript-production-scripts/
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

async function withMutedConsoleLog<T>(callback: () => Promise<T>): Promise<T> {
  const originalLog: typeof console.log = console.log;
  console.log = () => undefined;
  try {
    return await callback();
  } finally {
    console.log = originalLog;
  }
}

function availableJscpd(): ToolAvailability[] {
  return [{
    name: "jscpd",
    available: true,
    version: "5.0.11",
    error: null,
    source: "repository devDependency"
  }];
}

type CapturedJscpdInvocation = {
  argv: string[];
  config: Record<string, unknown>;
};

function capturingJscpdSource(capturePath: string): string {
  return `
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const configIndex = process.argv.indexOf("--config");
const outputIndex = process.argv.indexOf("--output");
if (configIndex < 0 || outputIndex < 0) throw new Error("missing jscpd invocation paths");
const config = JSON.parse(readFileSync(process.argv[configIndex + 1], "utf8"));
appendFileSync(
  ${JSON.stringify(capturePath)},
  JSON.stringify({ argv: process.argv.slice(2), config }) + "\\n",
  "utf8"
);
const outputDir = process.argv[outputIndex + 1];
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, "jscpd-report.json"), '{"duplicates":[]}', "utf8");
`;
}

function testCodeArea(glob: string) {
  return {
    description: "Exact-input characterization area",
    excludeGlobs: [],
    globs: [glob],
    warningPolicy: "moderate" as const
  };
}
