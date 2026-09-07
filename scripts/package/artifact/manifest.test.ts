import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { isNonArrayRecord } from "../../value-guards.ts";
import { createArtifactFingerprint } from "./fingerprint.ts";
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
    assert.doesNotThrow(() =>
      auditCandidateManifest({ candidateVersion: "0.0.1", repositoryRoot: root, source })
    );
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
      assert.throws(() =>
        auditCandidateManifest({
          candidateVersion: "0.0.1",
          repositoryRoot: root,
          source: JSON.stringify(manifest)
        })
      );
    }
    assert.throws(
      () => auditCandidateManifest({ candidateVersion: "0.0.2", repositoryRoot: root, source }),
      /identity/u
    );

    const sourceManifest = mutableManifest(readFileSync(sourcePath, "utf8"));
    sourceManifest.version = "1.0.0";
    writeFileSync(sourcePath, JSON.stringify(sourceManifest), "utf8");
    assert.throws(
      () => writeCandidateManifest({ manifestPath, repositoryRoot: root, version: "0.0.1" }),
      /sentinel/u
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("release manifest bytes invalidate the candidate fingerprint", () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "vibe-check-package-fingerprint-"));
  const root = join(temporaryRoot, "repository");
  try {
    cpSync(repositoryRoot, root, {
      dereference: false,
      recursive: true,
      filter: (path) =>
        ![".cache", ".codegraph", ".git", ".log", "build", "node_modules"].includes(
          path.split("/").at(-1) ?? ""
        )
    });
    const before = createArtifactFingerprint(root);
    const sourcePath = join(root, RELEASE_MANIFEST_SOURCE_PATH);
    writeFileSync(sourcePath, `${readFileSync(sourcePath, "utf8").trimEnd()}\n\n`, "utf8");
    assert.notEqual(createArtifactFingerprint(root), before);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test("release manifest reader does not leak the caller's repository root", () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-package-manifest-isolation-"));
  try {
    const manifestPath = join(root, "package.json");
    assert.throws(
      () => writeCandidateManifest({ manifestPath, repositoryRoot: root, version: "0.0.1" }),
      /ENOENT|release-manifest/u
    );
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
