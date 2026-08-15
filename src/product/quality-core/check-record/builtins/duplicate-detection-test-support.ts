import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { DuplicationScannerDependency } from "../../../scanner-dependencies/index.ts";
import { resolveCheckCatalog, type ResolvedCheckCatalog } from "../catalog.ts";
import {
  DUPLICATE_DETECTION_CHECK_DEFINITION,
  createDuplicateDetectionBinding,
  resolveDuplicateDetectionApplicability,
  type DuplicateDetectionExactInputSet,
  type DuplicateDetectionReferenceInput
} from "./duplicate-detection.ts";

export const duplicateDetectionSemantics = {
  codeAreas: {
    source: {
      description: "Source",
      excludeGlobs: [],
      globs: ["src/**/*.ts"],
      warningPolicy: "moderate"
    },
    tests: {
      description: "Tests",
      excludeGlobs: [],
      globs: ["test/**/*.ts"],
      warningPolicy: "moderate"
    }
  },
  changedDelta: 0,
  configVersion: "1"
} as const;

export interface JscpdFixture {
  readonly cacheRoot: string;
  readonly capturePath: string;
  readonly cleanup: () => void;
  readonly currentRoot: string;
  readonly dependency: DuplicationScannerDependency;
  readonly referenceRoot: string;
}

export function createDuplicateTestRuntime(
  fixture: JscpdFixture,
  current: DuplicateDetectionExactInputSet,
  reference: DuplicateDetectionReferenceInput | null,
  changedFiles: readonly string[] = current.areas.flatMap((areaInput) => (
    areaInput.approvedExactPaths
  ))
) {
  return createDuplicateDetectionBinding({
    changedFiles,
    current,
    dependency: fixture.dependency,
    reference,
    semantics: duplicateDetectionSemantics
  });
}

export function resolveDuplicateTestCatalog(
  binding: ReturnType<typeof createDuplicateDetectionBinding>["binding"],
  input: DuplicateDetectionExactInputSet
): ResolvedCheckCatalog {
  const catalog = resolveCheckCatalog({
    invocationKey: "duplicate-detection-test",
    definitions: [DUPLICATE_DETECTION_CHECK_DEFINITION],
    bindings: [{ checkId: "duplicate-detection", execute: binding }],
    schedules: [{ checkId: "duplicate-detection", requiresChecks: [] }],
    selectedCheckIds: ["duplicate-detection"],
    resolveApplicability: () => resolveDuplicateDetectionApplicability(input.areas)
  });
  if (!catalog.ok) throw new Error("Expected duplicate-detection catalog to resolve");
  return catalog.value;
}

export function currentDuplicateInput(fixture: JscpdFixture) {
  return {
    rootDir: fixture.currentRoot,
    cacheRootDir: fixture.cacheRoot,
    commitSha: "current-commit",
    areas: [duplicateArea("source", ["src/a.ts", "src/b.ts"])]
  } as const;
}

export function emptyDuplicateInput(fixture: JscpdFixture) {
  return {
    rootDir: fixture.currentRoot,
    cacheRootDir: fixture.cacheRoot,
    commitSha: "current-commit",
    areas: []
  } as const;
}

export function referenceDuplicateInput(fixture: JscpdFixture) {
  return {
    referenceName: "baseline",
    rootDir: fixture.referenceRoot,
    cacheRootDir: fixture.cacheRoot,
    commitSha: "reference-commit",
    areas: [duplicateArea("source", ["src/a.ts", "src/b.ts"])]
  } as const;
}

export function duplicateArea(codeArea: string, paths: readonly string[]) {
  return {
    codeArea,
    approvedExactPaths: [...paths],
    minimumTokens: 50,
    inputFingerprint: {
      fileCount: paths.length,
      fileList: [...paths],
      fingerprint: `sha256:${codeArea}:${paths.join("|")}`
    }
  } as const;
}

export function createJscpdFixture(input: Readonly<{
  currentReports: Readonly<Record<string, string>>;
  referenceReports: Readonly<Record<string, string>>;
}>): JscpdFixture {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-duplicate-detection-"));
  const currentRoot = join(root, "current");
  const referenceRoot = join(root, "reference");
  const cacheRoot = join(root, "cache");
  const capturePath = join(root, "scans.ndjson");
  const scannerPath = join(root, "controlled-jscpd.ts");
  mkdirSync(currentRoot, { recursive: true });
  mkdirSync(referenceRoot, { recursive: true });
  mkdirSync(cacheRoot, { recursive: true });
  writeFileSync(scannerPath, controlledJscpdSource(input, capturePath), "utf8");
  return {
    cacheRoot,
    capturePath,
    currentRoot,
    referenceRoot,
    dependency: {
      executable: process.execPath,
      args: [scannerPath],
      availabilityArgs: [scannerPath, "--version"],
      maxConcurrency: 1
    },
    cleanup: () => rmSync(root, { recursive: true, force: true })
  };
}

function controlledJscpdSource(
  input: Readonly<{
    currentReports: Readonly<Record<string, string>>;
    referenceReports: Readonly<Record<string, string>>;
  }>,
  capturePath: string
): string {
  return `
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
if (process.argv.includes("--version")) {
  process.stdout.write("cpd 5.0.11\\n");
} else {
  const configPath = process.argv[process.argv.indexOf("--config") + 1];
  const outputDir = process.argv[process.argv.indexOf("--output") + 1];
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const reports = process.cwd().endsWith("/reference")
    ? ${JSON.stringify(input.referenceReports)}
    : ${JSON.stringify(input.currentReports)};
  const report = reports[config.path[0]] ?? ${JSON.stringify(emptyDuplicateReport())};
  appendFileSync(${JSON.stringify(capturePath)}, JSON.stringify(config.path) + "\\n", "utf8");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "jscpd-report.json"), report, "utf8");
}
`;
}

export function duplicateReport(
  firstPath: string,
  secondPath: string,
  tokens: number,
  lines: number
): string {
  return duplicateReports([{ firstStart: 10, secondStart: 20 }], {
    firstPath,
    lines,
    secondPath,
    tokens
  });
}

export function duplicateReports(
  locations: readonly Readonly<{ firstStart: number; secondStart: number }>[],
  shape: Readonly<{
    firstPath: string;
    lines: number;
    secondPath: string;
    tokens: number;
  }> = {
    firstPath: "src/a.ts",
    lines: 12,
    secondPath: "src/b.ts",
    tokens: 80
  }
): string {
  return JSON.stringify({
    duplicates: locations.map(({ firstStart, secondStart }) => ({
      firstFile: {
        name: shape.firstPath,
        startLoc: { line: firstStart },
        endLoc: { line: firstStart + shape.lines - 1 }
      },
      secondFile: {
        name: shape.secondPath,
        startLoc: { line: secondStart },
        endLoc: { line: secondStart + shape.lines - 1 }
      },
      lines: shape.lines,
      tokens: shape.tokens
    }))
  });
}

export function emptyDuplicateReport(): string {
  return JSON.stringify({ duplicates: [] });
}

export function scanInvocationCount(path: string): number {
  try {
    return readFileSync(path, "utf8").trim().split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}

export function createDuplicateOutcomeFixtures() {
  const zero = createJscpdFixture({
    currentReports: { "src/a.ts": emptyDuplicateReport() },
    referenceReports: {}
  });
  const invalid = createJscpdFixture({
    currentReports: { "src/a.ts": "{" },
    referenceReports: {}
  });
  const outside = createJscpdFixture({
    currentReports: {
      "src/a.ts": duplicateReport("src/a.ts", "../outside.ts", 80, 12)
    },
    referenceReports: {}
  });
  const unavailableRoot = mkdtempSync(join(tmpdir(), "vibe-check-duplicate-unavailable-"));
  const unavailableInput = { ...currentDuplicateInput(zero), rootDir: unavailableRoot };
  const unavailableRuntime = createDuplicateDetectionBinding({
    changedFiles: [],
    current: unavailableInput,
    dependency: {
      executable: join(unavailableRoot, "missing-jscpd"),
      args: [],
      availabilityArgs: ["--version"],
      maxConcurrency: 1
    },
    reference: null,
    semantics: duplicateDetectionSemantics
  });
  return {
    zero,
    failures: [
      { expectedCategory: "invalid-result", fixture: invalid },
      { expectedCategory: "invalid-result", fixture: outside }
    ] as const,
    unavailable: { input: unavailableInput, runtime: unavailableRuntime },
    cleanup: () => {
      zero.cleanup();
      invalid.cleanup();
      outside.cleanup();
      rmSync(unavailableRoot, { recursive: true, force: true });
    }
  };
}
