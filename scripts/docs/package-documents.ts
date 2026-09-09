import { readFileSync } from "node:fs";
import { isAbsolute, normalize, relative, resolve, sep } from "node:path";

import { isNonArrayRecord } from "../value-guards.ts";

export const PACKAGE_DOCUMENTS_CONFIG_PATH = "docs/package-documents.json";

export interface PackageMarkdownDocument {
  readonly id: string;
  readonly packagePath: string;
  readonly sourcePath: string;
}

export interface PackageCheckGuide {
  readonly checkId: string;
  readonly exportName: string;
  readonly packagePath: string;
  readonly sourcePath: string;
}

export interface PackageMachineMaterialMapping {
  readonly packagePath: string;
  readonly sourcePath: string;
}

export interface PackageDocuments {
  readonly checkGuides: readonly PackageCheckGuide[];
  readonly machineMaterials: readonly PackageMachineMaterialMapping[];
  readonly markdownDocuments: readonly PackageMarkdownDocument[];
}

/** Loads the repository-local package-material mapping without retaining module-static repository state. */
export function loadPackageDocuments(repositoryRoot: string): PackageDocuments {
  const root = resolve(repositoryRoot);
  const configPath = repositoryPath(root, PACKAGE_DOCUMENTS_CONFIG_PATH, "configuration path");
  const rawBytes = readFileSync(configPath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBytes.toString("utf8"));
  } catch (error: unknown) {
    throw new Error(
      `invalid package document configuration JSON: ${PACKAGE_DOCUMENTS_CONFIG_PATH}`,
      {
        cause: error
      }
    );
  }
  if (
    !isNonArrayRecord(parsed) ||
    !hasOnlyKeys(parsed, ["markdownDocuments", "checkGuides", "machineMaterials"])
  ) {
    throw new Error(
      "invalid package document configuration: expected only markdownDocuments, checkGuides, machineMaterials"
    );
  }
  const markdownDocuments = parseMarkdownDocuments(parsed.markdownDocuments);
  const checkGuides = parseCheckGuides(parsed.checkGuides);
  const machineMaterials = parseMachineMaterials(parsed.machineMaterials);
  assertNonConflictingPackageTargets(markdownDocuments, checkGuides, machineMaterials);
  return Object.freeze({
    checkGuides: Object.freeze(checkGuides),
    machineMaterials: Object.freeze(machineMaterials),
    markdownDocuments: Object.freeze(markdownDocuments)
  });
}

export function repositoryPath(repositoryRoot: string, path: string, description: string): string {
  if (!isRepositoryRelativePath(path)) {
    throw new Error(`invalid ${description}`);
  }
  const root = resolve(repositoryRoot);
  const absolutePath = resolve(root, path);
  const relativePath = relative(root, absolutePath);
  if (relativePath === "" || relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
    throw new Error(`invalid ${description}`);
  }
  return absolutePath;
}

function parseMarkdownDocuments(value: unknown): PackageMarkdownDocument[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("invalid package document configuration markdownDocuments");
  }
  const ids = new Set<string>();
  return value.map((entry) => {
    if (!isNonArrayRecord(entry) || !hasOnlyKeys(entry, ["id", "sourcePath", "packagePath"])) {
      throw new Error("invalid package Markdown document mapping");
    }
    if (
      !validIdentifier(entry.id) ||
      !validMarkdownPath(entry.sourcePath) ||
      !validMarkdownPath(entry.packagePath)
    ) {
      throw new Error("invalid package Markdown document mapping");
    }
    if (ids.has(entry.id)) throw new Error(`duplicate package Markdown document id: ${entry.id}`);
    ids.add(entry.id);
    return Object.freeze({
      id: entry.id,
      packagePath: entry.packagePath,
      sourcePath: entry.sourcePath
    });
  });
}

function parseCheckGuides(value: unknown): PackageCheckGuide[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("invalid package document configuration checkGuides");
  }
  const checkIds = new Set<string>();
  const exportNames = new Set<string>();
  return value.map((entry) => {
    if (
      !isNonArrayRecord(entry) ||
      !hasOnlyKeys(entry, ["checkId", "exportName", "sourcePath", "packagePath"])
    ) {
      throw new Error("invalid package Check guide mapping");
    }
    if (
      !validIdentifier(entry.checkId) ||
      !validExportName(entry.exportName) ||
      !validMarkdownPath(entry.sourcePath) ||
      !validMarkdownPath(entry.packagePath)
    ) {
      throw new Error("invalid package Check guide mapping");
    }
    if (checkIds.has(entry.checkId) || exportNames.has(entry.exportName)) {
      throw new Error(`duplicate package Check guide mapping: ${entry.checkId}`);
    }
    checkIds.add(entry.checkId);
    exportNames.add(entry.exportName);
    return Object.freeze({
      checkId: entry.checkId,
      exportName: entry.exportName,
      packagePath: entry.packagePath,
      sourcePath: entry.sourcePath
    });
  });
}

function parseMachineMaterials(value: unknown): PackageMachineMaterialMapping[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("invalid package document configuration machineMaterials");
  }
  return value.map((entry) => {
    if (!isNonArrayRecord(entry) || !hasOnlyKeys(entry, ["sourcePath", "packagePath"])) {
      throw new Error("invalid package machine material mapping");
    }
    if (!isPackageDocumentPath(entry.sourcePath) || !isPackageDocumentPath(entry.packagePath)) {
      throw new Error("invalid package machine material mapping");
    }
    return Object.freeze({ packagePath: entry.packagePath, sourcePath: entry.sourcePath });
  });
}

function assertNonConflictingPackageTargets(
  markdownDocuments: readonly PackageMarkdownDocument[],
  checkGuides: readonly PackageCheckGuide[],
  machineMaterials: readonly PackageMachineMaterialMapping[]
): void {
  const targets: string[] = [];
  for (const entry of [...markdownDocuments, ...checkGuides, ...machineMaterials]) {
    const conflict = targets.find(
      (target) =>
        target === entry.packagePath ||
        target.startsWith(`${entry.packagePath}/`) ||
        entry.packagePath.startsWith(`${target}/`)
    );
    if (conflict !== undefined) {
      throw new Error(`conflicting package document target: ${entry.packagePath}`);
    }
    targets.push(entry.packagePath);
  }
  const readme = markdownDocuments.find((document) => document.id === "readme");
  if (readme?.sourcePath !== "README.md" || readme.packagePath !== "README.md") {
    throw new Error("package Markdown document mapping must map README.md from README.md");
  }
}

function hasOnlyKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function isRepositoryRelativePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !isAbsolute(value) &&
    !value.includes("\\") &&
    !value.includes("\0") &&
    !value.endsWith("/") &&
    normalize(value).replaceAll("\\", "/") === value &&
    !value.startsWith("../") &&
    value !== ".." &&
    !value.startsWith("/")
  );
}

function validMarkdownPath(value: unknown): value is string {
  return isPackageDocumentPath(value) && value.endsWith(".md");
}

function isPackageDocumentPath(value: unknown): value is string {
  return isRepositoryRelativePath(value) && (value === "README.md" || value.startsWith("docs/"));
}

function validIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[a-z][a-z0-9-]*$/.test(value);
}

function validExportName(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9]*$/.test(value);
}
