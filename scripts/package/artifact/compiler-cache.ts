import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { isNonArrayRecord } from "../../value-guards.ts";
import { collectFilePaths, collectRuntimeSourceFilePaths } from "../file-inventory.ts";
import { fileMatchesSha256, sha256File } from "../pack.ts";
import {
  PACKAGE_RUNTIME_DIRECTORY,
  PACKAGE_SOURCE_DIRECTORY,
  PACKAGE_TYPES_DIRECTORY
} from "../package-contract.ts";

const CACHE_VERSION = 2;
const COMPILER_OPTIONS_VERSION = "nodenext-esnext-strict-incremental-v1";
const CACHE_OUTPUT_DIRECTORIES = [PACKAGE_RUNTIME_DIRECTORY, PACKAGE_TYPES_DIRECTORY] as const;
/** The emit invocation and its local input/runner closure; candidate identity has a wider fingerprint. */
const COMPILER_INPUT_SOURCES = Object.freeze([
  "scripts/package/artifact/build.ts",
  "scripts/package/artifact/compiler-cache.ts",
  "scripts/package/file-inventory.ts",
  "scripts/package/pack.ts",
  "scripts/package/package-contract.ts",
  "scripts/package/public-api-inventory.ts",
  "scripts/value-guards.ts"
]);

type CompilerCacheRecord = Readonly<{
  readonly version: typeof CACHE_VERSION;
  readonly configFingerprint: string;
  readonly buildInfoSha256: string;
  readonly sourceFingerprint: string;
  readonly sourcePaths: readonly string[];
  readonly outputs: Readonly<Record<string, string>>;
}>;

/**
 * Retains only raw tsgo emit, never a second package staging or tarball. A changed
 * source graph may use tsgo's incremental state; a changed document skips tsgo.
 * Both paths rebuild and audit the published staging independently.
 */
export function prepareCompilerEmit(input: {
  readonly repositoryRoot: string;
  readonly stagingDirectory: string;
  readonly tsBuildInfoPath: string;
  readonly compile: (output: {
    readonly declarationDirectory: string;
    readonly runtimeDirectory: string;
  }) => void;
}): void {
  const cacheDirectory = join(dirname(input.tsBuildInfoPath), "compiler-emit");
  const recordPath = join(dirname(input.tsBuildInfoPath), "compiler-emit.json");
  const compilerInputs = fingerprintCompilerInputs(input.repositoryRoot);
  const prior = readRecord(recordPath);
  const hasValidPriorCompilerState =
    prior !== undefined &&
    prior.configFingerprint === compilerInputs.configFingerprint &&
    samePaths(prior.sourcePaths, compilerInputs.sourcePaths) &&
    existsSync(input.tsBuildInfoPath) &&
    fileMatchesSha256(input.tsBuildInfoPath, prior.buildInfoSha256) &&
    matchesOutputRecord(cacheDirectory, prior.outputs);

  if (!hasValidPriorCompilerState) {
    rmSync(cacheDirectory, { force: true, recursive: true });
    rmSync(input.tsBuildInfoPath, { force: true });
  }
  if (!hasValidPriorCompilerState || prior.sourceFingerprint !== compilerInputs.sourceFingerprint) {
    mkdirSync(cacheDirectory, { recursive: true });
    rmSync(recordPath, { force: true });
    input.compile({
      declarationDirectory: join(cacheDirectory, PACKAGE_TYPES_DIRECTORY),
      runtimeDirectory: join(cacheDirectory, PACKAGE_RUNTIME_DIRECTORY)
    });
    const outputs = listOutputDigests(cacheDirectory);
    if (outputs === undefined || Object.keys(outputs).length === 0) {
      throw new Error("candidate compiler emit cache has no regular output files");
    }
    const record: CompilerCacheRecord = Object.freeze({
      version: CACHE_VERSION,
      configFingerprint: compilerInputs.configFingerprint,
      buildInfoSha256: sha256File(input.tsBuildInfoPath),
      sourceFingerprint: compilerInputs.sourceFingerprint,
      sourcePaths: compilerInputs.sourcePaths,
      outputs
    });
    writeFileSync(recordPath, `${JSON.stringify(record)}\n`, "utf8");
  }
  const cacheRecord = readRecord(recordPath);
  if (
    cacheRecord === undefined ||
    cacheRecord.configFingerprint !== compilerInputs.configFingerprint ||
    cacheRecord.sourceFingerprint !== compilerInputs.sourceFingerprint ||
    !samePaths(cacheRecord.sourcePaths, compilerInputs.sourcePaths) ||
    !fileMatchesSha256(input.tsBuildInfoPath, cacheRecord.buildInfoSha256) ||
    !matchesOutputRecord(cacheDirectory, cacheRecord.outputs)
  ) {
    throw new Error("candidate compiler emit cache changed before staging copy");
  }
  for (const path of Object.keys(cacheRecord.outputs)) {
    const destination = join(input.stagingDirectory, path);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(cacheDirectory, path), destination);
  }
}

function fingerprintCompilerInputs(repositoryRoot: string): Readonly<{
  readonly configFingerprint: string;
  readonly sourceFingerprint: string;
  readonly sourcePaths: readonly string[];
}> {
  const sourceFiles = collectRuntimeSourceFilePaths(join(repositoryRoot, PACKAGE_SOURCE_DIRECTORY));
  const sourcePaths = sourceFiles.map((path) => slash(relative(repositoryRoot, path)));
  const processSources = collectFilePaths(
    join(repositoryRoot, "scripts/process-execution"),
    (path) =>
      path.endsWith(".ts") && !path.endsWith(".test.ts") && !path.endsWith(".test-support.ts")
  );
  const compilerPackages = ["@typescript/native-preview", "typescript", "@types/node"].map((name) =>
    fileURLToPath(import.meta.resolve(`${name}/package.json`))
  );
  return Object.freeze({
    configFingerprint: digestFiles(
      repositoryRoot,
      [
        ...COMPILER_INPUT_SOURCES.map((path) => join(repositoryRoot, path)),
        ...processSources,
        ...compilerPackages,
        join(repositoryRoot, "package.json"),
        join(repositoryRoot, "pnpm-lock.yaml")
      ],
      `${COMPILER_OPTIONS_VERSION}\0bun=${process.versions.bun ?? "unknown"}`
    ),
    sourceFingerprint: digestFiles(repositoryRoot, sourceFiles, "runtime-source-v1"),
    sourcePaths: Object.freeze(sourcePaths)
  });
}

function digestFiles(repositoryRoot: string, paths: readonly string[], prefix: string): string {
  const hash = createHash("sha256").update(`${prefix}\0`);
  for (const path of [...paths].sort()) {
    hash.update(slash(relative(repositoryRoot, path))).update("\0");
    hash.update(readFileSync(path)).update("\0");
  }
  return hash.digest("hex");
}

function readRecord(path: string): CompilerCacheRecord | undefined {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (
      !isNonArrayRecord(value) ||
      value.version !== CACHE_VERSION ||
      typeof value.configFingerprint !== "string" ||
      typeof value.buildInfoSha256 !== "string" ||
      typeof value.sourceFingerprint !== "string" ||
      !isStringArray(value.sourcePaths) ||
      !isStringRecord(value.outputs)
    )
      return undefined;
    return Object.freeze({
      version: CACHE_VERSION,
      configFingerprint: value.configFingerprint,
      buildInfoSha256: value.buildInfoSha256,
      sourceFingerprint: value.sourceFingerprint,
      sourcePaths: Object.freeze([...value.sourcePaths]),
      outputs: Object.freeze({ ...value.outputs })
    });
  } catch {
    return undefined;
  }
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStringRecord(value: unknown): value is Readonly<Record<string, string>> {
  return isNonArrayRecord(value) && Object.values(value).every((item) => typeof item === "string");
}

function matchesOutputRecord(
  directory: string,
  expected: Readonly<Record<string, string>>
): boolean {
  try {
    const current = listOutputDigests(directory);
    return current !== undefined && JSON.stringify(current) === JSON.stringify(expected);
  } catch {
    return false;
  }
}

/** Rejects symlinks and unexpected entries before trusting a local intermediate cache. */
function listOutputDigests(directory: string): Readonly<Record<string, string>> | undefined {
  if (!existsSync(directory) || !lstatSync(directory).isDirectory()) return undefined;
  const paths: string[] = [];
  const visit = (current: string): boolean => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        if (!visit(path)) return false;
      } else if (entry.isFile()) paths.push(path);
      else return false;
    }
    return true;
  };
  if (!visit(directory)) return undefined;
  const outputs = Object.fromEntries(
    paths.sort().map((path) => [slash(relative(directory, path)), sha256File(path)])
  );
  if (
    Object.keys(outputs).some(
      (path) => !CACHE_OUTPUT_DIRECTORIES.some((root) => path.startsWith(`${root}/`))
    )
  )
    return undefined;
  return Object.freeze(outputs);
}

function samePaths(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((path, index) => path === right[index]);
}

function slash(path: string): string {
  return path.split(sep).join("/");
}
