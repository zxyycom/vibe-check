import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type {
  CheckDependencies,
  CheckExecution,
  CheckExecutionContext,
  CheckProjectContext,
  CheckResult,
  DeepReadonly
} from "../../check/check.ts";
import { fileMetrics } from "./constructor.ts";
import { executeFileMetrics } from "./execution.ts";
import { parseFileMetricsData } from "./final-data.ts";
import { isValidResolvedFileMetricsOptions } from "./options-validation.ts";
import { defaultProjectFileSelection } from "../project-files/configuration.ts";

const FILES = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*.ts"]),
  source: "filesystem" as const
});

const NO_DEPENDENCIES: CheckDependencies = Object.freeze({
  get: (checkId: string) =>
    Object.freeze({
      ok: false,
      error: Object.freeze({ code: "dependency-not-declared", checkId })
    })
});

function project(root: string): CheckProjectContext {
  return Object.freeze({
    flags: Object.freeze([]),
    root
  });
}

async function execute<Options extends object>(
  callback: CheckExecution<Options>,
  options: DeepReadonly<Options>,
  root: string,
  signal: AbortSignal = new AbortController().signal
): Promise<
  Readonly<{
    readonly records: readonly ReportedRecord[];
    readonly result: CheckResult;
  }>
> {
  const records: ReportedRecord[] = [];
  const context: CheckExecutionContext<Options> = Object.freeze({
    dependencies: NO_DEPENDENCIES,
    options,
    project: project(root),
    records: Object.freeze({
      report: (identity: Readonly<{ readonly id: string }>, data: object): void => {
        records.push(Object.freeze({ data, identity }));
      }
    }),
    signal
  });
  const result = await callback(context);
  return Object.freeze({ records: Object.freeze(records), result });
}

interface ReportedRecord {
  readonly data: object;
  readonly identity: Readonly<{ readonly id: string }>;
}

function createRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "scripts", "b.ts"), "export const b = 2;\n", "utf8");
  writeFileSync(join(root, "src", "a.ts"), "export const a = 1;\n", "utf8");
  return root;
}

function scanner(root: string, source: string): string {
  const path = join(root, "scanner.mjs");
  writeFileSync(path, `#!/usr/bin/env bun\n${source}`, "utf8");
  chmodSync(path, 0o755);
  return path;
}

describe("fileMetrics constructor and direct callback", () => {
  it("materializes closed defaults and rejects malformed authored or resolved policy", async () => {
    const defaultCheck = fileMetrics();
    assert.equal(defaultCheck.parseData, parseFileMetricsData);
    assert.deepEqual(defaultCheck.parseData({ blockingFindingCount: 0, findingCount: 1 }), {
      blockingFindingCount: 0,
      findingCount: 1
    });
    assert.throws(
      () => defaultCheck.parseData({ blockingFindingCount: 2, findingCount: 1 }),
      /fileMetrics final data/
    );
    assert.deepEqual(defaultCheck.options, {
      codeAreas: {
        project: {
          codeLines: {
            lowDecisionTokenAllowance: {
              maximumCodeLines: 600,
              maximumDecisionTokens: 12
            },
            maximum: 360
          },
          files: defaultProjectFileSelection,
          findingPolicy: "non-blocking"
        }
      },
      scanner: { executable: "scc" }
    });
    assert.equal(Object.isFrozen(defaultCheck.options), true);
    assert.deepEqual(
      fileMetrics({
        codeAreas: {
          source: {
            files: { include: ["src/**/*.ts"] },
            codeLines: { maximum: 200 }
          }
        }
      }).options.codeAreas.source,
      {
        codeLines: {
          lowDecisionTokenAllowance: {
            maximumCodeLines: 600,
            maximumDecisionTokens: 12
          },
          maximum: 200
        },
        files: {
          exclude: defaultCheck.options.codeAreas.project.files.exclude,
          include: ["src/**/*.ts"],
          source: "filesystem"
        },
        findingPolicy: "non-blocking"
      }
    );
    const specialAreaId = "__proto__";
    const specialAreaCheck = fileMetrics({
      codeAreas: Object.fromEntries([[specialAreaId, { files: {} }]])
    });
    assert.equal(Object.hasOwn(specialAreaCheck.options.codeAreas, specialAreaId), true);

    const sourceArea = defaultCheck.options.codeAreas.project;
    for (const invalidOptions of [
      { ...defaultCheck.options, codeAreas: {} },
      {
        ...defaultCheck.options,
        codeAreas: {
          source: { ...sourceArea, codeLines: { ...sourceArea.codeLines, maximum: -1 } }
        }
      },
      {
        ...defaultCheck.options,
        codeAreas: { source: { ...sourceArea, findingPolicy: "warning" } }
      },
      {
        ...defaultCheck.options,
        codeAreas: {
          source: {
            ...sourceArea,
            codeLines: {
              ...sourceArea.codeLines,
              lowDecisionTokenAllowance: {
                ...sourceArea.codeLines.lowDecisionTokenAllowance,
                maximumCodeLines: sourceArea.codeLines.maximum
              }
            }
          }
        }
      },
      { ...defaultCheck.options, scanner: { executable: "scc", args: [] } }
    ]) {
      assert.equal(isValidResolvedFileMetricsOptions(invalidOptions), false);
    }

    for (const invalidInput of [
      { codeAreas: {} },
      { codeAreas: { source: { files: { generatedFiles: [] } } } },
      { findingPolicy: "warning" },
      { codeAreas: { source: { codeLines: { maximum: 300 } } } },
      { codeAreas: { source: { files: {}, codeLines: { maximum: -1 } } } },
      { codeAreas: { source: { files: {}, codeLines: { maximum: 1.5 } } } },
      {
        codeAreas: {
          source: {
            files: {},
            codeLines: {
              maximum: 300,
              lowDecisionTokenAllowance: { maximumCodeLines: 300 }
            }
          }
        }
      },
      { files: FILES },
      { scanner: { executable: "" } },
      { scanner: { executable: "scc", availabilityArgs: ["--version"] } }
    ]) {
      assert.throws(
        () => Reflect.apply(fileMetrics, undefined, [invalidInput]),
        /fileMetrics options must match/
      );
    }

    const invalidPreflight = await defaultCheck.preflight!(
      { ...defaultCheck.options, codeAreas: {} },
      new AbortController().signal
    );
    assert.equal(invalidPreflight.status, "failure");
    const root = createRoot("vibe-check-invalid-file-metrics-");
    try {
      assert.deepEqual(
        (await execute(executeFileMetrics, { ...defaultCheck.options, codeAreas: {} }, root))
          .result,
        {
          status: "unavailable",
          reason: { code: "invalid-options" },
          messages: [
            {
              code: "invalid-options",
              level: "error",
              message:
                "fileMetrics options are invalid; recreate the Check with fileMetrics(options) or restore its complete resolved options."
            }
          ]
        }
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("scans area-owned exact inputs once and applies the strictest overlapping area policy", async () => {
    const root = createRoot("vibe-check-area-file-metrics-");
    const scanCountPath = join(root, "scan-count.txt");
    const executable = scanner(
      root,
      [
        "import { existsSync, readFileSync, writeFileSync } from 'node:fs';",
        "if (process.argv.includes('--version')) process.stdout.write('scc version 3.7.0\\n');",
        "else {",
        `  const expected = ${JSON.stringify(["--by-file", "--format", "csv", "scripts/b.ts", "src/a.ts"])};`,
        "  if (JSON.stringify(process.argv.slice(2)) !== JSON.stringify(expected)) process.exit(2);",
        `  const countPath = ${JSON.stringify(scanCountPath)};`,
        "  const count = existsSync(countPath) ? Number(readFileSync(countPath, 'utf8')) : 0;",
        "  writeFileSync(countPath, String(count + 1));",
        "  process.stdout.write('Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC\\nTypeScript,,scripts/b.ts,600,550,20,30,5,1000,550\\nTypeScript,,src/a.ts,450,400,20,30,20,1000,400\\n');",
        "}"
      ].join("\n")
    );
    const check = fileMetrics({
      codeAreas: {
        scripts: {
          files: { ...FILES, include: ["scripts/**/*.ts"] },
          codeLines: {
            maximum: 400,
            lowDecisionTokenAllowance: {
              maximumCodeLines: 600,
              maximumDecisionTokens: 10
            }
          }
        },
        shared: {
          files: FILES,
          codeLines: {
            maximum: 450,
            lowDecisionTokenAllowance: {
              maximumCodeLines: 700,
              maximumDecisionTokens: 10
            }
          }
        },
        source: {
          files: { ...FILES, include: ["src/**/*.ts"] },
          codeLines: {
            maximum: 300,
            lowDecisionTokenAllowance: {
              maximumCodeLines: 500,
              maximumDecisionTokens: 10
            }
          }
        }
      },
      scanner: { executable }
    });

    try {
      const result = await execute(executeFileMetrics, check.options, root);
      assert.deepEqual(result.result, {
        status: "passed",
        data: { blockingFindingCount: 0, findingCount: 1 },
        messages: [
          {
            code: "non-blocking-findings",
            level: "warning",
            message:
              "1 non-blocking finding(s) were recorded; inspect this Check's Records for affected paths and measurements, then update the code or policy."
          }
        ]
      });
      assert.equal(existsSync(scanCountPath), true);
      assert.equal(readFileSync(scanCountPath, "utf8"), "1");
      assert.deepEqual(result.records, [
        {
          data: {
            blocking: false,
            codeAreas: ["shared", "source"],
            codeLines: 400,
            limit: 300,
            metric: "code-lines",
            path: "src/a.ts"
          },
          identity: { id: "src/a.ts" }
        }
      ]);
      const blockingOverlap = await execute(
        executeFileMetrics,
        {
          ...check.options,
          codeAreas: {
            ...check.options.codeAreas,
            source: { ...check.options.codeAreas.source, findingPolicy: "blocking" }
          }
        },
        root
      );
      assert.deepEqual(blockingOverlap.result, {
        status: "failed",
        data: { blockingFindingCount: 1, findingCount: 1 },
        messages: [
          {
            code: "blocking-findings",
            level: "error",
            message:
              "1 blocking finding(s) require attention; inspect this Check's Records for affected paths and measurements, then update the code or policy."
          }
        ]
      });
      assert.equal(Reflect.get(blockingOverlap.records[0]?.data ?? {}, "blocking"), true);
      assert.equal(readFileSync(scanCountPath, "utf8"), "2");
      const sourceUnavailable = await execute(
        executeFileMetrics,
        {
          ...check.options,
          codeAreas: {
            source: {
              ...check.options.codeAreas.source,
              files: { ...check.options.codeAreas.source.files, source: "git-worktree" }
            }
          }
        },
        root
      );
      assert.deepEqual(sourceUnavailable.result, {
        status: "unavailable",
        reason: { code: "source-unavailable" },
        messages: [
          {
            code: "source-unavailable",
            level: "error",
            message:
              "File metrics could not collect its configured project files; check the project root, file permissions, and selected file source."
          }
        ]
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
