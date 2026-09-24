import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PRODUCT_OWNERS = [
  "check",
  "check-settlement",
  "data-boundary",
  "machine-output",
  "package-checks",
  "package-tools",
  "project-definition",
  "project-run"
];

export function createTargetLayout(): string {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-layout-characterization-"));
  writeFileSync(join(root, "package.json"), '{"type":"module"}\n', "utf8");
  writeSource(root, "src/index.ts", "export {};\n");
  for (const owner of PRODUCT_OWNERS) {
    if (owner === "package-tools") {
      // The owner exists even when its optional production surface is empty.
      mkdirSync(join(root, "src", owner), { recursive: true });
    } else {
      writeSource(root, `src/${owner}/${owner}.ts`, "export {};\n");
    }
  }
  writeSource(root, "src/package-checks/function-metrics/analyzer/pipeline.ts", "export {};\n");
  writeSource(
    root,
    "src/package-checks/function-metrics/analyzer/port-facade.ts",
    'import "./pipeline.ts";\nexport {};\n'
  );
  writeSource(
    root,
    "src/package-checks/function-metrics/analyzer/port-facade.test.ts",
    'import "./pipeline.ts";\nimport "./port-facade.ts";\nexport {};\n'
  );
  writeSource(
    root,
    "src/package-checks/function-metrics/analyzer-adapter.ts",
    'import "./analyzer/port-facade.ts";\nexport {};\n'
  );
  writeSource(
    root,
    "src/package-checks/function-metrics/analyzer-adapter.test.ts",
    'import "./analyzer-adapter.ts";\nexport {};\n'
  );
  writeSource(
    root,
    "src/package-checks/function-metrics/analyzer-worker.ts",
    'import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";\nvoid analyzeFunctionMetricsSources;\n'
  );
  writeSource(
    root,
    "src/package-checks/function-metrics/target-files.ts",
    [
      'import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";',
      '// import { analyzeSourceCode } from "./analyzer/pipeline.ts";',
      "void analyzeFunctionMetricsSources;"
    ].join("\n")
  );
  writeSource(
    root,
    "scripts/package/artifact/build.ts",
    [
      "const entries = PACKAGE_RUNTIME_COMPILER_SOURCE_PATHS.map((sourcePath) =>",
      "  join(repositoryRoot, sourcePath)",
      ");",
      "void entries;"
    ].join("\n")
  );
  writeSource(
    root,
    "scripts/package/package-contract.ts",
    [
      'export const PACKAGE_FUNCTION_METRICS_WORKER_SOURCE_PATH = "src/package-checks/function-metrics/analyzer-worker.ts";',
      "export const PACKAGE_RUNTIME_COMPILER_SOURCE_PATHS = Object.freeze([",
      '  "src/index.ts",',
      "  PACKAGE_FUNCTION_METRICS_WORKER_SOURCE_PATH",
      "]);"
    ].join("\n")
  );
  for (const path of [
    "scripts/project/gate/definition.test.ts",
    "scripts/project/gate/definition.ts",
    "scripts/project/gate/run.test.ts",
    "scripts/project/gate/run.ts",
    "scripts/project/gate/checks/process/process.ts",
    "scripts/project/gate/runtime/bound-run.ts"
  ]) {
    writeSource(root, path, "export {};\n");
  }
  writeSource(root, "scripts/package/candidate/prepare.ts", "export {};\n");
  return root;
}

export function writePackageToolContract(root: string): void {
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
