import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const PACKAGE_TOOL_FIXTURE_COMPILER_OPTIONS = {
  lib: ["esnext"],
  types: []
} as const;

export function repositoryBoundarySources(): Map<string, string> {
  return new Map([
    ["src/index.ts", "export {};\n"],
    ["src/package-checks/function-metrics/analyzer/pipeline.ts", "export {};\n"],
    [
      "src/package-checks/function-metrics/analyzer/port-facade.ts",
      'import "./pipeline.ts";\nexport {};\n'
    ],
    [
      "src/package-checks/function-metrics/analyzer/port-facade.test.ts",
      'import "./pipeline.ts";\nimport "./port-facade.ts";\n'
    ],
    [
      "src/package-checks/function-metrics/analyzer-adapter.ts",
      'import "./analyzer/port-facade.ts";\nexport {};\n'
    ],
    [
      "src/package-checks/function-metrics/analyzer-adapter.test.ts",
      'import "./analyzer-adapter.ts";\n'
    ],
    [
      "src/package-checks/function-metrics/analyzer-worker.ts",
      'import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";\nvoid analyzeFunctionMetricsSources;\n'
    ],
    [
      "src/package-checks/function-metrics/target-files.ts",
      'import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";\nvoid analyzeFunctionMetricsSources;\n'
    ]
  ]);
}

export function createTargetLayout(): string {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-repository-layout-"));
  writeFileSync(join(root, "package.json"), '{"type":"module"}\n', "utf8");
  for (const [path, source] of repositoryBoundarySources()) writeSource(root, path, source);
  return root;
}

export function writePackageToolContract(root: string): void {
  // This fixture's Core uses no host globals; the real repository keeps its own compiler profile.
  writeSource(
    root,
    "tsconfig.json",
    JSON.stringify({ compilerOptions: PACKAGE_TOOL_FIXTURE_COMPILER_OPTIONS })
  );
  writeSource(
    root,
    "src/check/public-contract.ts",
    [
      "export interface PublicContract {",
      "  readonly value: string;",
      "}",
      "export interface PrivateContract {",
      "  readonly privateValue: string;",
      "}",
      'export const publicValue = "public";',
      "export const publicCallback = (value: string): string => value;"
    ].join("\n")
  );
  writeSource(
    root,
    "src/index.ts",
    [
      'export { publicCallback, publicValue } from "./check/public-contract.ts";',
      'export type { PublicContract as ConsumerContract } from "./check/public-contract.ts";'
    ].join("\n")
  );
  writeSource(
    root,
    "src/package-tools/consumer/tool.ts",
    [
      'import { createHash } from "node:crypto";',
      'import { promises as fs } from "node:fs";',
      'import { join } from "node:path";',
      'import { publicCallback, publicValue } from "../../check/public-contract.ts";',
      'import type { PublicContract } from "../../check/public-contract.ts";',
      "",
      "void createHash;",
      "void fs;",
      "void join;",
      "export const packageTool = publicCallback(publicValue);",
      "export type ConsumerContract = PublicContract;",
      'export type { PublicContract as PackageToolContract } from "../../check/public-contract.ts";'
    ].join("\n")
  );
}

export function writeSource(root: string, relativePath: string, source: string): void {
  const path = join(root, relativePath);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, source, "utf8");
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
