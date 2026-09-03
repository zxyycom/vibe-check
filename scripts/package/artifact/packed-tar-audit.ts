import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

import { errorMessage } from "../../error-message.ts";
import {
  PACKAGE_ENTRY_PATH,
  PACKAGE_LICENSE_PATH,
  PACKAGE_THIRD_PARTY_LICENSES,
  PACKAGE_README_PATH,
  PACKAGE_TYPES_PATH
} from "../package-contract.ts";
import {
  assertNoLegacyFunctionMetricsRuntime,
  assertTranslatedAnalyzerLegalMaterials,
  PACKAGE_THIRD_PARTY_LEGAL_MATERIALS,
  type PackagedLegalMaterialAccess
} from "../legal-materials.ts";
import { sha256File } from "../pack.ts";
import {
  assertJSDocExamplePayloads,
  assertThirdPartyLicenseContent,
  assertPackageLicenseContent,
  sameOrderedStrings
} from "../package-material-audit.ts";
import type { PackageDocumentationFile } from "../../docs/package-api/check-guides.ts";
import type { PackageMachineMaterial } from "../../docs/machine-artifacts/package-materials.ts";
import { auditCandidateManifest } from "./manifest.ts";

interface TarEntry {
  readonly content: Buffer;
  readonly path: string;
}

export function auditCandidateArtifact(input: {
  readonly artifactPath: string;
  readonly candidateVersion: string;
  readonly expectedFiles: readonly string[];
  readonly expectedDocuments: readonly PackageDocumentationFile[];
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedMachineMaterials: readonly PackageMachineMaterial[];
  readonly expectedReadme: string;
  readonly expectedSha256: string;
}): void {
  const actualSha256 = sha256File(input.artifactPath);
  if (actualSha256 !== input.expectedSha256) {
    throw new Error(`candidate artifact digest changed for ${input.artifactPath}`);
  }
  const entries = readTarEntries(input.artifactPath);
  assertTarPackageDocumentation(entries, input.expectedDocuments);
  assertTarMachineMaterials(entries, input.expectedMachineMaterials);
  assertTarInventory(entries, input.expectedFiles);
  assertTarCoreMaterials(entries, input);
}

function assertTarInventory(entries: readonly TarEntry[], expectedFiles: readonly string[]): void {
  const files = entries.map((entry) => entry.path).sort();
  if (!sameOrderedStrings(files, expectedFiles)) {
    throw new Error(
      `candidate artifact files differ from the staging allowlist: expected ${expectedFiles.join(", ")}; received ${files.join(", ")}`
    );
  }
}

function assertTarCoreMaterials(
  entries: readonly TarEntry[],
  input: Readonly<{
    readonly candidateVersion: string;
    readonly expectedJSDocExamplePayloads: readonly string[];
    readonly expectedReadme: string;
  }>
): void {
  const manifest = requiredTarEntry(entries, "package/package.json");
  assertTarReadme(entries, input.expectedReadme);
  assertTarLegalMaterials(entries);
  assertTarDeclarationExamples(entries, input.expectedJSDocExamplePayloads);
  auditCandidateManifest(manifest.content, input.candidateVersion);
  assertManifestPackageEntries(entries);
}

function assertTarReadme(entries: readonly TarEntry[], expectedReadme: string): void {
  const readme = requiredTarEntry(entries, `package/${PACKAGE_README_PATH}`);
  if (!readme.content.equals(Buffer.from(expectedReadme, "utf8"))) {
    throw new Error("candidate artifact README does not match the documentation projection");
  }
}

function assertTarLegalMaterials(entries: readonly TarEntry[]): void {
  const packageLicense = requiredTarEntry(entries, `package/${PACKAGE_LICENSE_PATH}`);
  assertPackageLicenseContent(packageLicense.content);
  for (const license of PACKAGE_THIRD_PARTY_LICENSES) {
    assertThirdPartyLicenseContent(
      requiredTarEntry(entries, `package/${license.path}`).content,
      license
    );
  }
  const legalAccess = tarPackageLegalMaterialAccess(entries);
  assertTranslatedAnalyzerLegalMaterials(legalAccess);
  assertNoLegacyFunctionMetricsRuntime(legalAccess);
}

function tarPackageLegalMaterialAccess(entries: readonly TarEntry[]): PackagedLegalMaterialAccess {
  const materials = new Map<string, Buffer>();
  for (const entry of entries) {
    if (!entry.path.startsWith("package/")) {
      throw new Error(`candidate artifact entry is outside its package root: ${entry.path}`);
    }
    const packagePath = entry.path.slice("package/".length);
    if (materials.has(packagePath)) {
      throw new Error(`candidate artifact repeats a package entry: ${packagePath}`);
    }
    materials.set(packagePath, entry.content);
  }
  return Object.freeze({
    files: Object.freeze([...materials.keys()].sort()),
    hasFile: (packagePath: string) => materials.has(packagePath),
    readFile: (packagePath: string) => {
      const content = materials.get(packagePath);
      if (content === undefined) throw new Error(`candidate artifact is missing ${packagePath}`);
      return content;
    }
  });
}

function assertTarDeclarationExamples(
  entries: readonly TarEntry[],
  expectedPayloads: readonly string[]
): void {
  assertJSDocExamplePayloads({
    declarationSources: entries
      .filter((entry) => entry.path.startsWith("package/types/") && entry.path.endsWith(".d.ts"))
      .map((entry) => entry.content.toString("utf8")),
    description: "candidate artifact declarations",
    expectedPayloads
  });
}

function requiredTarEntry(entries: readonly TarEntry[], path: string): TarEntry {
  const entry = entries.find((candidate) => candidate.path === path);
  if (entry === undefined) throw new Error(`candidate artifact is missing ${path}`);
  return entry;
}

function assertTarMachineMaterials(
  entries: readonly TarEntry[],
  materials: readonly PackageMachineMaterial[]
): void {
  for (const material of materials) {
    const entry = entries.find((candidate) => candidate.path === `package/${material.packagePath}`);
    if (entry === undefined || !entry.content.equals(material.content)) {
      throw new Error(`candidate artifact machine material differs: ${material.packagePath}`);
    }
  }
}

function assertTarPackageDocumentation(
  entries: readonly TarEntry[],
  documents: readonly PackageDocumentationFile[]
): void {
  for (const document of documents) {
    const entry = entries.find((candidate) => candidate.path === `package/${document.packagePath}`);
    if (entry === undefined || !entry.content.equals(Buffer.from(document.content, "utf8"))) {
      throw new Error(`candidate artifact package documentation differs: ${document.packagePath}`);
    }
  }
}

function assertManifestPackageEntries(entries: readonly TarEntry[]): void {
  if (
    !entries.some((entry) => entry.path === `package/${PACKAGE_ENTRY_PATH}`) ||
    !entries.some((entry) => entry.path === `package/${PACKAGE_TYPES_PATH}`) ||
    !entries.some((entry) => entry.path === `package/${PACKAGE_LICENSE_PATH}`) ||
    !entries.some((entry) => entry.path === `package/${PACKAGE_README_PATH}`) ||
    !PACKAGE_THIRD_PARTY_LEGAL_MATERIALS.every((material) =>
      entries.some((entry) => entry.path === `package/${material.path}`)
    )
  ) {
    throw new Error(
      "candidate artifact is missing its approved runtime, declarations, README, or legal material"
    );
  }
}

function readTarEntries(artifactPath: string): readonly TarEntry[] {
  let archive: Buffer;
  try {
    archive = gunzipSync(readFileSync(artifactPath));
  } catch (error: unknown) {
    throw new Error(`could not read candidate artifact ${artifactPath}: ${errorMessage(error)}`, {
      cause: error
    });
  }
  const entries: TarEntry[] = [];
  let offset = 0;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((value) => value === 0)) break;
    const size = parseTarSize(header.subarray(124, 136));
    const type = header[156];
    const path = tarPath(header);
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    if (contentEnd > archive.length)
      throw new Error(`candidate artifact ${artifactPath} has a truncated tar entry`);
    const isDirectory = type === 53;
    const isRegularFile = type === 0 || type === 48;
    if (!isDirectory && !isRegularFile) {
      throw new Error(`candidate artifact contains unsupported tar entry type for ${path}`);
    }
    if (!isDirectory)
      entries.push(Object.freeze({ content: archive.subarray(contentStart, contentEnd), path }));
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  return Object.freeze(entries.sort((left, right) => left.path.localeCompare(right.path)));
}

function parseTarSize(source: Buffer): number {
  const text = source.toString("utf8").replace(/\0/g, "").trim();
  if (!/^[0-7]*$/.test(text))
    throw new Error("candidate artifact contains an invalid tar entry size");
  return text === "" ? 0 : Number.parseInt(text, 8);
}

function tarPath(header: Buffer): string {
  const name = tarString(header.subarray(0, 100));
  const prefix = tarString(header.subarray(345, 500));
  const path = prefix ? `${prefix}/${name}` : name;
  if (path.length === 0 || path.startsWith("/") || path.includes("../")) {
    throw new Error("candidate artifact contains an unsafe tar path");
  }
  return path;
}

function tarString(source: Buffer): string {
  const terminator = source.indexOf(0);
  return source.subarray(0, terminator === -1 ? source.length : terminator).toString("utf8");
}
