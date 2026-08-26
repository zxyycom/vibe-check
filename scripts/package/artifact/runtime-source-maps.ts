import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

import { isPathWithin, toSlashPath } from "../../repository-files/paths.ts";
import { isNonArrayRecord } from "../../value-guards.ts";
import { PACKAGE_RUNTIME_DIRECTORY, PACKAGE_SOURCE_DIRECTORY } from "../package-contract.ts";

interface RuntimeSourceMap extends Readonly<Record<string, unknown>> {
  readonly sources: readonly string[];
  readonly sourcesContent: readonly string[];
}

/** Rebinds one TypeScript-emitted source map to the source tree shipped in the package. */
export function normalizeRuntimeSourceMap(input: {
  readonly modulePath: string;
  readonly source: string;
  readonly sourceMapPath: string;
  readonly stagingDirectory: string;
}): string {
  const sourceMap = parseRuntimeSourceMap({
    source: input.source,
    sourceMapPath: input.sourceMapPath
  });
  const expectedSourcePath = runtimeSourcePath({
    modulePath: input.modulePath,
    stagingDirectory: input.stagingDirectory
  });
  assertEmbeddedSourceMatches({
    expectedSourcePath,
    sourceMap,
    sourceMapPath: input.sourceMapPath
  });
  return `${JSON.stringify({
    ...sourceMap,
    file: basename(input.modulePath),
    sources: [toSlashPath(relative(dirname(input.modulePath), expectedSourcePath))]
  })}\n`;
}

/** Verifies that a staged runtime map names and embeds its corresponding packaged source. */
export function assertRuntimeSourceMapMatchesSource(input: {
  readonly sourceMapPath: string;
  readonly stagingDirectory: string;
}): void {
  if (!input.sourceMapPath.endsWith(".mjs.map")) {
    throw new Error(`candidate runtime source map must end with .mjs.map: ${input.sourceMapPath}`);
  }
  const modulePath = input.sourceMapPath.slice(0, -".map".length);
  const sourceMap = parseRuntimeSourceMap({
    source: readFileSync(input.sourceMapPath, "utf8"),
    sourceMapPath: input.sourceMapPath
  });
  const expectedSourcePath = runtimeSourcePath({
    modulePath,
    stagingDirectory: input.stagingDirectory
  });
  const expectedSourceSpecifier = toSlashPath(relative(dirname(modulePath), expectedSourcePath));
  if (sourceMap.file !== basename(modulePath)) {
    throw new Error(
      `candidate runtime source map has the wrong generated filename: ${input.sourceMapPath}`
    );
  }
  if (sourceMap.sources.length !== 1 || sourceMap.sources[0] !== expectedSourceSpecifier) {
    throw new Error(
      `candidate runtime source map must point to ${expectedSourceSpecifier}: ${input.sourceMapPath}`
    );
  }
  assertEmbeddedSourceMatches({
    expectedSourcePath,
    sourceMap,
    sourceMapPath: input.sourceMapPath
  });
}

function parseRuntimeSourceMap(input: {
  readonly source: string;
  readonly sourceMapPath: string;
}): RuntimeSourceMap {
  let sourceMap: unknown;
  try {
    sourceMap = JSON.parse(input.source);
  } catch (error: unknown) {
    throw new Error(`candidate runtime source map is invalid JSON: ${input.sourceMapPath}`, {
      cause: error
    });
  }
  if (!isRuntimeSourceMap(sourceMap)) {
    throw new Error(
      `candidate runtime source map must identify and embed TypeScript source: ${input.sourceMapPath}`
    );
  }
  if (sourceMap.sources.length !== 1 || sourceMap.sourcesContent.length !== 1) {
    throw new Error(
      `candidate runtime source map must describe exactly one TypeScript module: ${input.sourceMapPath}`
    );
  }
  return sourceMap;
}

function runtimeSourcePath(input: {
  readonly modulePath: string;
  readonly stagingDirectory: string;
}): string {
  const runtimeDirectory = join(input.stagingDirectory, PACKAGE_RUNTIME_DIRECTORY);
  if (!isPathWithin(runtimeDirectory, input.modulePath) || !input.modulePath.endsWith(".mjs")) {
    throw new Error(`runtime module is outside the package ESM tree: ${input.modulePath}`);
  }
  const relativeModulePath = relative(runtimeDirectory, input.modulePath);
  const relativeSourcePath = `${relativeModulePath.slice(0, -".mjs".length)}.ts`;
  return join(input.stagingDirectory, PACKAGE_SOURCE_DIRECTORY, relativeSourcePath);
}

function assertEmbeddedSourceMatches(input: {
  readonly expectedSourcePath: string;
  readonly sourceMap: RuntimeSourceMap;
  readonly sourceMapPath: string;
}): void {
  if (!existsSync(input.expectedSourcePath)) {
    throw new Error(
      `candidate runtime source map has no corresponding packaged source: ${input.expectedSourcePath}`
    );
  }
  if (input.sourceMap.sourcesContent[0] !== readFileSync(input.expectedSourcePath, "utf8")) {
    throw new Error(
      `candidate runtime source map content differs from packaged source: ${input.sourceMapPath}`
    );
  }
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRuntimeSourceMap(value: unknown): value is RuntimeSourceMap {
  return (
    isNonArrayRecord(value) && isStringArray(value.sources) && isStringArray(value.sourcesContent)
  );
}
