import {
  mkdirSync,
  mkdtempSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createEmptyMetrics } from "../../model/schema.ts";
import type {
  ResolvedQualityConfig,
  ToolAvailability
} from "../../model/schema.ts";
import {
  TEST_QUALITY_CONFIG,
  TEST_SCANNER_DEPENDENCIES
} from "../../../test/config.ts";
import type { ScannerDependencySnapshot } from "../../../../scanner-dependencies.ts";
import type { ScanContext } from "./scan-context.ts";

interface ScannerTestContext {
  readonly context: ScanContext;
  readonly tempDir: string;
}

export function createLizardTestContext(
  tempPrefix: string,
  scriptSource: string
): ScannerTestContext {
  return createScannerTestContext(
    tempPrefix,
    "function",
    "lizard",
    scriptSource
  );
}

export function createSccTestContext(
  tempPrefix: string,
  scriptSource: string
): ScannerTestContext {
  return createScannerTestContext(tempPrefix, "file", "scc", scriptSource);
}

export function createJscpdTestContext(
  tempPrefix: string,
  scriptSource: string
): ScannerTestContext {
  const fixture = createScannerTestContext(
    tempPrefix,
    "duplication",
    "jscpd",
    scriptSource
  );
  fixture.context.fingerprints["typescript-production-scripts"] = {
    fileCount: 2,
    fileList: ["scripts/a.ts", "scripts/b.ts"],
    fingerprint: "sha256:test"
  };
  return fixture;
}

export function createScanContext(
  root: string,
  config: ResolvedQualityConfig,
  toolResults: ToolAvailability[],
  dependencies: ScannerDependencySnapshot = TEST_SCANNER_DEPENDENCIES
): ScanContext {
  const rawDir = join(root, "raw");
  mkdirSync(rawDir, { recursive: true });
  return {
    cacheRootDir: join(root, "cache"),
    changedFiles: [],
    config,
    dependencies,
    fingerprints: {},
    metrics: createEmptyMetrics({
      configVersion: config.version,
      commitSha: "abc123",
      repository: root,
      scope: {
        excludeDirs: [...config.excludeDirs],
        generatedFiles: [...config.generatedFiles],
        include: [...config.include]
      },
      tools: []
    }),
    rawDir,
    root,
    toolResults
  };
}

function createScannerTestContext(
  tempPrefix: string,
  scanner: keyof ScannerDependencySnapshot,
  tool: ToolAvailability["name"],
  scriptSource: string
): ScannerTestContext {
  const tempDir = mkdtempSync(join(tmpdir(), tempPrefix));
  const fakeScannerPath = join(tempDir, `fake-${tool}.ts`);
  writeFileSync(fakeScannerPath, scriptSource, "utf8");
  const dependencies = dependenciesWithScanner(
    scanner,
    process.execPath,
    [fakeScannerPath]
  );
  return {
    context: createScanContext(
      tempDir,
      TEST_QUALITY_CONFIG,
      [availableTool(tool)],
      dependencies
    ),
    tempDir
  };
}

export function dependenciesWithScanner(
  scanner: keyof ScannerDependencySnapshot,
  executable: string,
  args: string[]
): ScannerDependencySnapshot {
  return {
    ...TEST_SCANNER_DEPENDENCIES,
    [scanner]: {
      ...TEST_SCANNER_DEPENDENCIES[scanner],
      args,
      availabilityArgs: [...args, "--version"],
      executable
    }
  };
}

export function availableTool(name: ToolAvailability["name"]): ToolAvailability {
  return {
    available: true,
    error: null,
    name,
    source: "test",
    version: "test"
  };
}

export async function withMutedConsoleLog<T>(callback: () => Promise<T>): Promise<T> {
  const originalLog: typeof console.log = console.log;
  console.log = () => undefined;
  try {
    return await callback();
  } finally {
    console.log = originalLog;
  }
}

export async function captureConsoleLogs<T>(
  callback: () => Promise<T>
): Promise<{ logs: string[]; result: T }> {
  const logs: string[] = [];
  const originalLog: typeof console.log = console.log;
  console.log = (...values: unknown[]) => {
    logs.push(values.map(String).join(" "));
  };
  try {
    return { logs, result: await callback() };
  } finally {
    console.log = originalLog;
  }
}
