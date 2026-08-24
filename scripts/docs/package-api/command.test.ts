import assert from "node:assert/strict";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { runPackageApiDocumentationCli } from "./command.ts";
import { PACKAGE_API_EXAMPLE_PROJECTIONS } from "./registry.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("package API documentation CLI", () => {
  it("writes expected projections and detects stale output through --check", () => {
    const fixtureRoot = createDocumentationFixture();
    try {
      const stale = runPackageApiDocumentationCli(["--check"], { repositoryRoot: fixtureRoot });
      assert.equal(stale.exitCode, 1);
      assert.match(stale.diagnostics[0] ?? "", /README\.md/);
      assert.equal(existsSync(join(fixtureRoot, "README.md")), false);

      assert.equal(
        runPackageApiDocumentationCli(["--write"], { repositoryRoot: fixtureRoot }).exitCode,
        0
      );
      assert.equal(existsSync(join(fixtureRoot, "README.md")), true);
      assert.equal(
        runPackageApiDocumentationCli(["--check"], { repositoryRoot: fixtureRoot }).exitCode,
        0
      );

      writeFileSync(join(fixtureRoot, "README.md"), "stale\n", "utf8");
      const staleReadme = runPackageApiDocumentationCli(["--check"], {
        repositoryRoot: fixtureRoot
      });
      assert.equal(staleReadme.exitCode, 1);
      assert.match(staleReadme.diagnostics[0] ?? "", /README\.md/);
      assert.equal(
        runPackageApiDocumentationCli(["--write"], { repositoryRoot: fixtureRoot }).exitCode,
        0
      );

      const jsdocPath = join(fixtureRoot, "src/definition/custom-check.ts");
      writeFileSync(
        jsdocPath,
        readFileSync(jsdocPath, "utf8").replace("定义带 options、Records", "stale generated tail"),
        "utf8"
      );
      const staleJSDoc = runPackageApiDocumentationCli(["--check"], {
        repositoryRoot: fixtureRoot
      });
      assert.equal(staleJSDoc.exitCode, 1);
      assert.match(staleJSDoc.diagnostics[0] ?? "", /src\/definition\/custom-check\.ts/);
      assert.equal(
        runPackageApiDocumentationCli(["--write"], { repositoryRoot: fixtureRoot }).exitCode,
        0
      );
      assert.equal(readFileSync(jsdocPath, "utf8").includes("stale generated tail"), false);
      assert.equal(
        runPackageApiDocumentationCli(["--check"], { repositoryRoot: fixtureRoot }).exitCode,
        0
      );
      assert.throws(
        () => runPackageApiDocumentationCli([], { repositoryRoot: fixtureRoot }),
        /usage:/
      );
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  });
});

function createDocumentationFixture(): string {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-package-api-docs-cli-"));
  copyFixtureFile(fixtureRoot, "docs/package-readme.template.md");
  for (const projection of PACKAGE_API_EXAMPLE_PROJECTIONS) {
    copyFixtureFile(fixtureRoot, projection.sourcePath);
  }
  const sourcePath = join(fixtureRoot, "src/definition/custom-check.ts");
  mkdirSync(dirname(sourcePath), { recursive: true });
  writeFileSync(
    sourcePath,
    ["/**", " * Defines a Check.", " */", "export function defineCheck() { return {}; }", ""].join(
      "\n"
    ),
    "utf8"
  );
  return fixtureRoot;
}

function copyFixtureFile(fixtureRoot: string, repositoryPath: string): void {
  const destination = join(fixtureRoot, repositoryPath);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(join(repositoryRoot, repositoryPath), destination);
}
