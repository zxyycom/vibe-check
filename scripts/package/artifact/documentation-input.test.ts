import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

import { sha256File } from "../pack.ts";
import {
  CANDIDATE_ARTIFACT_PATH_ENV,
  CANDIDATE_ARTIFACT_SHA256_ENV
} from "../candidate/acceptance-input.ts";
import {
  CANDIDATE_STAGING_DIRECTORY_ENV,
  CANDIDATE_VERSION_ENV,
  prepareArtifactAcceptanceInput
} from "./acceptance-input.ts";
import { externalConsumerDocumentation } from "../candidate/external-consumer/documentation.ts";
import {
  EXTERNAL_CONSUMER_ARTIFACT_PATH_ENV,
  EXTERNAL_CONSUMER_ARTIFACT_SHA256_ENV,
  EXTERNAL_CONSUMER_ROOT_ENV,
  EXTERNAL_CONSUMER_INSTALLED_PACKAGE_ENV,
  EXTERNAL_CONSUMER_RESOLVED_ENTRY_ENV
} from "../candidate/external-consumer/input.ts";
import {
  packageDocumentationEnvironment,
  readPackageDocumentationInput,
  writePackageDocumentationInput
} from "./documentation-input.ts";

test("Gate acceptance rejects entirely missing documentation input instead of rebuilding expectations", async () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-documentation-wiring-"));
  try {
    const artifactPath = join(root, "artifacts", "candidate.tgz");
    const stagingDirectory = join(root, "package");
    const consumerDirectory = join(root, "consumer");
    const installedPackageDirectory = join(consumerDirectory, "node_modules", "candidate");
    const resolvedEntryPath = join(installedPackageDirectory, "index.mjs");
    mkdirSync(dirname(artifactPath));
    mkdirSync(stagingDirectory);
    mkdirSync(installedPackageDirectory, { recursive: true });
    writeFileSync(artifactPath, "not a real tarball; must fail before any package audit");
    writeFileSync(join(stagingDirectory, "index.mjs"), "export {};\n");
    writeFileSync(resolvedEntryPath, "export {};\n");
    const sha256 = sha256File(artifactPath);
    const calls: string[] = [];
    const renderDocumentation = () => {
      calls.push("render");
      throw new Error("missing Gate input must not render source documentation");
    };
    await assert.rejects(
      prepareArtifactAcceptanceInput({
        repositoryRoot: root,
        environment: {
          [CANDIDATE_ARTIFACT_PATH_ENV]: artifactPath,
          [CANDIDATE_ARTIFACT_SHA256_ENV]: sha256,
          [CANDIDATE_STAGING_DIRECTORY_ENV]: stagingDirectory,
          [CANDIDATE_VERSION_ENV]: "0.0.0"
        },
        renderDocumentation,
        audit: () => {
          calls.push("audit");
        },
        buildDirect: async () => {
          calls.push("build");
          throw new Error("Gate input must not construct a direct artifact");
        }
      }),
      /Gate artifact acceptance requires its source documentation input/u
    );
    assert.deepEqual(calls, []);
    const material = {
      artifactPath,
      sha256,
      consumerDirectory,
      installedPackageDirectory,
      resolvedEntryPath
    };
    assert.throws(
      () =>
        externalConsumerDocumentation({
          material,
          repositoryRoot: root,
          environment: {
            [EXTERNAL_CONSUMER_ARTIFACT_PATH_ENV]: artifactPath,
            [EXTERNAL_CONSUMER_ARTIFACT_SHA256_ENV]: sha256,
            [EXTERNAL_CONSUMER_ROOT_ENV]: consumerDirectory,
            [EXTERNAL_CONSUMER_INSTALLED_PACKAGE_ENV]: installedPackageDirectory,
            [EXTERNAL_CONSUMER_RESOLVED_ENTRY_ENV]: resolvedEntryPath
          },
          renderDocumentation
        }),
      /Gate documentation acceptance requires its source documentation input/u
    );
    assert.deepEqual(calls, []);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("invocation documentation preserves independent source expectations and binds candidate identity", () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-documentation-input-"));
  try {
    const artifact = {
      artifactPath: join(root, "candidate.tgz"),
      sha256: "a".repeat(64),
      inputFingerprint: "b".repeat(64)
    };
    const documentation = {
      documents: [{ packagePath: "docs/guide.md", content: "# Source guide\n" }],
      expectedJSDocExamplePayloads: ["const sourceExample = true;"],
      machineMaterials: [
        {
          packagePath: "docs/schema.json",
          sourcePath: "source/schema.json",
          content: Buffer.from([0, 255, 10])
        }
      ],
      readme: "# Source README\n"
    };
    const snapshot = writePackageDocumentationInput({
      artifact,
      documentation,
      path: join(root, "documentation.json"),
      repositoryRoot: root
    });
    const environment = packageDocumentationEnvironment(snapshot);
    assert.deepEqual(
      readPackageDocumentationInput({ artifact, environment, repositoryRoot: root }),
      documentation
    );
    for (const unrelated of [
      { ...artifact, artifactPath: join(root, "other.tgz") },
      { ...artifact, sha256: "c".repeat(64) }
    ]) {
      assert.throws(
        () =>
          readPackageDocumentationInput({ artifact: unrelated, environment, repositoryRoot: root }),
        /candidate identity/u
      );
    }
    assert.throws(
      () =>
        readPackageDocumentationInput({
          artifact,
          environment,
          repositoryRoot: join(root, "other")
        }),
      /candidate identity/u
    );
    assert.throws(
      () =>
        readPackageDocumentationInput({
          artifact,
          environment: packageDocumentationEnvironment({
            ...snapshot,
            inputFingerprint: "c".repeat(64)
          }),
          repositoryRoot: root
        }),
      /candidate identity/u
    );
    assert.equal(
      Object.values(environment).some((value) => value.includes(documentation.readme)),
      false
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("invocation documentation distinguishes direct absence from invalid supplied input", () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-documentation-input-"));
  try {
    const artifact = {
      artifactPath: join(root, "candidate.tgz"),
      sha256: "a".repeat(64),
      inputFingerprint: "b".repeat(64)
    };
    const documentation = {
      documents: [],
      expectedJSDocExamplePayloads: [],
      machineMaterials: [],
      readme: "source\n"
    };
    const snapshot = writePackageDocumentationInput({
      artifact,
      documentation,
      path: join(root, "documentation.json"),
      repositoryRoot: root
    });
    const environment = packageDocumentationEnvironment(snapshot);
    assert.equal(
      readPackageDocumentationInput({ artifact, environment: {}, repositoryRoot: root }),
      undefined
    );
    for (const key of Object.keys(environment)) {
      const incomplete = { ...environment };
      delete incomplete[key];
      assert.throws(
        () =>
          readPackageDocumentationInput({
            artifact,
            environment: incomplete,
            repositoryRoot: root
          }),
        /incomplete or invalid/u
      );
    }
    const original: unknown = JSON.parse(readFileSync(snapshot.path, "utf8"));
    writeFileSync(snapshot.path, "corrupt");
    assert.throws(
      () => readPackageDocumentationInput({ artifact, environment, repositoryRoot: root }),
      /incomplete or invalid/u
    );
    assert.ok(typeof original === "object" && original !== null);
    for (const change of [
      { documents: [{ packagePath: "../outside.md", content: "text" }] },
      { documents: [{ packagePath: "docs/guide.md", content: 1 }] },
      {
        machineMaterials: [
          {
            packagePath: "docs/schema.json",
            sourcePath: "source/schema.json",
            content: "not base64"
          }
        ]
      },
      { expectedJSDocExamplePayloads: [1] }
    ]) {
      writeFileSync(snapshot.path, JSON.stringify({ ...original, ...change }));
      const malformedEnvironment = packageDocumentationEnvironment({
        ...snapshot,
        sha256: sha256File(snapshot.path)
      });
      assert.throws(
        () =>
          readPackageDocumentationInput({
            artifact,
            environment: malformedEnvironment,
            repositoryRoot: root
          }),
        /invalid/u
      );
    }
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
