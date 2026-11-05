import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { PACKAGE_CANDIDATE_INTEGRATION_INVOCATION } from "./integration-command.ts";
import { candidateInstallationProbeCommand, installCandidate } from "./install.ts";
import { packageCandidatePaths } from "../build-contract.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("package candidate preparation contracts", () => {
  it("rejects overlapping package build and cache roots", () => {
    const root = join(repositoryRoot, "candidate-path-fixture");
    for (const [buildDirectory, stateDirectory] of [
      [root, root],
      [root, join(root, "cache")],
      [join(root, "build"), root]
    ] as const) {
      assert.throws(
        () => packageCandidatePaths(repositoryRoot, { buildDirectory, stateDirectory }),
        /buildDirectory and stateDirectory must not overlap/
      );
    }
    const paths = packageCandidatePaths(repositoryRoot, {
      buildDirectory: join(root, "build"),
      stateDirectory: join(root, "build-cache")
    });
    assert.equal(paths.buildDirectory, join(root, "build"));
    assert.equal(paths.stateDirectory, join(root, "build-cache"));
  });

  it("rejects invalid private consumer manifests", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "vibe-check-candidate-diagnostics-"));
    try {
      const input = {
        artifactPath: join(temporaryRoot, "unreachable-artifact.tgz"),
        candidateVersion: "0.0.0-local.manifest-diagnostics",
        repositoryRoot,
        consumerDirectory: join(temporaryRoot, "consumer"),
        expectedAttributionNotice: Buffer.from("fixture notice\n", "utf8"),
        expectedJSDocExamplePayloads: [],
        expectedReadme: ""
      };

      assert.throws(
        () => installCandidate(input),
        /private candidate consumer package manifest is missing/
      );
      mkdirSync(input.consumerDirectory, { recursive: true });
      writeFileSync(join(input.consumerDirectory, "package.json"), "{not JSON\n", "utf8");
      assert.throws(
        () => installCandidate(input),
        /could not parse private candidate consumer package manifest/
      );
      writeFileSync(join(input.consumerDirectory, "package.json"), '{"private":false}\n', "utf8");
      assert.throws(() => installCandidate(input), /candidate consumer must set private: true/);
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  });

  it("resolves an exports-encapsulated markdownlint from the candidate on Node and Bun", () => {
    assert.ok(typeof process.versions.bun === "string", "this matrix requires the Bun test runner");
    const root = mkdtempSync(join(tmpdir(), "vibe-check-candidate-probe-"));
    try {
      const modules = join(root, "node_modules");
      const candidate = join(modules, "@zxyycom/vibe-check");
      const dependencyModules = join(candidate, "node_modules");
      for (const [directory, manifest] of [
        [candidate, { name: "@zxyycom/vibe-check", type: "module", exports: "./index.js" }],
        [
          join(dependencyModules, "markdownlint"),
          { name: "markdownlint", exports: "./lib/index.js" }
        ],
        [join(dependencyModules, "ajv"), { name: "ajv" }],
        [join(dependencyModules, "jscpd"), { name: "jscpd" }]
      ] as const) {
        mkdirSync(directory, { recursive: true });
        writeFileSync(join(directory, "package.json"), JSON.stringify(manifest));
      }
      writeFileSync(join(candidate, "index.js"), "export {};\n");
      mkdirSync(join(dependencyModules, "markdownlint/lib"));
      writeFileSync(join(dependencyModules, "markdownlint/lib/index.js"), "");
      for (const runtime of ["node", process.execPath]) {
        const runProbe = () => {
          const result = spawnSync(runtime, [...candidateInstallationProbeCommand()], {
            cwd: root,
            encoding: "utf8",
            killSignal: "SIGKILL",
            timeout: 10_000
          });
          assert.equal(result.error, undefined, `${runtime}: ${result.error?.message}`);
          return result;
        };
        const result = runProbe();
        assert.equal(result.status, 0, result.stderr);
        const probe: unknown = JSON.parse(result.stdout);
        assert.ok(
          probe !== null && typeof probe === "object" && "markdownlintPackageManifestPath" in probe
        );
        assert.equal(
          probe.markdownlintPackageManifestPath,
          join(dependencyModules, "markdownlint/package.json")
        );
        const boundary = join(dependencyModules, "markdownlint/lib/package.json");
        writeFileSync(boundary, JSON.stringify({ name: "wrong-package" }));
        const wrongIdentity = runProbe();
        assert.notEqual(wrongIdentity.status, 0);
        assert.match(wrongIdentity.stderr, /identity mismatch/u);
        assert.ok(wrongIdentity.stderr.includes(boundary));
        writeFileSync(boundary, "{invalid");
        const badManifest = runProbe();
        assert.notEqual(badManifest.status, 0);
        assert.match(badManifest.stderr, /could not parse resolved markdownlint package manifest/u);
        assert.ok(badManifest.stderr.includes(boundary));
        rmSync(boundary);
      }
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("keeps the explicit cold integration target outside routine discovery with hard timeout", () => {
    assert.equal(PACKAGE_CANDIDATE_INTEGRATION_INVOCATION.command, process.execPath);
    assert.equal(PACKAGE_CANDIDATE_INTEGRATION_INVOCATION.timeout, 30_000);
    assert.deepEqual(PACKAGE_CANDIDATE_INTEGRATION_INVOCATION.args.slice(0, 1), ["test"]);
    const target = PACKAGE_CANDIDATE_INTEGRATION_INVOCATION.args[1];
    assert.ok(target !== undefined && target !== "");
    assert.equal(isAbsolute(target), true);
    assert.equal(basename(target), "candidate.integration.ts");
    assert.deepEqual(PACKAGE_CANDIDATE_INTEGRATION_INVOCATION.args.slice(2), ["--reporter=dots"]);
  });
});
