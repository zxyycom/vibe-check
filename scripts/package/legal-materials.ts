import { createHash } from "node:crypto";

import {
  PACKAGE_LIZARD_APACHE_LICENSE_PATH,
  PACKAGE_LIZARD_APACHE_LICENSE_SHA256,
  PACKAGE_LIZARD_MIT_LICENSE_PATH,
  PACKAGE_LIZARD_MIT_LICENSE_SHA256,
  PACKAGE_MOMOA_LICENSE_PATH,
  MOMOA_LICENSE_SHA256,
  PACKAGE_PYGMENTS_LICENSE_PATH,
  PACKAGE_PYGMENTS_LICENSE_SHA256,
  PACKAGE_THIRD_PARTY_NOTICES_PATH,
  PACKAGE_THIRD_PARTY_NOTICES_SHA256,
  PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH,
  PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_SHA256
} from "./package-contract.ts";

const LIZARD_REVISION = "308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec";
const PYGMENTS_ERLANG_PATH = "pygments/lexers/erlang.py";
const PYGMENTS_ERLANG_RANGE = "lines 22-146";
const TRANSLATED_SOURCE_HEADER = "Derived from terryyin/lizard 1.24.0.";
const PROVENANCE_STATUSES = Object.freeze([
  "translated",
  "deferred-extension-body",
  "excluded-entry-surface"
] as const);
const SPDX_LICENSES = Object.freeze(["Apache-2.0", "BSD-2-Clause", "MIT"] as const);
const SPDX_LICENSE_SET: ReadonlySet<string> = new Set(SPDX_LICENSES);
const SOURCE_RANGE_PATTERN = /^lines ([1-9][0-9]*)-([1-9][0-9]*)$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const DEFERRED_EXTENSION_BODY_COUNT = 22;
const DEFERRED_EXTENSION_SUPPORT_COUNT = 2;

export interface PackagedLegalMaterial {
  readonly path: string;
  readonly sha256: string;
}

interface ProvenanceEntry {
  readonly additionalTargetPaths: readonly string[];
  readonly range: string;
  readonly sourcePath: string;
  readonly spdx: string;
  readonly status: (typeof PROVENANCE_STATUSES)[number];
  readonly targetPath: string | undefined;
}

interface ProvenanceInventory {
  readonly files: readonly ProvenanceEntry[];
  readonly supplementalSources: readonly ProvenanceEntry[];
}

/** Complete license texts required by translated analyzer source headers. */
export const TRANSLATED_ANALYZER_LICENSE_MATERIALS: readonly PackagedLegalMaterial[] =
  Object.freeze([
    Object.freeze({
      path: PACKAGE_LIZARD_MIT_LICENSE_PATH,
      sha256: PACKAGE_LIZARD_MIT_LICENSE_SHA256
    }),
    Object.freeze({
      path: PACKAGE_LIZARD_APACHE_LICENSE_PATH,
      sha256: PACKAGE_LIZARD_APACHE_LICENSE_SHA256
    }),
    Object.freeze({
      path: PACKAGE_PYGMENTS_LICENSE_PATH,
      sha256: PACKAGE_PYGMENTS_LICENSE_SHA256
    })
  ]);

/** Notice and range-level evidence that binds the translated source headers to fixed upstream input. */
export const TRANSLATED_ANALYZER_NOTICE_MATERIALS: readonly PackagedLegalMaterial[] = Object.freeze(
  [
    Object.freeze({
      path: PACKAGE_THIRD_PARTY_NOTICES_PATH,
      sha256: PACKAGE_THIRD_PARTY_NOTICES_SHA256
    }),
    Object.freeze({
      path: PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH,
      sha256: PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_SHA256
    })
  ]
);

/** Byte-identities of legal materials added for the translated analyzer closure. */
export const TRANSLATED_ANALYZER_LEGAL_MATERIALS: readonly PackagedLegalMaterial[] = Object.freeze([
  ...TRANSLATED_ANALYZER_NOTICE_MATERIALS,
  ...TRANSLATED_ANALYZER_LICENSE_MATERIALS
]);

/** All third-party legal materials receipted with the package, excluding Vibe Check's own LICENSE. */
export const PACKAGE_THIRD_PARTY_LEGAL_MATERIALS: readonly PackagedLegalMaterial[] = Object.freeze([
  Object.freeze({ path: PACKAGE_MOMOA_LICENSE_PATH, sha256: MOMOA_LICENSE_SHA256 }),
  ...TRANSLATED_ANALYZER_LEGAL_MATERIALS
]);

/** A staging directory, tarball, or installed package can provide this minimal file view. */
export interface PackagedLegalMaterialAccess {
  readonly files: readonly string[];
  readonly hasFile: (packagePath: string) => boolean;
  readonly readFile: (packagePath: string) => Buffer;
}

/**
 * Validates the package-local legal closure without consulting a source checkout.
 *
 * Every translated source target is checked against its packaged provenance record,
 * leading source header, SPDX terms, and complete physical license text. Deferred
 * extension names remain evidence only: neither their TypeScript sources nor their
 * emitted runtime modules may enter the package.
 */
export function assertTranslatedAnalyzerLegalMaterials(access: PackagedLegalMaterialAccess): void {
  assertExactLegalMaterialBytes(access);
  const inventory = parseProvenanceInventory(
    access.readFile(PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH)
  );
  const translatedByTarget = collectTranslatedTargets(inventory);
  assertTranslatedTargetHeaders(access, translatedByTarget);
  assertNoUntrackedTranslatedSourceHeaders(access, translatedByTarget);
  assertDeferredExtensionBodiesRemainUnshipped(access, inventory.files);
  assertNoticeSummarizesFixedSources(access.readFile(PACKAGE_THIRD_PARTY_NOTICES_PATH));
}

/** Proves the hard-cut candidate cannot carry the retired external function-metrics adapter. */
export function assertNoLegacyFunctionMetricsRuntime(access: PackagedLegalMaterialAccess): void {
  const retiredDirectoryFragments = [
    "src/package-checks/function-metrics/lizard/",
    "dist/esm/package-checks/function-metrics/lizard/"
  ];
  const retiredFiles = access.files.filter((path) =>
    retiredDirectoryFragments.some((fragment) => path.startsWith(fragment))
  );
  if (retiredFiles.length > 0) {
    throw new Error(
      `candidate package still ships retired Lizard function-metrics runtime files: ${retiredFiles.join(", ")}`
    );
  }

  const manifest = parseJsonRecord(access.readFile("package.json"), "candidate package manifest");
  const dependencies = manifest.dependencies;
  if (!isRecord(dependencies)) {
    throw new Error("candidate package manifest dependencies must be an object");
  }
  const prohibitedDependencies = Object.keys(dependencies).filter((name) =>
    /(?:^|[-_/])(lizard|pygments|python)(?:$|[-_/])/iu.test(name)
  );
  if (prohibitedDependencies.length > 0) {
    throw new Error(
      `candidate package declares retired Python/Lizard/Pygments runtime dependencies: ${prohibitedDependencies.join(", ")}`
    );
  }
}

function assertExactLegalMaterialBytes(access: PackagedLegalMaterialAccess): void {
  for (const material of TRANSLATED_ANALYZER_LEGAL_MATERIALS) {
    if (!access.hasFile(material.path)) {
      throw new Error(
        `candidate package is missing translated-analyzer legal material: ${material.path}`
      );
    }
    const actual = sha256(access.readFile(material.path));
    if (actual !== material.sha256) {
      throw new Error(
        `candidate translated-analyzer legal material differs from its approved bytes: ${material.path}`
      );
    }
  }
}

function parseProvenanceInventory(source: Buffer): ProvenanceInventory {
  const value = parseJsonRecord(source, "translated-analyzer provenance inventory");
  if (
    value.schemaVersion !== 2 ||
    !isRecord(value.upstream) ||
    value.upstream.project !== "terryyin/lizard" ||
    value.upstream.tag !== "1.24.0" ||
    value.upstream.revision !== LIZARD_REVISION ||
    !sameStrings(value.statusVocabulary, PROVENANCE_STATUSES) ||
    !Array.isArray(value.files) ||
    value.files.length !== 84 ||
    !Array.isArray(value.supplementalSources) ||
    value.supplementalSources.length !== 1
  ) {
    throw new Error(
      "translated-analyzer provenance inventory has an unexpected fixed-source identity"
    );
  }
  const files = value.files.map((entry, index) => parseProvenanceEntry(entry, `files[${index}]`));
  const supplementalSources = value.supplementalSources.map((entry, index) =>
    parseSupplementalSource(entry, `supplementalSources[${index}]`)
  );
  assertProvenanceStatusCounts(files);
  return Object.freeze({
    files: Object.freeze(files),
    supplementalSources: Object.freeze(supplementalSources)
  });
}

function parseProvenanceEntry(value: unknown, description: string): ProvenanceEntry {
  if (!isRecord(value))
    throw new Error(`translated-analyzer provenance ${description} must be an object`);
  const sourcePath = requiredString(
    value.sourcePath,
    `translated-analyzer provenance ${description}.sourcePath`
  );
  const range = requiredString(value.range, `translated-analyzer provenance ${description}.range`);
  const spdx = requiredString(value.spdx, `translated-analyzer provenance ${description}.spdx`);
  const status = requiredString(
    value.status,
    `translated-analyzer provenance ${description}.status`
  );
  if (
    !isSafeSourcePath(sourcePath) ||
    !validSourceRange(range) ||
    !SPDX_LICENSE_SET.has(spdx) ||
    !isProvenanceStatus(status) ||
    !isSha256(value.sha256)
  ) {
    throw new Error(`translated-analyzer provenance ${description} has invalid source metadata`);
  }
  const targetPath = optionalTargetPath(value.targetPath, `${description}.targetPath`);
  const additionalTargetPaths = optionalTargetPaths(value.additionalTargetPaths, description);
  if (status === "excluded-entry-surface") {
    if (targetPath !== undefined || additionalTargetPaths.length !== 0) {
      throw new Error(
        `excluded translated-analyzer provenance ${description} must not name a target`
      );
    }
  } else if (targetPath === undefined) {
    throw new Error(`translated-analyzer provenance ${description} must name a target`);
  }
  return Object.freeze({
    additionalTargetPaths,
    range,
    sourcePath,
    spdx,
    status,
    targetPath
  });
}

function parseSupplementalSource(value: unknown, description: string): ProvenanceEntry {
  const source = parseProvenanceEntry(value, description);
  if (!isRecord(value))
    throw new Error(`translated-analyzer provenance ${description} must be an object`);
  if (
    value.project !== "Pygments" ||
    value.version !== "2.18.0" ||
    source.sourcePath !== PYGMENTS_ERLANG_PATH ||
    source.range !== PYGMENTS_ERLANG_RANGE ||
    source.spdx !== "BSD-2-Clause" ||
    source.status !== "translated" ||
    source.additionalTargetPaths.length !== 0 ||
    !isRecord(value.distribution) ||
    !isSha256(value.distribution.sha256) ||
    !isSha256(value.licenseSha256) ||
    value.licensePath !== "pygments-2.18.0.dist-info/licenses/LICENSE"
  ) {
    throw new Error("translated-analyzer Pygments supplemental provenance drifted");
  }
  return source;
}

function assertProvenanceStatusCounts(entries: readonly ProvenanceEntry[]): void {
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
  if (
    counts.get("translated") !== 44 ||
    counts.get("deferred-extension-body") !==
      DEFERRED_EXTENSION_BODY_COUNT + DEFERRED_EXTENSION_SUPPORT_COUNT ||
    counts.get("excluded-entry-surface") !== 16
  ) {
    throw new Error("translated-analyzer provenance status closure drifted");
  }
}

function collectTranslatedTargets(
  inventory: ProvenanceInventory
): ReadonlyMap<string, readonly ProvenanceEntry[]> {
  const sourcesByTarget = new Map<string, ProvenanceEntry[]>();
  for (const entry of [...inventory.files, ...inventory.supplementalSources]) {
    if (entry.status !== "translated" || entry.targetPath === undefined) continue;
    for (const targetPath of [entry.targetPath, ...entry.additionalTargetPaths]) {
      const sources = sourcesByTarget.get(targetPath) ?? [];
      sources.push(entry);
      sourcesByTarget.set(targetPath, sources);
    }
  }
  if (sourcesByTarget.size === 39) {
    return new Map(
      [...sourcesByTarget].map(([targetPath, entries]) => [targetPath, Object.freeze(entries)])
    );
  }
  throw new Error("translated-analyzer provenance does not close its expected target set");
}

function assertTranslatedTargetHeaders(
  access: PackagedLegalMaterialAccess,
  translatedByTarget: ReadonlyMap<string, readonly ProvenanceEntry[]>
): void {
  for (const [targetPath, entries] of translatedByTarget) {
    if (!access.hasFile(targetPath)) {
      throw new Error(`candidate package is missing translated analyzer target: ${targetPath}`);
    }
    const header = leadingBlockComment(access.readFile(targetPath), targetPath);
    if (
      !header.includes(TRANSLATED_SOURCE_HEADER) ||
      !header.includes(`Upstream revision: ${LIZARD_REVISION}.`) ||
      !header.includes("Modified:")
    ) {
      throw new Error(
        `translated analyzer target lacks source/revision/modified header: ${targetPath}`
      );
    }
    const headerSpdx = spdxIdentifiers(header, targetPath);
    for (const entry of entries) {
      if (!header.includes(entry.sourcePath)) {
        throw new Error(
          `translated analyzer header does not identify provenance source ${entry.sourcePath}: ${targetPath}`
        );
      }
      if (!headerSpdx.has(entry.spdx)) {
        throw new Error(
          `translated analyzer header does not carry ${entry.spdx} from ${entry.sourcePath}: ${targetPath}`
        );
      }
    }
    for (const identifier of headerSpdx)
      assertPhysicalLicenseForSpdx(access, identifier, targetPath);
  }
}

function assertNoUntrackedTranslatedSourceHeaders(
  access: PackagedLegalMaterialAccess,
  translatedByTarget: ReadonlyMap<string, readonly ProvenanceEntry[]>
): void {
  for (const packagePath of access.files) {
    if (!packagePath.startsWith("src/") || !packagePath.endsWith(".ts")) continue;
    const source = access.readFile(packagePath).toString("utf8");
    if (source.startsWith("/**") && source.includes(TRANSLATED_SOURCE_HEADER)) {
      if (!translatedByTarget.has(packagePath)) {
        throw new Error(
          `packaged translated analyzer header has no provenance target entry: ${packagePath}`
        );
      }
    }
  }
}

function assertDeferredExtensionBodiesRemainUnshipped(
  access: PackagedLegalMaterialAccess,
  entries: readonly ProvenanceEntry[]
): void {
  const deferred = entries.filter((entry) => entry.status === "deferred-extension-body");
  if (deferred.length !== DEFERRED_EXTENSION_BODY_COUNT + DEFERRED_EXTENSION_SUPPORT_COUNT) {
    throw new Error("translated-analyzer deferred extension closure drifted");
  }
  for (const entry of deferred) {
    if (entry.targetPath === undefined) {
      throw new Error(
        `deferred translated-analyzer source lacks target identity: ${entry.sourcePath}`
      );
    }
    const runtimePath = emittedRuntimePath(entry.targetPath);
    if (access.hasFile(entry.targetPath) || access.hasFile(runtimePath)) {
      throw new Error(
        `deferred translated-analyzer extension body must not be shipped: ${entry.sourcePath}`
      );
    }
  }
}

function assertNoticeSummarizesFixedSources(source: Buffer): void {
  const notice = source.toString("utf8");
  for (const requiredText of [
    LIZARD_REVISION,
    "Lizard 1.24.0",
    "Apache-2.0",
    "Pygments 2.18.0",
    "BSD-2-Clause",
    "22 Lizard concrete extension bodies (the 19 legacy bodies plus three new Halstead modules) and two extension-only support",
    PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH,
    PACKAGE_MOMOA_LICENSE_PATH
  ]) {
    if (!notice.includes(requiredText)) {
      throw new Error(
        `translated-analyzer third-party notices omit required material: ${requiredText}`
      );
    }
  }
}

function assertPhysicalLicenseForSpdx(
  access: PackagedLegalMaterialAccess,
  identifier: string,
  targetPath: string
): void {
  const path = physicalLicensePath(identifier);
  if (path === undefined || !access.hasFile(path)) {
    throw new Error(
      `translated analyzer SPDX ${identifier} has no physical license: ${targetPath}`
    );
  }
}

function physicalLicensePath(identifier: string): string | undefined {
  switch (identifier) {
    case "MIT":
      return PACKAGE_LIZARD_MIT_LICENSE_PATH;
    case "Apache-2.0":
      return PACKAGE_LIZARD_APACHE_LICENSE_PATH;
    case "BSD-2-Clause":
      return PACKAGE_PYGMENTS_LICENSE_PATH;
    default:
      return undefined;
  }
}

function leadingBlockComment(source: Buffer, targetPath: string): string {
  const text = source.toString("utf8");
  if (!text.startsWith("/**")) {
    throw new Error(`translated analyzer target must start with a source header: ${targetPath}`);
  }
  const end = text.indexOf("*/");
  if (end === -1) {
    throw new Error(`translated analyzer target has an unterminated source header: ${targetPath}`);
  }
  return text.slice(0, end + 2);
}

function spdxIdentifiers(header: string, targetPath: string): ReadonlySet<string> {
  const match = /SPDX-License-Identifier:\s*([^\r\n*]+)/u.exec(header);
  if (match === null) {
    throw new Error(`translated analyzer target lacks an SPDX header: ${targetPath}`);
  }
  const identifiers = match[1].trim().split(" AND ");
  if (
    identifiers.length === 0 ||
    identifiers.some((identifier) => !SPDX_LICENSE_SET.has(identifier))
  ) {
    throw new Error(`translated analyzer target has an unsupported SPDX expression: ${targetPath}`);
  }
  return new Set(identifiers);
}

function emittedRuntimePath(sourcePath: string): string {
  if (!sourcePath.startsWith("src/") || !sourcePath.endsWith(".ts")) {
    throw new Error(
      `translated-analyzer target path is not a package TypeScript source: ${sourcePath}`
    );
  }
  return `dist/esm/${sourcePath.slice("src/".length, -".ts".length)}.mjs`;
}

function optionalTargetPath(value: unknown, description: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !isSafeTargetPath(value)) {
    throw new Error(
      `translated-analyzer provenance ${description} must be a package TypeScript target`
    );
  }
  return value;
}

function optionalTargetPaths(value: unknown, description: string): readonly string[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) {
    throw new Error(
      `translated-analyzer provenance ${description}.additionalTargetPaths is invalid`
    );
  }
  const paths: string[] = [];
  for (const path of value) {
    if (typeof path !== "string" || !isSafeTargetPath(path)) {
      throw new Error(
        `translated-analyzer provenance ${description}.additionalTargetPaths is invalid`
      );
    }
    paths.push(path);
  }
  return Object.freeze(paths);
}

function isSafeSourcePath(value: string): boolean {
  return value.length > 0 && !value.startsWith("/") && value.split("/").every(isSafePathSegment);
}

function isSafeTargetPath(value: string): boolean {
  return value.startsWith("src/") && value.endsWith(".ts") && isSafeSourcePath(value);
}

function isSafePathSegment(value: string): boolean {
  return value.length > 0 && value !== "." && value !== "..";
}

function validSourceRange(value: string): boolean {
  const match = SOURCE_RANGE_PATTERN.exec(value);
  return match !== null && Number(match[1]) <= Number(match[2]);
}

function isProvenanceStatus(value: string): value is ProvenanceEntry["status"] {
  return PROVENANCE_STATUSES.some((status) => status === value);
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseJsonRecord(source: Buffer, description: string): Readonly<Record<string, unknown>> {
  let value: unknown;
  try {
    value = JSON.parse(source.toString("utf8"));
  } catch (error: unknown) {
    throw new Error(`${description} is invalid JSON`, { cause: error });
  }
  if (!isRecord(value)) throw new Error(`${description} must be an object`);
  return value;
}

function requiredString(value: unknown, description: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${description} must be a non-empty string`);
  }
  return value;
}

function sameStrings(value: unknown, expected: readonly string[]): boolean {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((item, index) => item === expected[index])
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
