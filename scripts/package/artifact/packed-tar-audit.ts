import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

import { errorMessage } from "../../error-message.ts";
import { isNonArrayRecord } from "../../value-guards.ts";
import {
  CANDIDATE_DEPENDENCIES,
  CANDIDATE_NAME,
  PACKAGE_ENTRY_PATH,
  PACKAGE_MOMOA_LICENSE_PATH,
  PACKAGE_README_PATH,
  PACKAGE_TYPES_PATH
} from "../package-contract.ts";
import { sha256File } from "../pack.ts";
import {
  assertJSDocExamplePayloads,
  assertMomoaLicenseContent,
  sameOrderedStrings
} from "../package-material-audit.ts";
import type { PackageDocumentationFile } from "../../docs/package-api/check-guides.ts";
import type { PackageMachineMaterial } from "../../docs/machine-artifacts/package-materials.ts";

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
  const files = entries.map((entry) => entry.path).sort();
  if (!sameOrderedStrings(files, input.expectedFiles)) {
    throw new Error(
      `candidate artifact files differ from the staging allowlist: expected ${input.expectedFiles.join(", ")}; received ${files.join(", ")}`
    );
  }
  const manifestEntry = entries.find((entry) => entry.path === "package/package.json");
  if (manifestEntry === undefined)
    throw new Error("candidate artifact is missing package/package.json");
  const readmeEntry = entries.find((entry) => entry.path === `package/${PACKAGE_README_PATH}`);
  if (readmeEntry === undefined)
    throw new Error(`candidate artifact is missing package/${PACKAGE_README_PATH}`);
  if (!readmeEntry.content.equals(Buffer.from(input.expectedReadme, "utf8"))) {
    throw new Error("candidate artifact README does not match the documentation projection");
  }
  const momoaLicenseEntry = entries.find(
    (entry) => entry.path === `package/${PACKAGE_MOMOA_LICENSE_PATH}`
  );
  if (momoaLicenseEntry === undefined) {
    throw new Error("candidate artifact is missing Momoa license material");
  }
  assertMomoaLicenseContent(momoaLicenseEntry.content);
  assertJSDocExamplePayloads({
    declarationSources: entries
      .filter((entry) => entry.path.startsWith("package/types/") && entry.path.endsWith(".d.ts"))
      .map((entry) => entry.content.toString("utf8")),
    description: "candidate artifact declarations",
    expectedPayloads: input.expectedJSDocExamplePayloads
  });
  auditManifest(manifestEntry.content, input.candidateVersion, entries);
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

function auditManifest(
  source: Buffer,
  candidateVersion: string,
  entries: readonly TarEntry[]
): void {
  let manifest: unknown;
  try {
    manifest = JSON.parse(source.toString("utf8"));
  } catch (error: unknown) {
    throw new Error(`candidate artifact manifest is invalid JSON: ${errorMessage(error)}`, {
      cause: error
    });
  }
  if (!isNonArrayRecord(manifest)) throw new Error("candidate artifact manifest must be an object");
  if (
    manifest.name !== CANDIDATE_NAME ||
    manifest.version !== candidateVersion ||
    manifest.type !== "module"
  ) {
    throw new Error("candidate artifact manifest identity does not match the prepared candidate");
  }
  if (Object.hasOwn(manifest, "bin"))
    throw new Error("candidate artifact must not expose an executable bin");
  if (!sameDependencies(manifest.dependencies)) {
    throw new Error(
      "candidate artifact production dependencies do not match the candidate dependency contract"
    );
  }
  if (!hasPublicExports(manifest.exports)) {
    throw new Error(
      "candidate artifact must expose only its approved import and declarations entries"
    );
  }
  if (
    !entries.some((entry) => entry.path === `package/${PACKAGE_ENTRY_PATH}`) ||
    !entries.some((entry) => entry.path === `package/${PACKAGE_TYPES_PATH}`) ||
    !entries.some((entry) => entry.path === `package/${PACKAGE_README_PATH}`) ||
    !entries.some((entry) => entry.path === `package/${PACKAGE_MOMOA_LICENSE_PATH}`)
  ) {
    throw new Error(
      "candidate artifact is missing its approved runtime, declarations, README, or Momoa license entry"
    );
  }
}

function sameDependencies(value: unknown): boolean {
  if (!isNonArrayRecord(value)) return false;
  const dependencies = Object.entries(CANDIDATE_DEPENDENCIES);
  const dependencyNames = dependencies.map(([name]) => name).sort();
  return (
    sameOrderedStrings(Object.keys(value).sort(), dependencyNames) &&
    dependencies.every(([key, version]) => value[key] === version)
  );
}

function hasPublicExports(value: unknown): boolean {
  if (
    !isNonArrayRecord(value) ||
    Object.keys(value).length !== 1 ||
    !isNonArrayRecord(value["."])
  ) {
    return false;
  }
  const root = value["."];
  return (
    Object.keys(root).sort().join("\0") === "import\0types" &&
    root.import === `./${PACKAGE_ENTRY_PATH}` &&
    root.types === `./${PACKAGE_TYPES_PATH}`
  );
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
