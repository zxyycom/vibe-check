import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { isNonArrayRecord, isStringArray } from "../value-guards.ts";
import {
  PACKAGE_LIZARD_APACHE_LICENSE_PATH,
  PACKAGE_LIZARD_MIT_LICENSE_PATH,
  PACKAGE_PYGMENTS_LICENSE_PATH,
  PACKAGE_THIRD_PARTY_NOTICES_PATH,
  PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH
} from "./package-contract.ts";
import {
  assertTranslatedAnalyzerLegalMaterials,
  readTranslatedAnalyzerAttributionNotice,
  type PackagedLegalMaterialAccess
} from "./legal-materials.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceHeader = "/**\n * Derived from terryyin/lizard 1.24.0.\n */\n";
const untrackedTargetPath = "src/untracked-translated-source.ts";
const targetClosurePath = "src/translated-target-closure-drift.ts";

type ProvenanceFile = Readonly<{
  readonly additionalTargetPaths?: readonly string[];
  readonly sourcePath: string;
  readonly status: string;
  readonly targetPath?: string;
}>;

type ProvenanceSource = Readonly<{
  readonly files: readonly ProvenanceFile[];
  readonly supplementalSources: readonly ProvenanceFile[];
}>;

type LegalAccessMutation = Readonly<{
  readonly afterApprovedBytes?: ReadonlyMap<string, Buffer>;
  readonly extraFiles?: ReadonlyMap<string, Buffer>;
  readonly missingFiles?: ReadonlySet<string>;
  readonly noticeContent?: Buffer;
}>;

describe("package legal materials", () => {
  it("fails closed in the translated-analyzer audit phase order", () => {
    const expectedAttributionNotice = readTranslatedAnalyzerAttributionNotice(repositoryRoot);
    assert.doesNotThrow(() =>
      assertTranslatedAnalyzerLegalMaterials(legalAccess(), expectedAttributionNotice)
    );

    const malformedInventory = Buffer.from("{", "utf8");
    const headerDriftInventory = mutateInventory((inventory) => {
      const entry = translatedFile(inventory);
      entry.sourcePath = "legal-materials-test-missing-source.py";
    });
    const targetClosureDriftInventory = mutateInventory((inventory) => {
      const entry = translatedFile(inventory);
      entry.additionalTargetPaths = [...(entry.additionalTargetPaths ?? []), targetClosurePath];
    });
    const deferredTarget = deferredFile(provenance()).targetPath;
    if (deferredTarget === undefined) throw new Error("fixture deferred source must name a target");

    assert.throws(
      () =>
        assertTranslatedAnalyzerLegalMaterials(
          legalAccess({ missingFiles: new Set([PACKAGE_THIRD_PARTY_NOTICES_PATH]) }),
          expectedAttributionNotice
        ),
      new RegExp(
        `candidate package is missing translated-analyzer attribution notice: ${PACKAGE_THIRD_PARTY_NOTICES_PATH}`,
        "u"
      )
    );
    assert.throws(
      () =>
        assertTranslatedAnalyzerLegalMaterials(
          legalAccess({ noticeContent: Buffer.from("notice drift", "utf8") }),
          expectedAttributionNotice
        ),
      /attribution notice differs from its repository source/u
    );
    assert.throws(
      () =>
        assertTranslatedAnalyzerLegalMaterials(
          legalAccess({
            afterApprovedBytes: new Map([
              [PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH, malformedInventory]
            ]),
            extraFiles: new Map([[untrackedTargetPath, Buffer.from(sourceHeader, "utf8")]])
          }),
          expectedAttributionNotice
        ),
      /translated-analyzer provenance inventory is invalid JSON/u
    );
    assert.throws(
      () =>
        assertTranslatedAnalyzerLegalMaterials(
          legalAccess({
            afterApprovedBytes: new Map([
              [PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH, targetClosureDriftInventory]
            ])
          }),
          expectedAttributionNotice
        ),
      new RegExp(
        `candidate package is missing translated analyzer target: ${targetClosurePath}`,
        "u"
      )
    );
    assert.throws(
      () =>
        assertTranslatedAnalyzerLegalMaterials(
          legalAccess({
            afterApprovedBytes: new Map([
              [PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH, headerDriftInventory]
            ]),
            extraFiles: new Map([[untrackedTargetPath, Buffer.from(sourceHeader, "utf8")]])
          }),
          expectedAttributionNotice
        ),
      /translated analyzer header does not identify provenance source legal-materials-test-missing-source\.py/u
    );
    assert.throws(
      () =>
        assertTranslatedAnalyzerLegalMaterials(
          legalAccess({
            extraFiles: new Map([
              [untrackedTargetPath, Buffer.from(sourceHeader, "utf8")],
              [deferredTarget, Buffer.from("deferred body\n", "utf8")]
            ])
          }),
          expectedAttributionNotice
        ),
      new RegExp(
        `packaged translated analyzer header has no provenance target entry: ${untrackedTargetPath}`,
        "u"
      )
    );
    assert.throws(
      () =>
        assertTranslatedAnalyzerLegalMaterials(
          legalAccess({
            extraFiles: new Map([[deferredTarget, Buffer.from("deferred body\n", "utf8")]])
          }),
          expectedAttributionNotice
        ),
      new RegExp(
        `deferred translated-analyzer extension body must not be shipped: ${deferredFile(provenance()).sourcePath}`,
        "u"
      )
    );
  });
});

function legalAccess(mutation: LegalAccessMutation = {}): PackagedLegalMaterialAccess {
  const files = legalFiles();
  for (const path of mutation.missingFiles ?? []) files.delete(path);
  for (const [path, content] of mutation.extraFiles ?? []) files.set(path, content);
  const packagePaths = new Set(files.keys());
  const reads = new Map<string, number>();
  return Object.freeze({
    files: Object.freeze([...packagePaths].sort()),
    hasFile: (packagePath: string) => packagePaths.has(packagePath),
    readFile: (packagePath: string) => {
      if (
        packagePath === PACKAGE_THIRD_PARTY_NOTICES_PATH &&
        mutation.noticeContent !== undefined
      ) {
        return mutation.noticeContent;
      }
      const count = reads.get(packagePath) ?? 0;
      reads.set(packagePath, count + 1);
      const afterApprovedBytes = mutation.afterApprovedBytes?.get(packagePath);
      if (count > 0 && afterApprovedBytes !== undefined) return afterApprovedBytes;
      const content = files.get(packagePath);
      if (content === undefined) throw new Error(`fixture package is missing ${packagePath}`);
      return content;
    }
  });
}

function legalFiles(): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  for (const path of [
    PACKAGE_LIZARD_APACHE_LICENSE_PATH,
    PACKAGE_LIZARD_MIT_LICENSE_PATH,
    PACKAGE_PYGMENTS_LICENSE_PATH,
    PACKAGE_THIRD_PARTY_NOTICES_PATH,
    PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH,
    ...translatedTargetPaths(provenance())
  ]) {
    files.set(path, readFileSync(resolve(repositoryRoot, path)));
  }
  return files;
}

function provenance(): ProvenanceSource {
  const source = readProvenanceSource();
  return Object.freeze({
    files: Object.freeze([...source.files]),
    supplementalSources: Object.freeze([...source.supplementalSources])
  });
}

function translatedTargetPaths(source: ProvenanceSource): readonly string[] {
  return source.files.concat(source.supplementalSources).flatMap((entry) => {
    if (entry.status !== "translated" || entry.targetPath === undefined) return [];
    return [entry.targetPath, ...(entry.additionalTargetPaths ?? [])];
  });
}

function mutateInventory(mutate: (inventory: MutableProvenanceSource) => void): Buffer {
  const inventory = readProvenanceSource();
  mutate(inventory);
  return Buffer.from(JSON.stringify(inventory), "utf8");
}

function readProvenanceSource(): MutableProvenanceSource {
  const value: unknown = JSON.parse(
    readFileSync(resolve(repositoryRoot, PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH), "utf8")
  );
  if (!isMutableProvenanceSource(value)) {
    throw new Error("fixture provenance inventory must contain provenance file arrays");
  }
  return value;
}

function isMutableProvenanceSource(value: unknown): value is MutableProvenanceSource {
  return (
    isNonArrayRecord(value) &&
    Array.isArray(value.files) &&
    value.files.every(isMutableProvenanceFile) &&
    Array.isArray(value.supplementalSources) &&
    value.supplementalSources.every(isMutableProvenanceFile)
  );
}

function isMutableProvenanceFile(value: unknown): value is MutableProvenanceFile {
  return (
    isNonArrayRecord(value) &&
    typeof value.sourcePath === "string" &&
    typeof value.status === "string" &&
    (value.targetPath === undefined || typeof value.targetPath === "string") &&
    (value.additionalTargetPaths === undefined || isStringArray(value.additionalTargetPaths))
  );
}

function translatedFile(source: MutableProvenanceSource): MutableProvenanceFile {
  const entry = source.files.find((candidate) => candidate.status === "translated");
  if (entry === undefined) throw new Error("fixture must contain a translated provenance file");
  return entry;
}

function deferredFile(source: ProvenanceSource): ProvenanceFile {
  const entry = source.files.find((candidate) => candidate.status === "deferred-extension-body");
  if (entry === undefined) throw new Error("fixture must contain a deferred provenance file");
  return entry;
}

type MutableProvenanceFile = Record<string, unknown> & {
  additionalTargetPaths?: string[];
  sourcePath: string;
  status: string;
  targetPath?: string;
};

type MutableProvenanceSource = Record<string, unknown> & {
  files: MutableProvenanceFile[];
  supplementalSources: MutableProvenanceFile[];
};
