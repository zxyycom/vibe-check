import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { sha256File } from "../../pack.ts";
import { PACKAGE_NAME } from "../../package-contract.ts";
import {
  EXTERNAL_CONSUMER_ARTIFACT_PATH_ENV,
  EXTERNAL_CONSUMER_ARTIFACT_SHA256_ENV,
  EXTERNAL_CONSUMER_INSTALLED_PACKAGE_ENV,
  EXTERNAL_CONSUMER_RESOLVED_ENTRY_ENV,
  EXTERNAL_CONSUMER_ROOT_ENV,
  parseExternalConsumerMaterialData,
  readGateExternalConsumerMaterial,
  validateExternalConsumerMaterialPhysical
} from "./input.ts";
import { prepareExternalConsumerMaterial } from "./material.ts";

test("external consumer provider input is closed and fail-closed", () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-external-consumer-input-"));
  try {
    const artifactPath = join(root, "candidate.tgz");
    const consumerDirectory = join(root, "consumer");
    const installedPackageDirectory = join(consumerDirectory, "node_modules", PACKAGE_NAME);
    const resolvedEntryPath = join(installedPackageDirectory, "index.mjs");
    mkdirSync(installedPackageDirectory, { recursive: true });
    writeFileSync(artifactPath, "candidate artifact\n", "utf8");
    writeFileSync(resolvedEntryPath, "export {};\n", "utf8");
    const data = {
      artifactPath,
      consumerDirectory,
      installedPackageDirectory,
      resolvedEntryPath,
      schemaVersion: 1,
      sha256: sha256File(artifactPath)
    } as const;

    assert.deepEqual(parseExternalConsumerMaterialData(data), data);
    assert.deepEqual(
      readGateExternalConsumerMaterial({
        [EXTERNAL_CONSUMER_ARTIFACT_PATH_ENV]: artifactPath,
        [EXTERNAL_CONSUMER_ARTIFACT_SHA256_ENV]: data.sha256,
        [EXTERNAL_CONSUMER_INSTALLED_PACKAGE_ENV]: installedPackageDirectory,
        [EXTERNAL_CONSUMER_RESOLVED_ENTRY_ENV]: resolvedEntryPath,
        [EXTERNAL_CONSUMER_ROOT_ENV]: consumerDirectory
      }),
      data
    );
    assert.throws(
      () => parseExternalConsumerMaterialData({ ...data, unexpected: true }),
      /invalid shape/
    );
    const { sha256: _sha256, ...missingSha256 } = data;
    assert.throws(() => parseExternalConsumerMaterialData(missingSha256), /invalid shape/);
    assert.throws(
      () => parseExternalConsumerMaterialData({ ...data, resolvedEntryPath: artifactPath }),
      /invalid identity/
    );
    assert.throws(
      () =>
        prepareExternalConsumerMaterial(
          { artifactPath, sha256: data.sha256 },
          { consumerDirectory }
        ),
      /setup directory must not already exist/
    );
    assert.equal(existsSync(resolvedEntryPath), true);
    rmSync(resolvedEntryPath);
    assert.deepEqual(parseExternalConsumerMaterialData(data), data);
    assert.throws(() => validateExternalConsumerMaterialPhysical(data), /no longer matches/);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
