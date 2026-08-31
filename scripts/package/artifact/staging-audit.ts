import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

import { collectFilePaths } from "../file-inventory.ts";
import {
  PACKAGE_ENTRY_PATH,
  PACKAGE_ENTRY_SOURCE,
  PACKAGE_LICENSE_PATH,
  PACKAGE_MOMOA_LICENSE_PATH,
  PACKAGE_README_PATH,
  PACKAGE_RUNTIME_DIRECTORY,
  PACKAGE_RUNTIME_ENTRY_PATH,
  PACKAGE_SOURCE_DIRECTORY,
  PACKAGE_TYPES_DIRECTORY,
  PACKAGE_TYPES_PATH,
  RUNTIME_EXPORTS
} from "../package-contract.ts";
import { relativeEsmModuleSpecifiers } from "./esm-module-specifiers.ts";
import { assertRuntimeSourceMapMatchesSource } from "./runtime-source-maps.ts";
import {
  assertJSDocExamplePayloads,
  assertMomoaLicenseContent,
  assertPackageLicenseContent,
  sameOrderedStrings
} from "../package-material-audit.ts";
import type { PackageDocumentationFile } from "../../docs/package-api/check-guides.ts";
import type { PackageMachineMaterial } from "../../docs/machine-artifacts/package-materials.ts";
import { auditCandidateManifest } from "./manifest.ts";

const fixedStagingMaterialPaths: ReadonlySet<string> = new Set([
  "package.json",
  PACKAGE_ENTRY_PATH,
  PACKAGE_LICENSE_PATH,
  PACKAGE_README_PATH,
  PACKAGE_MOMOA_LICENSE_PATH
]);

export function auditStagingRuntime(input: {
  readonly candidateVersion: string;
  readonly expectedDocuments: readonly PackageDocumentationFile[];
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedMachineMaterials: readonly PackageMachineMaterial[];
  readonly expectedReadme: string;
  readonly stagingDirectory: string;
}): void {
  const {
    candidateVersion,
    expectedDocuments,
    expectedJSDocExamplePayloads,
    expectedMachineMaterials,
    expectedReadme,
    stagingDirectory
  } = input;
  const entryPath = join(stagingDirectory, PACKAGE_ENTRY_PATH);
  const runtimeEntryPath = join(stagingDirectory, PACKAGE_RUNTIME_ENTRY_PATH);
  const typesPath = join(stagingDirectory, PACKAGE_TYPES_PATH);
  const expectedPublishedMaterialPaths = new Set([
    ...expectedDocuments.map((document) => document.packagePath),
    ...expectedMachineMaterials.map((material) => material.packagePath)
  ]);
  assertStagingEntries(entryPath, runtimeEntryPath, typesPath);
  auditCandidateManifest(
    readFileSync(join(stagingDirectory, "package.json"), "utf8"),
    candidateVersion
  );
  if (readFileSync(entryPath, "utf8") !== PACKAGE_ENTRY_SOURCE) {
    throw new Error("candidate public facade does not match the approved runtime entry");
  }
  assertStagingPublishedMaterials({
    expectedDocuments,
    expectedJSDocExamplePayloads,
    expectedMachineMaterials,
    expectedReadme,
    stagingDirectory
  });
  assertStagingRuntimeContract(stagingDirectory, runtimeEntryPath, typesPath);
  assertStagingAllowlist(stagingDirectory, expectedPublishedMaterialPaths);
}

function assertStagingEntries(
  entryPath: string,
  runtimeEntryPath: string,
  typesPath: string
): void {
  if (!existsSync(entryPath) || !existsSync(runtimeEntryPath) || !existsSync(typesPath)) {
    throw new Error("candidate staging is missing its public runtime entry or declarations entry");
  }
}

function assertStagingPublishedMaterials(input: {
  readonly expectedDocuments: readonly PackageDocumentationFile[];
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedMachineMaterials: readonly PackageMachineMaterial[];
  readonly expectedReadme: string;
  readonly stagingDirectory: string;
}): void {
  const {
    expectedDocuments,
    expectedJSDocExamplePayloads,
    expectedMachineMaterials,
    expectedReadme,
    stagingDirectory
  } = input;
  assertFileContentMatches({
    content: expectedReadme,
    path: join(stagingDirectory, PACKAGE_README_PATH)
  });
  assertPackageDocumentation(stagingDirectory, expectedDocuments);
  assertPackageMachineMaterials(stagingDirectory, expectedMachineMaterials);
  assertMomoaLicenseContent(readFileSync(join(stagingDirectory, PACKAGE_MOMOA_LICENSE_PATH)));
  assertPackageLicenseContent(readFileSync(join(stagingDirectory, PACKAGE_LICENSE_PATH)));
  assertJSDocExamplePayloads({
    declarationSources: collectFilePaths(join(stagingDirectory, PACKAGE_TYPES_DIRECTORY), (path) =>
      path.endsWith(".d.ts")
    ).map((path) => readFileSync(path, "utf8")),
    description: "candidate staging declarations",
    expectedPayloads: expectedJSDocExamplePayloads
  });
}

function assertStagingRuntimeContract(
  stagingDirectory: string,
  runtimeEntryPath: string,
  typesPath: string
): void {
  const actualExports = declaredRuntimeExports(readFileSync(runtimeEntryPath, "utf8"));
  if (!sameOrderedStrings(actualExports, RUNTIME_EXPORTS)) {
    throw new Error(
      `candidate runtime exports must be ${RUNTIME_EXPORTS.join(", ")}; received ${actualExports.join(", ")}`
    );
  }
  const typesSource = readFileSync(typesPath, "utf8");
  if (typesSource.includes("export *")) {
    throw new Error("candidate declarations must not use wildcard public exports");
  }
  assertReadableRuntimeLayout(stagingDirectory);
}

function assertStagingAllowlist(
  stagingDirectory: string,
  expectedPublishedMaterialPaths: ReadonlySet<string>
): void {
  const unexpectedFiles: string[] = [];
  for (const filePath of stagingFilePaths(stagingDirectory)) {
    if (!isAllowlistedStagingMaterial(filePath, expectedPublishedMaterialPaths)) {
      unexpectedFiles.push(filePath);
    }
  }
  if (unexpectedFiles.length > 0) {
    throw new Error(
      `candidate staging contains materials outside its allowlisted runtime and declaration inventory: ${unexpectedFiles.join(", ")}`
    );
  }
}

function stagingFilePaths(stagingDirectory: string): readonly string[] {
  return collectFilePaths(stagingDirectory, () => true).map((filePath) =>
    relative(stagingDirectory, filePath).split(sep).join("/")
  );
}

function isAllowlistedStagingMaterial(
  filePath: string,
  expectedPublishedMaterialPaths: ReadonlySet<string>
): boolean {
  return (
    fixedStagingMaterialPaths.has(filePath) ||
    expectedPublishedMaterialPaths.has(filePath) ||
    isRuntimeStagingMaterial(filePath) ||
    isDeclarationStagingMaterial(filePath) ||
    isPackageSourceMaterial(filePath)
  );
}

function isRuntimeStagingMaterial(filePath: string): boolean {
  return (
    filePath.startsWith(`${PACKAGE_RUNTIME_DIRECTORY}/`) &&
    (filePath.endsWith(".mjs") || filePath.endsWith(".mjs.map"))
  );
}

function isDeclarationStagingMaterial(filePath: string): boolean {
  return filePath.startsWith(`${PACKAGE_TYPES_DIRECTORY}/`) && filePath.endsWith(".d.ts");
}

function isPackageSourceMaterial(filePath: string): boolean {
  return filePath.startsWith(`${PACKAGE_SOURCE_DIRECTORY}/`) && filePath.endsWith(".ts");
}

function assertPackageMachineMaterials(
  stagingDirectory: string,
  materials: readonly PackageMachineMaterial[]
): void {
  for (const material of materials) {
    const path = join(stagingDirectory, material.packagePath);
    if (!existsSync(path) || !readFileSync(path).equals(material.content)) {
      throw new Error(`candidate staging machine material differs: ${material.packagePath}`);
    }
  }
}

function assertReadableRuntimeLayout(stagingDirectory: string): void {
  const runtimeDirectory = join(stagingDirectory, PACKAGE_RUNTIME_DIRECTORY);
  const runtimeFiles = collectFilePaths(runtimeDirectory, () => true);
  const modules = runtimeFiles.filter((path) => path.endsWith(".mjs"));
  if (modules.length === 0) {
    throw new Error("candidate staging is missing its readable ESM module tree");
  }
  if (runtimeFiles.some((path) => path.endsWith(".js") || path.endsWith(".js.map"))) {
    throw new Error("candidate readable ESM module tree must not retain .js runtime artifacts");
  }
  for (const modulePath of modules) {
    const sourceMapPath = `${modulePath}.map`;
    if (!existsSync(sourceMapPath)) {
      throw new Error(`candidate ESM module is missing a source map: ${modulePath}`);
    }
    const moduleSource = readFileSync(modulePath, "utf8");
    const sourceMapFileName = `${basename(modulePath)}.map`;
    if (!moduleSource.includes(`sourceMappingURL=${sourceMapFileName}`)) {
      throw new Error(`candidate ESM module does not link its source map: ${modulePath}`);
    }
    assertRelativeModuleReferencesResolve({ modulePath, moduleSource });
    assertRuntimeSourceMapMatchesSource({ sourceMapPath, stagingDirectory });
  }
}

function declaredRuntimeExports(runtimeEntrySource: string): readonly string[] {
  const exports: string[] = [];
  const declaration = /export\s*\{([^}]+)\}\s*from\s*["']\.\//g;
  for (const match of runtimeEntrySource.matchAll(declaration)) {
    for (const exportedName of match[1].split(",")) {
      const name = exportedName
        .trim()
        .split(/\s+as\s+/)
        .at(-1);
      if (name !== undefined && name.length > 0) exports.push(name);
    }
  }
  return Object.freeze(exports.sort());
}

function assertRelativeModuleReferencesResolve(input: {
  readonly modulePath: string;
  readonly moduleSource: string;
}): void {
  for (const specifier of relativeEsmModuleSpecifiers({
    fileName: input.modulePath,
    source: input.moduleSource
  })) {
    if (!specifier.endsWith(".mjs")) {
      throw new Error(
        `candidate ESM module uses a non-.mjs relative specifier ${specifier}: ${input.modulePath}`
      );
    }
    const targetPath = resolve(dirname(input.modulePath), specifier);
    if (!existsSync(targetPath)) {
      throw new Error(
        `candidate ESM module reference does not resolve ${specifier}: ${input.modulePath}`
      );
    }
  }
}

function assertPackageDocumentation(
  stagingDirectory: string,
  documents: readonly PackageDocumentationFile[]
): void {
  for (const document of documents) {
    assertFileContentMatches({
      content: document.content,
      path: join(stagingDirectory, document.packagePath)
    });
  }
}

function assertFileContentMatches(
  expected: Readonly<{ readonly content: string; readonly path: string }>
): void {
  if (!existsSync(expected.path)) {
    throw new Error(`checked-in documentation projection is missing: ${expected.path}`);
  }
  if (readFileSync(expected.path, "utf8") !== expected.content) {
    throw new Error(`checked-in documentation projection is stale: ${expected.path}`);
  }
}
