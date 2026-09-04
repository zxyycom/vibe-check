import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import { collectFilePaths } from "../file-inventory.ts";
import {
  PACKAGE_FUNCTION_METRICS_MEASUREMENT_RUNTIME_PATH,
  PACKAGE_FUNCTION_METRICS_WORKER_RUNTIME_PATH,
  PACKAGE_RUNTIME_DIRECTORY
} from "../package-contract.ts";
import { relativeEsmModuleSpecifiers } from "./esm-module-specifiers.ts";
import { assertRuntimeSourceMapMatchesSource } from "./runtime-source-maps.ts";

/** Audits the emitted ESM tree and the function-metrics Worker runtime dependency. */
export function assertReadableStagingRuntimeLayout(stagingDirectory: string): void {
  const runtimeFiles = collectFilePaths(
    join(stagingDirectory, PACKAGE_RUNTIME_DIRECTORY),
    () => true
  );
  const modules = runtimeFiles.filter((path) => path.endsWith(".mjs"));
  assertRuntimeModulesExist(modules);
  assertNoJavaScriptRuntimeArtifacts(runtimeFiles);
  for (const modulePath of modules) {
    assertReadableRuntimeModule({ modulePath, stagingDirectory });
  }
  assertFunctionMetricsWorkerRuntime(stagingDirectory);
}

function assertFunctionMetricsWorkerRuntime(stagingDirectory: string): void {
  const workerPath = join(stagingDirectory, PACKAGE_FUNCTION_METRICS_WORKER_RUNTIME_PATH);
  const measurementPath = join(stagingDirectory, PACKAGE_FUNCTION_METRICS_MEASUREMENT_RUNTIME_PATH);
  if (!existsSync(workerPath) || !existsSync(measurementPath)) {
    throw new Error("candidate runtime is missing the emitted function-metrics Worker entry");
  }
  const measurement = readFileSync(measurementPath, "utf8");
  const workerUrl = 'new URL("./analyzer-worker.mjs", import.meta.url)';
  const occurrenceCount = measurement.split(workerUrl).length - 1;
  if (occurrenceCount !== 1) {
    throw new Error(
      `candidate function-metrics runtime must resolve exactly one emitted Worker URL; received ${occurrenceCount}`
    );
  }
}

function assertRuntimeModulesExist(modules: readonly string[]): void {
  if (modules.length === 0) {
    throw new Error("candidate staging is missing its readable ESM module tree");
  }
}

function assertNoJavaScriptRuntimeArtifacts(runtimeFiles: readonly string[]): void {
  if (runtimeFiles.some((path) => path.endsWith(".js") || path.endsWith(".js.map"))) {
    throw new Error("candidate readable ESM module tree must not retain .js runtime artifacts");
  }
}

function assertReadableRuntimeModule(input: {
  readonly modulePath: string;
  readonly stagingDirectory: string;
}): void {
  const sourceMapPath = `${input.modulePath}.map`;
  if (!existsSync(sourceMapPath)) {
    throw new Error(`candidate ESM module is missing a source map: ${input.modulePath}`);
  }
  const moduleSource = readFileSync(input.modulePath, "utf8");
  const sourceMapFileName = `${basename(input.modulePath)}.map`;
  if (!moduleSource.includes(`sourceMappingURL=${sourceMapFileName}`)) {
    throw new Error(`candidate ESM module does not link its source map: ${input.modulePath}`);
  }
  assertRelativeModuleReferencesResolve({ modulePath: input.modulePath, moduleSource });
  assertRuntimeSourceMapMatchesSource({ sourceMapPath, stagingDirectory: input.stagingDirectory });
}

function assertRelativeModuleReferencesResolve(input: {
  readonly modulePath: string;
  readonly moduleSource: string;
}): void {
  for (const specifier of relativeEsmModuleSpecifiers({
    fileName: input.modulePath,
    source: input.moduleSource
  })) {
    assertResolvedEsmModuleSpecifier(input.modulePath, specifier);
  }
}

function assertResolvedEsmModuleSpecifier(modulePath: string, specifier: string): void {
  if (!specifier.endsWith(".mjs")) {
    throw new Error(
      `candidate ESM module uses a non-.mjs relative specifier ${specifier}: ${modulePath}`
    );
  }
  if (!existsSync(resolve(dirname(modulePath), specifier))) {
    throw new Error(`candidate ESM module reference does not resolve ${specifier}: ${modulePath}`);
  }
}
