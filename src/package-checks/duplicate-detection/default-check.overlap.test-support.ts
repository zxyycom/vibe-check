import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { defaultProjectFileSelection } from "../project-files/configuration.ts";
import { duplicateDetection } from "./default-check.ts";
import { executeDuplicateDetection } from "./execution.ts";
import { DUPLICATE_DETAILS } from "./finding-messages.test-support.ts";
import { parseDuplicateDetectionData } from "./final-data.ts";
import { execute, FILES, scanner } from "./default-check.execution.test-support.ts";

export function createCommonAreaCheck(root: string) {
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "scripts", "b.ts"), "export const b = 2;\n", "utf8");
  writeFileSync(join(root, "scripts", "isolated.ts"), "export const isolated = 2;\n", "utf8");
  writeFileSync(join(root, "src", "a.ts"), "export const a = 1;\n", "utf8");
  writeFileSync(join(root, "src", "isolated.ts"), "export const isolated = 1;\n", "utf8");
  const scanCountPath = join(root, "scan-count.txt");
  const report = JSON.stringify({
    duplicates: [
      duplicateReportItem(120, 5, 8),
      duplicateReportItem(80, 20, 12),
      duplicateReportItem(120, 40, 12),
      duplicateReportItem(200, 60, 20, "src/isolated.ts", "scripts/isolated.ts")
    ]
  });
  const executable = scanner(
    root,
    [
      "import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
      "import { join } from 'node:path';",
      "if (process.argv.includes('--version')) process.stdout.write('jscpd 5.0.11\\n');",
      "else {",
      "  const config = JSON.parse(readFileSync(process.argv[process.argv.indexOf('--config') + 1], 'utf8'));",
      `  if (config.minTokens !== 20 || config.minLines !== 3 || JSON.stringify(config.path) !== ${JSON.stringify(JSON.stringify([resolve(root, "scripts/b.ts"), resolve(root, "scripts/isolated.ts"), resolve(root, "src/a.ts"), resolve(root, "src/isolated.ts")]))}) process.exit(2);`,
      "  if (process.argv.includes('--workers')) process.exit(3);",
      `  const countPath = ${JSON.stringify(scanCountPath)};`,
      "  const count = existsSync(countPath) ? Number(readFileSync(countPath, 'utf8')) : 0;",
      "  writeFileSync(countPath, String(count + 1));",
      "  const output = process.argv[process.argv.indexOf('--output') + 1];",
      "  mkdirSync(output, { recursive: true });",
      `  writeFileSync(join(output, 'jscpd-report.json'), ${JSON.stringify(report)});`,
      "}"
    ].join("\n")
  );
  const codeAreas = {
    scripts: {
      files: { ...FILES, include: ["scripts/**/*.ts"] },
      minimumLines: 10,
      minimumTokens: 100
    },
    shared: {
      files: { ...FILES, include: ["scripts/b.ts", "src/a.ts"] },
      minimumLines: 10,
      minimumTokens: 90
    },
    source: {
      files: { ...FILES, include: ["src/**/*.ts"] },
      minimumLines: 3,
      minimumTokens: 20
    }
  };
  const check = duplicateDetection({
    cache: { directory: ".cache/vibe-check", enabled: true },
    codeAreas,
    findingPolicy: "non-blocking",
    scanner: {
      command: { executable, kind: "custom" }
    }
  });
  return { options: check.options, scanCountPath };
}

export function assertDefaultCheckComposition(): void {
  const defaultCheck = duplicateDetection();
  assert.equal(defaultCheck.parseData, parseDuplicateDetectionData);
  assert.deepEqual(defaultCheck.parseData({ blockingFindingCount: 1, findingCount: 2 }), {
    blockingFindingCount: 1,
    findingCount: 2
  });
  assert.throws(
    () => defaultCheck.parseData({ blockingFindingCount: 2, findingCount: 1 }),
    /duplicateDetection final data/
  );
  assert.deepEqual(defaultCheck.options, {
    cache: { directory: ".cache/vibe-check", enabled: true },
    codeAreas: {
      project: {
        files: defaultProjectFileSelection,
        findingPolicy: "non-blocking",
        minimumLines: 4,
        minimumTokens: 100
      }
    },
    findingWaivers: [],
    scanner: { command: { kind: "package" } }
  });
  assert.equal(Object.isFrozen(defaultCheck.options), true);
  assert.deepEqual(
    duplicateDetection({
      codeAreas: { source: { files: { include: ["src/**/*.ts"] } } }
    }).options.codeAreas.source,
    {
      files: {
        exclude: defaultCheck.options.codeAreas.project.files.exclude,
        include: ["src/**/*.ts"],
        source: "filesystem"
      },
      findingPolicy: "non-blocking",
      minimumLines: 4,
      minimumTokens: 100
    }
  );
  const specialAreaId = "__proto__";
  const specialAreaCheck = duplicateDetection({
    codeAreas: Object.fromEntries([[specialAreaId, { files: {} }]])
  });
  assert.equal(Object.hasOwn(specialAreaCheck.options.codeAreas, specialAreaId), true);
  assert.deepEqual(specialAreaCheck.options.codeAreas[specialAreaId], {
    files: defaultCheck.options.codeAreas.project.files,
    findingPolicy: "non-blocking",
    minimumLines: 4,
    minimumTokens: 100
  });
}

export async function assertInitialCommonAreaResult(
  options: ReturnType<typeof duplicateDetection>["options"],
  root: string,
  scanCountPath: string
): Promise<void> {
  const result = await execute(executeDuplicateDetection, options, root);
  assert.deepEqual(result.result, {
    status: "passed",
    data: { blockingFindingCount: 0, findingCount: 1 },
    messages: [
      {
        code: "non-blocking-findings",
        level: "warning",
        message:
          "1 non-blocking finding(s) were recorded; inspect this Check's Records for affected paths and measurements, then update the code or policy."
      },
      DUPLICATE_DETAILS.overlapWarning
    ]
  });
  assert.equal(readFileSync(scanCountPath, "utf8"), "1");
  assert.equal(result.records.length, 1);
  assert.deepEqual(result.records[0]?.data, {
    blocking: false,
    codeAreas: ["shared"],
    lineCount: 12,
    locations: [
      { endLine: 51, path: "scripts/b.ts", startLine: 40 },
      { endLine: 51, path: "src/a.ts", startLine: 40 }
    ],
    metric: "duplicate-tokens",
    tokenCount: 120
  });
}

export async function assertReevaluatedCommonAreaPolicies(
  options: ReturnType<typeof duplicateDetection>["options"],
  root: string,
  scanCountPath: string
): Promise<void> {
  const blockingCommonArea = await execute(
    executeDuplicateDetection,
    {
      ...options,
      codeAreas: {
        ...options.codeAreas,
        shared: { ...options.codeAreas.shared, findingPolicy: "blocking" }
      }
    },
    root
  );
  assert.deepEqual(blockingCommonArea.result, {
    status: "failed",
    data: { blockingFindingCount: 1, findingCount: 1 },
    messages: [
      {
        code: "blocking-findings",
        level: "error",
        message:
          "1 blocking finding(s) require attention; inspect this Check's Records for affected paths and measurements, then update the code or policy."
      },
      DUPLICATE_DETAILS.overlapError
    ]
  });
  assert.equal(Reflect.get(blockingCommonArea.records[0]?.data ?? {}, "blocking"), true);
  assert.equal(readFileSync(scanCountPath, "utf8"), "1");
  const stricter = await execute(
    executeDuplicateDetection,
    {
      ...options,
      codeAreas: {
        ...options.codeAreas,
        shared: { ...options.codeAreas.shared, minimumTokens: 130 }
      }
    },
    root
  );
  assert.deepEqual(stricter.result, {
    status: "passed",
    data: { blockingFindingCount: 0, findingCount: 0 }
  });
  assert.equal(stricter.records.length, 0);
  assert.equal(readFileSync(scanCountPath, "utf8"), "1");
}

function duplicateReportItem(
  tokens: number,
  startLine: number,
  lineCount: number,
  firstPath = "src/a.ts",
  secondPath = "scripts/b.ts"
): object {
  return {
    firstFile: {
      name: firstPath,
      startLoc: { line: startLine },
      endLoc: { line: startLine + lineCount - 1 }
    },
    secondFile: {
      name: secondPath,
      startLoc: { line: startLine },
      endLoc: { line: startLine + lineCount - 1 }
    },
    lines: lineCount,
    tokens
  };
}
