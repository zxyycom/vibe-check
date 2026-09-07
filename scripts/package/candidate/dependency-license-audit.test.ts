import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { auditInstalledDependencyLicenses } from "./dependency-license-audit.ts";

describe("installed dependency license audit", () => {
  it("covers every package directory and fails closed on unsupported declarations and layouts", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-dependency-licenses-"));
    try {
      const nodeModules = join(fixtureRoot, "node_modules");
      const candidateDirectory = writePackage(nodeModules, "@zxyycom/vibe-check", {
        license: "MIT AND Apache-2.0 AND BSD-2-Clause",
        version: "0.0.0-test"
      });
      const auditInput = Object.freeze({
        candidatePackageDirectory: candidateDirectory,
        consumerDirectory: fixtureRoot
      });
      const modernDependency = writePackage(nodeModules, "modern", {
        license: "MIT",
        version: "1.0.0"
      });
      writePackage(join(modernDependency, "node_modules"), "legacy", {
        licenses: [{ type: "BSD-2-Clause" }, { type: "BSD-2-Clause" }],
        version: "2.0.0"
      });
      writePackage(nodeModules, "@scope/approved", {
        license: "Apache-2.0",
        version: "3.0.0"
      });

      assert.deepEqual(auditInstalledDependencyLicenses(auditInput), {
        dependencyPackageCount: 3,
        licenseCounts: [
          { license: "Apache-2.0", packageCount: 1 },
          { license: "BSD-2-Clause", packageCount: 1 },
          { license: "MIT", packageCount: 1 }
        ]
      });

      writePackage(nodeModules, "unsupported", { license: "GPL-3.0-only", version: "1.0.0" });
      assert.throws(
        () => auditInstalledDependencyLicenses(auditInput),
        /installed dependency license declaration is not accepted by policy unsupported@1\.0\.0: GPL-3\.0-only/u
      );
      rmSync(join(nodeModules, "unsupported"), { recursive: true });

      writePackage(nodeModules, "missing-license", { version: "1.0.0" });
      assert.throws(
        () => auditInstalledDependencyLicenses(auditInput),
        /installed dependency does not declare a license: missing-license@1\.0\.0/u
      );
      rmSync(join(nodeModules, "missing-license"), { recursive: true });

      writePackage(nodeModules, "invalid-license", { license: " MIT ", version: "1.0.0" });
      assert.throws(
        () => auditInstalledDependencyLicenses(auditInput),
        /installed dependency has an invalid license declaration: invalid-license@1\.0\.0/u
      );
      rmSync(join(nodeModules, "invalid-license"), { recursive: true });

      writePackage(nodeModules, "invalid-legacy-license", {
        licenses: [{ type: " MIT " }],
        version: "1.0.0"
      });
      assert.throws(
        () => auditInstalledDependencyLicenses(auditInput),
        /installed dependency has an invalid legacy licenses declaration: invalid-legacy-license@1\.0\.0/u
      );
      rmSync(join(nodeModules, "invalid-legacy-license"), { recursive: true });

      writePackage(nodeModules, "conflicting-legacy-license", {
        licenses: [{ type: "MIT" }, { type: "BSD-2-Clause" }],
        version: "1.0.0"
      });
      assert.throws(
        () => auditInstalledDependencyLicenses(auditInput),
        /installed dependency has an invalid legacy licenses declaration: conflicting-legacy-license@1\.0\.0/u
      );
      rmSync(join(nodeModules, "conflicting-legacy-license"), { recursive: true });

      writePackage(nodeModules, "mismatched-name", {
        license: "MIT",
        name: "different-name",
        version: "1.0.0"
      });
      assert.throws(
        () => auditInstalledDependencyLicenses(auditInput),
        /installed dependency directory name does not match its manifest: mismatched-name != different-name/u
      );
      rmSync(join(nodeModules, "mismatched-name"), { recursive: true });

      writePackage(nodeModules, "invalid-version", { license: "MIT", version: " " });
      assert.throws(
        () => auditInstalledDependencyLicenses(auditInput),
        /installed dependency manifest has an invalid version/u
      );
      rmSync(join(nodeModules, "invalid-version"), { recursive: true });

      mkdirSync(join(nodeModules, "missing-manifest"));
      assert.throws(
        () => auditInstalledDependencyLicenses(auditInput),
        /could not read installed dependency manifest missing-manifest/u
      );
      rmSync(join(nodeModules, "missing-manifest"), { recursive: true });

      const malformedManifestDirectory = writePackage(nodeModules, "malformed-manifest", {
        license: "MIT",
        version: "1.0.0"
      });
      writeFileSync(join(malformedManifestDirectory, "package.json"), "{", "utf8");
      assert.throws(
        () => auditInstalledDependencyLicenses(auditInput),
        /could not parse installed dependency manifest malformed-manifest/u
      );
      rmSync(malformedManifestDirectory, { recursive: true });

      assert.throws(
        () =>
          auditInstalledDependencyLicenses({
            candidatePackageDirectory: fixtureRoot,
            consumerDirectory: fixtureRoot
          }),
        /candidate package directory escapes private consumer node_modules/u
      );

      symlinkSync(modernDependency, join(nodeModules, "linked"), "dir");
      assert.throws(
        () => auditInstalledDependencyLicenses(auditInput),
        /installed dependency linked must be a non-symbolic-link directory/u
      );
      rmSync(join(nodeModules, "linked"));

      const nestedLayout = writePackage(nodeModules, "nested-layout", {
        license: "MIT",
        version: "1.0.0"
      });
      symlinkSync(
        join(fixtureRoot, "missing-node-modules"),
        join(nestedLayout, "node_modules"),
        "dir"
      );
      assert.throws(
        () => auditInstalledDependencyLicenses(auditInput),
        /nested node_modules for nested-layout@1\.0\.0 must be a non-symbolic-link directory/u
      );
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  });
});

function writePackage(
  nodeModulesDirectory: string,
  name: string,
  fields: Readonly<Record<string, unknown>>
): string {
  const packageDirectory = join(nodeModulesDirectory, ...name.split("/"));
  mkdirSync(packageDirectory, { recursive: true });
  writeFileSync(
    join(packageDirectory, "package.json"),
    `${JSON.stringify({ name, ...fields }, null, 2)}\n`,
    "utf8"
  );
  return packageDirectory;
}
