import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { isNonArrayRecord } from "../../value-guards.ts";
import { createArtifactFingerprint } from "./fingerprint.ts";
import { copyArtifactFingerprintFixture } from "./fingerprint.test-support.ts";
import {
  auditCandidateManifest,
  RELEASE_MANIFEST_SOURCE_PATH,
  writeCandidateManifest
} from "./manifest.ts";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("checked-in release manifest projects only version and rejects static-source or safety drift", () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-package-manifest-"));
  try {
    const sourcePath = join(root, RELEASE_MANIFEST_SOURCE_PATH);
    cpSync(join(repositoryRoot, RELEASE_MANIFEST_SOURCE_PATH), sourcePath, { force: true });
    const manifestPath = join(root, "package.json");
    writeCandidateManifest({ manifestPath, repositoryRoot: root, version: "0.0.1" });
    const source = readFileSync(manifestPath, "utf8");
    assert.doesNotThrow(() => {
      auditCandidateManifest({ candidateVersion: "0.0.1", repositoryRoot: root, source });
    });
    const projected = mutableManifest(source);
    assert.equal(projected.version, "0.0.1");

    for (const mutation of [
      (manifest: MutableManifest) => {
        manifest.license = "UNLICENSED";
      },
      (manifest: MutableManifest) => {
        manifest.private = false;
      },
      (manifest: MutableManifest) => {
        manifest.bin = { "vibe-check": "cli.mjs" };
      },
      (manifest: MutableManifest) => {
        manifest.scripts = { prepublishOnly: "bun build.ts" };
      },
      (manifest: MutableManifest) => {
        manifest.dependencies = { "../private": "1.0.0" };
      },
      (manifest: MutableManifest) => {
        manifest.exports = { ".": { import: "./internal.mjs", types: "./types/index.d.ts" } };
      }
    ]) {
      const manifest = mutableManifest(source);
      mutation(manifest);
      assert.throws(() => {
        auditCandidateManifest({
          candidateVersion: "0.0.1",
          repositoryRoot: root,
          source: JSON.stringify(manifest)
        });
      });
    }
    assert.throws(() => {
      auditCandidateManifest({ candidateVersion: "0.0.2", repositoryRoot: root, source });
    }, /identity/u);

    const sourceManifest = mutableManifest(readFileSync(sourcePath, "utf8"));
    sourceManifest.version = "1.0.0";
    writeFileSync(sourcePath, JSON.stringify(sourceManifest), "utf8");
    assert.throws(() => {
      writeCandidateManifest({ manifestPath, repositoryRoot: root, version: "0.0.1" });
    }, /sentinel/u);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("release manifest bytes invalidate the candidate fingerprint", () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "vibe-check-package-fingerprint-"));
  const root = join(temporaryRoot, "repository");
  try {
    copyArtifactFingerprintFixture({ repositoryRoot, fixtureRoot: root });
    const before = createArtifactFingerprint(root);
    assert.equal(before, createArtifactFingerprint(repositoryRoot));
    const sourcePath = join(root, RELEASE_MANIFEST_SOURCE_PATH);
    writeFileSync(sourcePath, `${readFileSync(sourcePath, "utf8").trimEnd()}\n\n`, "utf8");
    const manifestChanged = createArtifactFingerprint(root);
    assert.notEqual(manifestChanged, before);
    const workspacePath = join(root, "pnpm-workspace.yaml");
    writeFileSync(workspacePath, `${readFileSync(workspacePath, "utf8")}\n`, "utf8");
    const configurationChanged = createArtifactFingerprint(root);
    assert.notEqual(configurationChanged, manifestChanged);
    const patchPath = join(root, "patches/execa@10.2.0.patch");
    writeFileSync(patchPath, `${readFileSync(patchPath, "utf8")}\n`, "utf8");
    assert.notEqual(createArtifactFingerprint(root), configurationChanged);

    // A subsequent copy must rediscover new inputs, even under a normally ignored basename.
    const addedInput = "src/fingerprint-fixture/.cache/added.ts";
    mkdirSync(dirname(join(root, addedInput)), { recursive: true });
    writeFileSync(join(root, addedInput), "export const added = true;\n");
    for (const directory of [".venv", "changes"]) {
      mkdirSync(join(root, directory), { recursive: true });
      writeFileSync(join(root, directory, "not-an-input.txt"), "not fingerprint input\n");
    }
    const independent = join(temporaryRoot, "independent");
    copyArtifactFingerprintFixture({ repositoryRoot: root, fixtureRoot: independent });
    assert.equal(createArtifactFingerprint(independent), createArtifactFingerprint(root));
    assert.equal(
      readFileSync(join(independent, addedInput), "utf8"),
      "export const added = true;\n"
    );
    assert.equal(existsSync(join(independent, ".venv")), false);
    assert.equal(existsSync(join(independent, "changes")), false);
    writeFileSync(join(independent, addedInput), "changed only in the independent fixture\n");
    assert.equal(readFileSync(join(root, addedInput), "utf8"), "export const added = true;\n");
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test("release manifest reader does not leak the caller's repository root", () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-package-manifest-isolation-"));
  try {
    const manifestPath = join(root, "package.json");
    assert.throws(() => {
      writeCandidateManifest({ manifestPath, repositoryRoot: root, version: "0.0.1" });
    }, /ENOENT|release-manifest/u);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

type MutableManifest = Record<string, unknown>;
function mutableManifest(source: string): MutableManifest {
  const value: unknown = JSON.parse(source);
  if (!isNonArrayRecord(value)) throw new TypeError("fixture manifest must be an object");
  return value;
}
