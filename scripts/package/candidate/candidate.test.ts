import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";

import { installCandidate } from "./install.ts";
import {
  assessPackageCandidatePreparation,
  preparePackageCandidate,
  type LocalCandidatePreparationAction
} from "./prepare.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const candidateModuleUrl = new URL("./prepare.ts", import.meta.url).href;

describe("package candidate preparation", { concurrency: false, timeout: 20_000 }, () => {
  let fixturePromise:
    | Promise<
        Readonly<{
          consumerDirectory: string;
          first: Awaited<ReturnType<typeof preparePackageCandidate>>;
          buildDirectory: string;
          fixtureRoot: string;
          stateDirectory: string;
        }>
      >
    | undefined;
  let candidateFixtureRoot: string | undefined;

  const fixture = () => {
    if (fixturePromise === undefined) {
      candidateFixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-package-candidate-"));
      fixturePromise = (async () => {
        if (candidateFixtureRoot === undefined)
          throw new Error("candidate fixture root must exist");
        const fixtureRoot = candidateFixtureRoot;
        const buildDirectory = join(fixtureRoot, "build");
        const consumerDirectory = join(fixtureRoot, "consumer");
        const stateDirectory = join(fixtureRoot, "state");
        writeAncestorJscpdFallback(fixtureRoot);
        writeConsumerManifest(consumerDirectory);
        const first = await preparePackageCandidate({
          buildDirectory,
          consumerDirectory,
          repositoryRoot,
          stateDirectory
        });
        return Object.freeze({
          buildDirectory,
          consumerDirectory,
          first,
          fixtureRoot,
          stateDirectory
        });
      })();
    }
    return fixturePromise;
  };

  after(() => {
    if (candidateFixtureRoot !== undefined)
      rmSync(candidateFixtureRoot, { force: true, recursive: true });
  });

  it("rejects overlapping package build and cache roots", () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-candidate-overlap-"));
    try {
      assert.throws(
        () =>
          assessPackageCandidatePreparation({
            buildDirectory: root,
            consumerDirectory: join(root, "consumer"),
            repositoryRoot,
            stateDirectory: root
          }),
        /buildDirectory and stateDirectory must not overlap/
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("rejects invalid private consumer manifests", () => {
    const diagnosticsRoot = mkdtempSync(join(tmpdir(), "vibe-check-candidate-diagnostics-"));
    try {
      assertPrivateConsumerManifestDiagnostics(diagnosticsRoot);
    } finally {
      rmSync(diagnosticsRoot, { force: true, recursive: true });
    }
  });

  it("builds, installs, and reuses a physical candidate", { timeout: 20_000 }, async () => {
    const { buildDirectory, consumerDirectory, first, stateDirectory } = await fixture();
    assert.equal(first.reused, false);
    assert.equal(first.preparationAction, "rebuild");
    assert.equal(first.preparationReason, "receipt-missing");
    assert.equal(existsSync(first.artifactPath), true);
    assert.equal(first.stagingDirectory, join(buildDirectory, "package"));
    assert.equal(first.artifactPath.startsWith(join(buildDirectory, "artifacts")), true);
    assert.equal(existsSync(join(stateDirectory, "package")), false);
    assert.equal(existsSync(join(stateDirectory, "artifacts")), false);
    assert.equal(lstatSync(first.installedPackageDirectory).isSymbolicLink(), false);
    assert.equal(existsSync(first.resolvedEntryPath), true);
    assert.equal(first.resolvedEntryPath.startsWith(first.installedPackageDirectory), true);
    assert.equal(
      createRequire(first.resolvedEntryPath)
        .resolve("jscpd/package.json")
        .startsWith(join(consumerDirectory, "node_modules")),
      true
    );
    const reused = await preparePackageCandidate({
      buildDirectory,
      consumerDirectory,
      repositoryRoot,
      stateDirectory
    });
    assert.equal(reused.reused, true);
    assert.equal(reused.preparationAction, "reuse");
    assert.equal(reused.preparationReason, "installation-current");
    assert.equal(reused.inputFingerprint, first.inputFingerprint);
    assert.equal(reused.sha256, first.sha256);
  });

  it("keeps staging audit in build acceptance after packed artifact reuse", async () => {
    const { buildDirectory, consumerDirectory, first, stateDirectory } = await fixture();
    writeFileSync(join(first.stagingDirectory, "README.md"), "drifted build evidence\n", "utf8");
    assert.deepEqual(
      assessPackageCandidatePreparation({
        buildDirectory,
        consumerDirectory,
        repositoryRoot,
        stateDirectory
      }),
      { action: "reuse", reason: "installation-current" }
    );
  });

  it("rejects installed documentation drift", { timeout: 20_000 }, async () => {
    const { consumerDirectory, first } = await fixture();
    assert.throws(
      () =>
        installCandidate({
          artifactPath: first.artifactPath,
          candidateVersion: first.candidateVersion,
          consumerDirectory,
          expectedJSDocExamplePayloads: [],
          expectedReadme: "incorrect candidate README\n"
        }),
      /installed candidate README differs from the expected package documentation/
    );
  });

  it("reinstalls missing dependency without ancestor fallback", { timeout: 20_000 }, async () => {
    const { buildDirectory, consumerDirectory, first, fixtureRoot, stateDirectory } =
      await fixture();
    rmSync(join(consumerDirectory, "node_modules", "jscpd"), { force: true, recursive: true });
    const ancestorResolvedJscpd = resolveJscpdFromFreshBunProcess(first.resolvedEntryPath);
    assert.equal(
      ancestorResolvedJscpd.startsWith(join(fixtureRoot, "node_modules")),
      true,
      ancestorResolvedJscpd
    );
    const reinstalled = prepareInFreshBunProcess({
      buildDirectory,
      consumerDirectory,
      repositoryRoot,
      stateDirectory
    });
    assert.equal(reinstalled, "reinstall");
    assert.equal(
      createRequire(first.resolvedEntryPath)
        .resolve("jscpd/package.json")
        .startsWith(join(consumerDirectory, "node_modules")),
      true
    );
  });

  it("classifies a malformed preparation receipt for cold rebuild", async () => {
    const { buildDirectory, consumerDirectory, stateDirectory } = await fixture();
    writeFileSync(join(stateDirectory, "preparation-receipt.json"), "not JSON\n", "utf8");
    assert.deepEqual(
      assessPackageCandidatePreparation({
        buildDirectory,
        consumerDirectory,
        repositoryRoot,
        stateDirectory
      }),
      { action: "rebuild", reason: "receipt-invalid" }
    );
  });
});

function assertPrivateConsumerManifestDiagnostics(temporaryRoot: string): void {
  const artifactPath = join(temporaryRoot, "unreachable-artifact.tgz");
  const consumerDirectory = join(temporaryRoot, "manifest-diagnostics-consumer");
  const input = {
    artifactPath,
    candidateVersion: "0.0.0-local.manifest-diagnostics",
    consumerDirectory,
    expectedJSDocExamplePayloads: [],
    expectedReadme: ""
  };

  assert.throws(
    () => installCandidate(input),
    /private candidate consumer package manifest is missing/
  );
  mkdirSync(consumerDirectory, { recursive: true });
  writeFileSync(join(consumerDirectory, "package.json"), "{not JSON\n", "utf8");
  assert.throws(
    () => installCandidate(input),
    /could not parse private candidate consumer package manifest/
  );
  writeFileSync(join(consumerDirectory, "package.json"), '{"private":false}\n', "utf8");
  assert.throws(() => installCandidate(input), /candidate consumer must set private: true/);
}

function writeConsumerManifest(consumerDirectory: string): void {
  mkdirSync(consumerDirectory, { recursive: true });
  writeFileSync(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify({ name: "vibe-check-candidate-test-consumer", private: true, type: "module" })}\n`,
    "utf8"
  );
}

function writeAncestorJscpdFallback(temporaryRoot: string): void {
  const packageDirectory = join(temporaryRoot, "node_modules", "jscpd");
  mkdirSync(packageDirectory, { recursive: true });
  writeFileSync(
    join(packageDirectory, "package.json"),
    `${JSON.stringify({
      bin: { jscpd: "./run-jscpd.js" },
      name: "jscpd",
      version: "5.0.11"
    })}\n`,
    "utf8"
  );
  writeFileSync(join(packageDirectory, "run-jscpd.js"), "", "utf8");
}

function resolveJscpdFromFreshBunProcess(candidateEntryPath: string): string {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "import { createRequire } from 'node:module'; process.stdout.write(createRequire(process.argv[1]).resolve('jscpd/package.json'))",
      candidateEntryPath
    ],
    { encoding: "utf8" }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function prepareInFreshBunProcess(input: {
  readonly buildDirectory: string;
  readonly consumerDirectory: string;
  readonly repositoryRoot: string;
  readonly stateDirectory: string;
}): LocalCandidatePreparationAction {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "const { preparePackageCandidate } = await import(process.argv[1]); const candidate = await preparePackageCandidate({ repositoryRoot: process.argv[2], consumerDirectory: process.argv[3], stateDirectory: process.argv[4], buildDirectory: process.argv[5] }); process.stdout.write(candidate.preparationAction);",
      candidateModuleUrl,
      input.repositoryRoot,
      input.consumerDirectory,
      input.stateDirectory,
      input.buildDirectory
    ],
    { encoding: "utf8" }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  const action = result.stdout.trim();
  if (action !== "rebuild" && action !== "reinstall" && action !== "reuse") {
    throw new TypeError(`fresh candidate preparation returned an invalid action: ${action}`);
  }
  return action;
}
