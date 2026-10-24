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
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { isNonArrayRecord } from "../../value-guards.ts";
import { collectArtifactFingerprintInputFiles, createArtifactFingerprint } from "./fingerprint.ts";
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
    assert.equal(projected.name, "@zxyycom/vibe-check");
    assert.equal(typeof projected.description, "string");
    assert.equal(Array.isArray(projected.keywords), true);
    assert.equal(projected.license, "MIT AND Apache-2.0 AND BSD-2-Clause");
    assert.equal(
      Array.isArray(projected.files) &&
        projected.files.filter((path) => path === "licenses").length,
      1
    );
    assert.deepEqual(projected.engines, { node: ">=24.18" });
    assert.deepEqual(projected.repository, {
      type: "git",
      url: "git+https://github.com/zxyycom/vibe-check.git"
    });
    assert.deepEqual(projected.publishConfig, {
      access: "public",
      registry: "https://registry.npmjs.org/"
    });
    assert.equal(Object.hasOwn(projected, "private"), false);
    assert.equal(Object.hasOwn(projected, "bin"), false);
    assert.equal(Object.hasOwn(projected, "scripts"), false);
    assert.ok(isNonArrayRecord(projected.exports));
    assert.deepEqual(Object.keys(projected.exports), ["."]);
    assert.deepEqual(projected.dependencies, {
      "@secretlint/core": "13.0.5",
      "@secretlint/secretlint-rule-privatekey": "13.0.5",
      ajv: "8.20.0",
      "csv-parse": "7.0.3",
      execa: "10.2.0",
      "fast-glob": "3.3.3",
      "github-slugger": "2.0.0",
      immutable: "5.1.9",
      jscpd: "^5.4.2",
      markdownlint: "0.42.0",
      "mdast-util-from-markdown": "2.0.3",
      "mdast-util-frontmatter": "2.0.1",
      "mdast-util-gfm": "3.1.0",
      "micromark-extension-frontmatter": "2.0.0",
      "micromark-extension-gfm": "3.0.0",
      micromatch: "4.0.8",
      mnemonist: "0.40.4",
      neverthrow: "8.2.0",
      typebox: "1.3.9"
    });

    const approvedStaticSource = readFileSync(sourcePath, "utf8");
    for (const { mutation, reason } of [
      {
        mutation: (manifest: MutableManifest) => {
          manifest.license = "UNLICENSED";
        },
        reason: /identity/u
      },
      {
        mutation: (manifest: MutableManifest) => {
          manifest.private = false;
        },
        reason: /manifest fields/u
      },
      {
        mutation: (manifest: MutableManifest) => {
          manifest.bin = { "vibe-check": "cli.mjs" };
        },
        reason: /manifest fields/u
      },
      {
        mutation: (manifest: MutableManifest) => {
          manifest.scripts = { prepublishOnly: "bun build.ts" };
        },
        reason: /manifest fields/u
      },
      {
        mutation: (manifest: MutableManifest) => {
          manifest.dependencies = { "../private": "1.0.0" };
        },
        reason: /production dependencies/u
      },
      {
        mutation: (manifest: MutableManifest) => {
          manifest.exports = { ".": { import: "./internal.mjs", types: "./types/index.d.ts" } };
        },
        reason: /approved import and declarations entries/u
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
      }, reason);
      // A matching unsafe source/projection must still fail independently of equality.
      const staticManifest = mutableManifest(approvedStaticSource);
      mutation(staticManifest);
      writeFileSync(sourcePath, JSON.stringify(staticManifest), "utf8");
      assert.throws(() => {
        writeCandidateManifest({ manifestPath, repositoryRoot: root, version: "0.0.1" });
      }, reason);
      assert.throws(() => {
        auditCandidateManifest({
          candidateVersion: "0.0.1",
          repositoryRoot: root,
          source: JSON.stringify(manifest)
        });
      }, reason);
      writeFileSync(sourcePath, approvedStaticSource, "utf8");
    }
    assert.throws(() => {
      auditCandidateManifest({
        candidateVersion: "0.0.1",
        repositoryRoot: root,
        source: JSON.stringify({ ...projected, description: "valid but unapproved projection" })
      });
    }, /exact release-manifest version projection/u);
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
    const inputPaths = writeFingerprintRepository(root);
    assert.deepEqual(
      collectArtifactFingerprintInputFiles(root).map((path) => relative(root, path)),
      [...inputPaths].sort()
    );
    const fingerprint = (directory: string) =>
      createArtifactFingerprint(directory, () => "fixture-toolchain-v1");
    const before = fingerprint(root);
    assert.notEqual(
      createArtifactFingerprint(root, () => "fixture-toolchain-v2"),
      before
    );
    const workerPath = join(root, "src/package-checks/markdown-link-validation/io-worker.ts");
    const workerSource = readFileSync(workerPath, "utf8");
    writeFileSync(workerPath, `${workerSource}\n// fingerprint boundary\n`);
    assert.notEqual(fingerprint(root), before);
    writeFileSync(workerPath, workerSource);
    assert.equal(fingerprint(root), before);
    const sourcePath = join(root, RELEASE_MANIFEST_SOURCE_PATH);
    writeFileSync(sourcePath, `${readFileSync(sourcePath, "utf8").trimEnd()}\n\n`, "utf8");
    const manifestChanged = fingerprint(root);
    assert.notEqual(manifestChanged, before);
    const workspacePath = join(root, "pnpm-workspace.yaml");
    writeFileSync(workspacePath, `${readFileSync(workspacePath, "utf8")}\n`, "utf8");
    const configurationChanged = fingerprint(root);
    assert.notEqual(configurationChanged, manifestChanged);
    const patchPath = join(root, "patches/execa@10.2.0.patch");
    writeFileSync(patchPath, `${readFileSync(patchPath, "utf8")}\n`, "utf8");
    assert.notEqual(fingerprint(root), configurationChanged);

    // Every independently enumerated input class must contribute its bytes to the real hash.
    for (const path of new Set(inputPaths)) {
      const absolutePath = join(root, path);
      const original = readFileSync(absolutePath);
      const unchanged = fingerprint(root);
      writeFileSync(absolutePath, Buffer.concat([original, Buffer.from("\n")]));
      assert.notEqual(fingerprint(root), unchanged, `fingerprint must bind ${path}`);
      writeFileSync(absolutePath, original);
    }

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
    assert.equal(fingerprint(independent), fingerprint(root));
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

/** Minimal repository inputs, independent of the collector under test. */
function writeFingerprintRepository(root: string): readonly string[] {
  const paths = [
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "patches/execa@10.2.0.patch",
    "scripts/repository-files/paths.ts",
    "src/index.ts",
    "src/package-checks/markdown-link-validation/io-worker.ts",
    "scripts/docs/package-documents.ts",
    "scripts/docs/package-api/example-projections.ts",
    "scripts/docs/package-api/gate-guide-example-projections.ts",
    "scripts/docs/package-api/markdown-example-fences.ts",
    "scripts/docs/package-api/render.ts",
    "scripts/docs/package-api/check-guides.ts",
    "scripts/docs/package-markdown.ts",
    "scripts/docs/machine-artifacts/package-materials.ts",
    "docs/examples/package-api-support/gate-example-acceptance.ts",
    "docs/examples/package-api/example.ts",
    "docs/package-documents.json",
    "README.md",
    "docs/checks/fixture.md",
    "docs/schema.json",
    "scripts/package/candidate/install.ts",
    RELEASE_MANIFEST_SOURCE_PATH,
    "LICENSE",
    "licenses/analyzer-translations-NOTICE.md",
    "licenses/lizard-1.24.1-provenance.json",
    "licenses/Lizard-1.24.1-MIT.txt",
    "licenses/Lizard-1.24.1-lizard.py-Apache-2.0.txt",
    "licenses/Pygments-2.18.0-BSD-2-Clause.txt"
  ];
  for (const path of paths) {
    const absolutePath = join(root, path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, `fixture ${path}\n`);
  }
  writeFileSync(
    join(root, "docs/package-documents.json"),
    JSON.stringify({
      markdownDocuments: [{ id: "readme", sourcePath: "README.md", packagePath: "README.md" }],
      checkGuides: [
        {
          checkId: "fixture",
          exportName: "fixtureCheck",
          sourcePath: "docs/checks/fixture.md",
          packagePath: "docs/checks/fixture.md"
        }
      ],
      machineMaterials: [{ sourcePath: "docs/schema.json", packagePath: "docs/schema.json" }]
    })
  );
  return paths;
}

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
