import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { walkFiles } from "../foundation/fs.ts";
import { FILE_SYSTEM } from "./docs-contract.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const PRODUCT_OWNER_DIRECTORIES = Object.freeze([
  "checks",
  "contract",
  "core",
  "definition",
  "foundation",
  "output",
  "project-files",
  "run",
  "scheduler"
]);
const RETIRED_SOURCE_DIRECTORIES = Object.freeze([
  "src/product",
  "scripts/tools",
  "scripts/package-candidate",
  "scripts/quality",
  "scripts/project-gate"
]);
const GENERIC_BASENAMES = new Set([
  "current",
  "model",
  "types",
  "common",
  "shared",
  "utils",
  "helpers",
  "workflows"
]);

export function validateRepositoryLayout(
  input: Readonly<{ readonly repositoryRoot?: string }> = {}
): void {
  const root = resolve(input.repositoryRoot ?? repositoryRoot);
  const sourceFiles = [
    ...sourceFilesUnder(root, "src"),
    ...sourceFilesUnder(root, "scripts")
  ].sort();
  const violations: string[] = [];

  validateRetiredSourceDirectories(root, violations);
  validateProductOwners(root, violations);
  validateSourceNames(root, sourceFiles, violations);
  validateImportBoundaries(root, sourceFiles, violations);
  validatePackageArtifactEntry(root, violations);

  if (violations.length > 0) {
    throw new Error(`repository layout characterization failed:\n${violations.join("\n")}`);
  }
}

function sourceFilesUnder(root: string, sourceRoot: string): readonly string[] {
  const directory = join(root, sourceRoot);
  if (!existsSync(directory)) return [];
  return walkFiles({ ignoredDirs: FILE_SYSTEM.ignoredDirs, rootDir: directory })
    .filter((filePath) => filePath.endsWith(".ts"))
    .map((filePath) => join(directory, filePath));
}

function validateRetiredSourceDirectories(root: string, violations: string[]): void {
  for (const directory of RETIRED_SOURCE_DIRECTORIES) {
    if (sourceFilesUnder(root, directory).length > 0) {
      violations.push(`retired-source-directory: ${directory}`);
    }
  }
}

function validateProductOwners(root: string, violations: string[]): void {
  const sourceRoot = join(root, "src");
  if (!existsSync(sourceRoot)) {
    violations.push("product-owner-directories: src is missing");
    return;
  }

  const actual = readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !FILE_SYSTEM.ignoredDirs.includes(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (actual.join("\0") !== PRODUCT_OWNER_DIRECTORIES.join("\0")) {
    violations.push(
      `product-owner-directories: expected ${PRODUCT_OWNER_DIRECTORIES.join(", ")}; found ${actual.join(", ")}`
    );
  }
}

function validateSourceNames(
  root: string,
  sourceFiles: readonly string[],
  violations: string[]
): void {
  for (const sourcePath of sourceFiles) {
    const repositoryPath = relativePath(root, sourcePath);
    if (basename(sourcePath) === "index.ts" && repositoryPath !== "src/index.ts") {
      violations.push(`unapproved-index: ${repositoryPath}`);
    }

    const moduleName = moduleBasename(sourcePath);
    if (GENERIC_BASENAMES.has(moduleName)) {
      violations.push(`generic-basename: ${repositoryPath} (${moduleName})`);
    }
  }
}

function validateImportBoundaries(
  root: string,
  sourceFiles: readonly string[],
  violations: string[]
): void {
  for (const sourcePath of sourceFiles) {
    const repositoryPath = relativePath(root, sourcePath);
    const source = readFileSync(sourcePath, "utf8");

    if (repositoryPath.startsWith("src/")) {
      for (const specifier of valueModuleSpecifiers(source)) {
        if (resolvesUnder(root, sourcePath, specifier, "scripts")) {
          violations.push(`product-imports-scripts: ${repositoryPath} -> ${specifier}`);
        }
      }
    }

    if (repositoryPath.startsWith("scripts/project/")) {
      for (const specifier of moduleSpecifiers(source)) {
        if (resolvesUnder(root, sourcePath, specifier, "src")) {
          violations.push(`project-deep-imports-product: ${repositoryPath} -> ${specifier}`);
        }
      }
    }

    if (repositoryPath.startsWith("scripts/package/")) {
      for (const specifier of moduleSpecifiers(source)) {
        if (resolvesUnder(root, sourcePath, specifier, "scripts/project")) {
          violations.push(`package-imports-project: ${repositoryPath} -> ${specifier}`);
        }
      }
    }
  }
}

function validatePackageArtifactEntry(root: string, violations: string[]): void {
  const buildPath = join(root, "scripts/package/artifact/build.ts");
  if (!existsSync(buildPath)) {
    violations.push("package-artifact-entry: scripts/package/artifact/build.ts is missing");
    return;
  }
  const source = readFileSync(buildPath, "utf8");
  if (!/join\(\s*repositoryRoot\s*,\s*["']src\/index\.ts["']\s*\)/u.test(source)) {
    violations.push("package-artifact-entry: expected src/index.ts");
  }
}

function moduleBasename(sourcePath: string): string {
  return basename(sourcePath).replace(/(?:\.test-support|\.test)?\.ts$/u, "");
}

function relativePath(root: string, absolutePath: string): string {
  return relative(root, absolutePath).split("\\").join("/");
}

function resolvesUnder(
  root: string,
  sourcePath: string,
  specifier: string,
  targetRoot: string
): boolean {
  if (!specifier.startsWith(".")) return false;
  const targetPath = relativePath(root, resolve(dirname(sourcePath), specifier));
  return targetPath === targetRoot || targetPath.startsWith(`${targetRoot}/`);
}

function valueModuleSpecifiers(source: string): readonly string[] {
  return moduleSpecifiers(source, { includeTypeOnly: false });
}

function moduleSpecifiers(
  source: string,
  options: Readonly<{ readonly includeTypeOnly?: boolean }> = {}
): readonly string[] {
  const specifiers = new Set<string>();
  const fromPattern = /\b(?:import|export)\s+(type\s+)?[\s\S]*?\sfrom\s*["']([^"']+)["']/gu;
  for (const match of source.matchAll(fromPattern)) {
    if (options.includeTypeOnly === false && match[1] !== undefined) continue;
    const specifier = match[2];
    if (specifier !== undefined) specifiers.add(specifier);
  }
  const sideEffectPattern = /\bimport\s*["']([^"']+)["']/gu;
  for (const match of source.matchAll(sideEffectPattern)) {
    const specifier = match[1];
    if (specifier !== undefined) specifiers.add(specifier);
  }
  const dynamicPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu;
  for (const match of source.matchAll(dynamicPattern)) {
    const specifier = match[1];
    if (specifier !== undefined) specifiers.add(specifier);
  }
  return [...specifiers];
}
