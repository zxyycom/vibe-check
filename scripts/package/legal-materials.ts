import {
  IMMUTABLE_LICENSE_SHA256,
  PACKAGE_LIZARD_APACHE_LICENSE_PATH,
  PACKAGE_LIZARD_APACHE_LICENSE_SHA256,
  PACKAGE_LIZARD_MIT_LICENSE_PATH,
  PACKAGE_LIZARD_MIT_LICENSE_SHA256,
  PACKAGE_IMMUTABLE_LICENSE_PATH,
  PACKAGE_MOMOA_LICENSE_PATH,
  MOMOA_LICENSE_SHA256,
  PACKAGE_PYGMENTS_LICENSE_PATH,
  PACKAGE_PYGMENTS_LICENSE_SHA256,
  PACKAGE_SECRETLINT_LICENSE_PATH,
  SECRETLINT_LICENSE_SHA256,
  PACKAGE_THIRD_PARTY_NOTICES_PATH,
  PACKAGE_THIRD_PARTY_NOTICES_SHA256,
  PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH,
  PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_SHA256
} from "./package-contract.ts";
import {
  assertDeferredExtensionBodiesRemainUnshipped,
  assertExactLegalMaterialBytes,
  assertNoUntrackedTranslatedSourceHeaders,
  assertNoticeSummarizesFixedSources,
  assertTranslatedTargetHeaders
} from "./legal-materials/packaged-audit.ts";
import {
  collectTranslatedTargets,
  parseTranslatedAnalyzerProvenanceInventory
} from "./legal-materials/provenance-inventory.ts";

export interface PackagedLegalMaterial {
  readonly path: string;
  readonly sha256: string;
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
  Object.freeze({ path: PACKAGE_IMMUTABLE_LICENSE_PATH, sha256: IMMUTABLE_LICENSE_SHA256 }),
  Object.freeze({ path: PACKAGE_MOMOA_LICENSE_PATH, sha256: MOMOA_LICENSE_SHA256 }),
  Object.freeze({ path: PACKAGE_SECRETLINT_LICENSE_PATH, sha256: SECRETLINT_LICENSE_SHA256 }),
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
  assertExactLegalMaterialBytes(access, TRANSLATED_ANALYZER_LEGAL_MATERIALS);
  const inventory = parseTranslatedAnalyzerProvenanceInventory(
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

  const dependencies = candidateManifestDependencies(access.readFile("package.json"));
  const prohibitedDependencies = Object.keys(dependencies).filter((name) =>
    /(?:^|[-_/])(lizard|pygments|python)(?:$|[-_/])/iu.test(name)
  );
  if (prohibitedDependencies.length > 0) {
    throw new Error(
      `candidate package declares retired Python/Lizard/Pygments runtime dependencies: ${prohibitedDependencies.join(", ")}`
    );
  }
}

function candidateManifestDependencies(source: Buffer): Readonly<Record<string, unknown>> {
  let manifest: unknown;
  try {
    manifest = JSON.parse(source.toString("utf8"));
  } catch (error: unknown) {
    throw new Error("candidate package manifest is invalid JSON", { cause: error });
  }
  if (!isRecord(manifest)) throw new Error("candidate package manifest must be an object");
  if (!isRecord(manifest.dependencies)) {
    throw new Error("candidate package manifest dependencies must be an object");
  }
  return manifest.dependencies;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
