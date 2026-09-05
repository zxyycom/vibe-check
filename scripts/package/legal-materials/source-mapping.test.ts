import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { isNonArrayRecord } from "../../value-guards.ts";
import {
  checkTranslatedSourceMapping,
  syncTranslatedSourceMapping,
  type SourceMappingDependencies,
  type SourceMappingPaths
} from "./source-mapping.ts";

const provenanceRelativePath = "licenses/lizard-1.24.0-provenance.json";
const packageContractRelativePath = "scripts/package/package-contract.ts";
const identityRelativePath =
  "src/package-checks/function-metrics/analyzer/fixtures/lizard-1.24.0/evidence/lizard-1.24-source-identity.json";
const PACKAGE_PROVENANCE_PIN_PATTERN =
  /(PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_SHA256 =\n {2})"[a-f0-9]{64}"/u;

test("source mapping sync derives only the package provenance pin after reviewing curated mappings", () => {
  const fixture = createFixture();
  try {
    makeSynchronizationStale(fixture);
    const provenanceBefore = readFileSync(fixture.paths.provenancePath, "utf8");
    const identityBefore = readJsonObject(fixture.paths.identityManifestPath);
    const packageContractBefore = readFileSync(fixture.paths.packageContractPath, "utf8");

    const synced = syncTranslatedSourceMapping(fixture.paths, fixture.dependencies);
    assert.deepEqual(
      [...synced.changedPaths].sort(),
      [fixture.paths.identityManifestPath, fixture.paths.packageContractPath].sort()
    );
    assert.deepEqual(checkTranslatedSourceMapping(fixture.paths, fixture.dependencies), {
      changedPaths: []
    });

    const identityCounts = requiredObject(
      readJsonObject(fixture.paths.identityManifestPath).counts,
      "fixture identity counts"
    );
    assert.equal(Object.hasOwn(identityCounts, "entries"), false);
    assert.equal(Object.hasOwn(identityCounts, "targets"), false);
    const expectedIdentity = structuredClone(identityBefore);
    const expectedCounts = requiredObject(expectedIdentity.counts, "expected identity counts");
    delete expectedCounts.entries;
    delete expectedCounts.targets;
    assert.deepEqual(readJsonObject(fixture.paths.identityManifestPath), expectedIdentity);
    assert.equal(readFileSync(fixture.paths.provenancePath, "utf8"), provenanceBefore);
    assert.match(
      readFileSync(fixture.paths.packageContractPath, "utf8"),
      new RegExp(
        `PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_SHA256 =\\n  "${provenanceHash(
          fixture.paths.provenancePath
        )}"`,
        "u"
      )
    );
    assert.equal(
      readFileSync(fixture.paths.packageContractPath, "utf8"),
      sourceWithProvenancePin(packageContractBefore, provenanceHash(fixture.paths.provenancePath))
    );
  } finally {
    fixture.dispose();
  }
});

test("source mapping sync leaves curated files untouched when validation rejects a mapping", () => {
  const fixture = createFixture();
  try {
    makeSynchronizationStale(fixture);
    const before = readFixtureSources(fixture.paths);

    for (const failure of [
      "source identity mapping is missing a target",
      "source identity mapping is ambiguous"
    ]) {
      assert.throws(
        () =>
          syncTranslatedSourceMapping(fixture.paths, {
            ...fixture.dependencies,
            auditSourceIdentity: () => {
              throw new Error(failure);
            }
          }),
        new RegExp(failure, "u")
      );
      assert.deepEqual(readFixtureSources(fixture.paths), before);
    }

    const stalePackageContract = readFileSync(fixture.paths.packageContractPath, "utf8");
    const matchingPin = stalePackageContract.match(PACKAGE_PROVENANCE_PIN_PATTERN);
    if (matchingPin === null)
      throw new Error("fixture package contract must contain a provenance pin");
    for (const invalidPackageContract of [
      stalePackageContract.replace(PACKAGE_PROVENANCE_PIN_PATTERN, ""),
      `${stalePackageContract}\nexport const ${matchingPin[0]};\n`
    ]) {
      writeFileSync(fixture.paths.packageContractPath, invalidPackageContract, "utf8");
      const invalidPinBefore = readFixtureSources(fixture.paths);
      assert.throws(
        () => syncTranslatedSourceMapping(fixture.paths, fixture.dependencies),
        /package contract must contain exactly one translated-analyzer provenance pin/u
      );
      assert.deepEqual(readFixtureSources(fixture.paths), invalidPinBefore);
    }

    writeFileSync(fixture.paths.provenancePath, "{", "utf8");
    const invalidBefore = readFixtureSources(fixture.paths);
    assert.throws(
      () => syncTranslatedSourceMapping(fixture.paths, fixture.dependencies),
      /translated-analyzer provenance inventory is invalid JSON/u
    );
    assert.deepEqual(readFixtureSources(fixture.paths), invalidBefore);
  } finally {
    fixture.dispose();
  }
});

test("source mapping sync restores a prior file when a later write fails", () => {
  const fixture = createFixture();
  try {
    makeSynchronizationStale(fixture);
    const before = readFixtureSources(fixture.paths);
    let failPackageContractWrite = true;

    assert.throws(
      () =>
        syncTranslatedSourceMapping(fixture.paths, {
          ...fixture.dependencies,
          writeFile: (path, source) => {
            if (path === fixture.paths.packageContractPath && failPackageContractWrite) {
              failPackageContractWrite = false;
              writeFileSync(path, "partially-written", "utf8");
              throw new Error("simulated partial package contract write failure");
            }
            writeFileSync(path, source, "utf8");
          }
        }),
      /source mapping sync write failed: simulated partial package contract write failure; restored:/u
    );
    assert.deepEqual(readFixtureSources(fixture.paths), before);
  } finally {
    fixture.dispose();
  }
});

function createFixture(): Readonly<{
  readonly dependencies: SourceMappingDependencies;
  readonly dispose: () => void;
  readonly paths: SourceMappingPaths;
}> {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-source-mapping-"));
  const paths: SourceMappingPaths = Object.freeze({
    identityManifestPath: join(root, "identity.json"),
    packageContractPath: join(root, "package-contract.ts"),
    provenancePath: join(root, "provenance.json")
  });
  cpSync(new URL(`../../../${provenanceRelativePath}`, import.meta.url), paths.provenancePath);
  cpSync(
    new URL(`../../../${packageContractRelativePath}`, import.meta.url),
    paths.packageContractPath
  );
  cpSync(new URL(`../../../${identityRelativePath}`, import.meta.url), paths.identityManifestPath);
  return Object.freeze({
    dependencies: Object.freeze({
      auditSourceIdentity: (auditPaths: SourceMappingPaths) => assert.equal(auditPaths, paths),
      writeFile: (path: string, source: string) => writeFileSync(path, source, "utf8")
    }),
    dispose: () => rmSync(root, { force: true, recursive: true }),
    paths
  });
}

function makeSynchronizationStale(fixture: Readonly<{ readonly paths: SourceMappingPaths }>): void {
  const identity = readJsonObject(fixture.paths.identityManifestPath);
  const counts = requiredObject(identity.counts, "fixture identity counts");
  counts.entries = 46;
  counts.targets = 44;
  writeFileSync(fixture.paths.identityManifestPath, `${JSON.stringify(identity)}\n`, "utf8");

  const packageContractSource = readFileSync(fixture.paths.packageContractPath, "utf8");
  writeFileSync(
    fixture.paths.packageContractPath,
    packageContractSource.replace(PACKAGE_PROVENANCE_PIN_PATTERN, `$1"${"0".repeat(64)}"`),
    "utf8"
  );
}

function provenanceHash(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sourceWithProvenancePin(source: string, pin: string): string {
  return source.replace(PACKAGE_PROVENANCE_PIN_PATTERN, `$1"${pin}"`);
}

function readFixtureSources(paths: SourceMappingPaths): readonly string[] {
  return [paths.identityManifestPath, paths.packageContractPath, paths.provenancePath].map((path) =>
    readFileSync(path, "utf8")
  );
}

function readJsonObject(path: string): Record<string, unknown> {
  return requiredObject(JSON.parse(readFileSync(path, "utf8")), `fixture JSON ${path}`);
}

function requiredObject(value: unknown, description: string): Record<string, unknown> {
  if (!isNonArrayRecord(value)) throw new TypeError(`${description} must be an object`);
  return value;
}
