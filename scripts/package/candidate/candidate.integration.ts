import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";

import { assertInstalledCandidateMaterials } from "./installed-materials.ts";
import { assessPackageCandidatePreparation, preparePackageCandidate } from "./prepare.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
await describe(
  "package candidate preparation",
  { concurrency: false, timeout: 20_000 },
  async () => {
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

    await it("builds, installs, and reuses a physical candidate", { timeout: 20_000 }, async () => {
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

    await it("keeps staging audit in build acceptance after packed artifact reuse", async () => {
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

    await it("rejects installed documentation drift without another installation", async () => {
      const { first } = await fixture();
      assert.throws(
        () =>
          assertInstalledCandidateMaterials({
            expectedJSDocExamplePayloads: [],
            expectedDocuments: [],
            expectedMachineMaterials: [],
            expectedReadme: "incorrect candidate README\n",
            packageDirectory: first.installedPackageDirectory
          }),
        /installed candidate README differs from the expected package documentation/
      );
    });

    await it("reinstalls a missing dependency instead of accepting ancestor fallback", async () => {
      const { buildDirectory, consumerDirectory, first, fixtureRoot, stateDirectory } =
        await fixture();
      rmSync(join(consumerDirectory, "node_modules", "jscpd"), { force: true, recursive: true });
      const ancestorResolvedJscpd = resolveJscpdFromFreshBunProcess(first.resolvedEntryPath);
      assert.equal(
        ancestorResolvedJscpd.startsWith(join(fixtureRoot, "node_modules")),
        true,
        ancestorResolvedJscpd
      );
      const reinstalled = await preparePackageCandidate({
        buildDirectory,
        consumerDirectory,
        repositoryRoot,
        stateDirectory
      });
      assert.equal(reinstalled.preparationAction, "reinstall");
      assert.equal(reinstalled.preparationReason, "installation-invalid");
      assert.equal(
        createRequire(reinstalled.resolvedEntryPath)
          .resolve("jscpd/package.json")
          .startsWith(join(consumerDirectory, "node_modules")),
        true
      );
    });

    await it("classifies a malformed preparation receipt for cold rebuild", async () => {
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
  }
);

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
      version: "5.1.1"
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
