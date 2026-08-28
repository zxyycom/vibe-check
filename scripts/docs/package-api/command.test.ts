import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { runPackageApiDocumentationCli } from "./command.ts";
import { createPackageApiDocumentationFixture } from "./test-support.ts";

describe("package API documentation CLI", () => {
  it("writes expected projections and detects stale output through --check", () => {
    const fixtureRoot = createPackageApiDocumentationFixture();
    try {
      assert.equal(existsSync(join(fixtureRoot, "README.md")), true);
      assert.equal(existsSync(join(fixtureRoot, "docs/api-mechanics.md")), true);
      assert.equal(
        runPackageApiDocumentationCli(["--write"], { repositoryRoot: fixtureRoot }).exitCode,
        0
      );
      assert.equal(
        runPackageApiDocumentationCli(["--check"], { repositoryRoot: fixtureRoot }).exitCode,
        0
      );

      const readmePath = join(fixtureRoot, "README.md");
      writeFileSync(
        readmePath,
        readFileSync(readmePath, "utf8")
          .replace("下面的 Check 读取", "这段标记外正文必须保留。\n\n下面的 Check 读取")
          .replace('import { defineCheck, defineConfig, run } from "vibe-check";', "stale"),
        "utf8"
      );
      const staleReadme = runPackageApiDocumentationCli(["--check"], {
        repositoryRoot: fixtureRoot
      });
      assert.equal(staleReadme.exitCode, 1);
      assert.match(staleReadme.diagnostics[0] ?? "", /README\.md/);
      assert.equal(readFileSync(readmePath, "utf8").includes("\nstale\n"), true);
      assert.equal(
        runPackageApiDocumentationCli(["--write"], { repositoryRoot: fixtureRoot }).exitCode,
        0
      );
      assert.equal(readFileSync(readmePath, "utf8").includes("这段标记外正文必须保留。"), true);
      assert.equal(readFileSync(readmePath, "utf8").includes("\nstale\n"), false);

      const apiMechanicsPath = join(fixtureRoot, "docs/api-mechanics.md");
      writeFileSync(
        apiMechanicsPath,
        readFileSync(apiMechanicsPath, "utf8").replace(
          "function hasValidLicensePolicyOptions(options: object): boolean {",
          "stale"
        ),
        "utf8"
      );
      const staleApiMechanics = runPackageApiDocumentationCli(["--check"], {
        repositoryRoot: fixtureRoot
      });
      assert.equal(staleApiMechanics.exitCode, 1);
      assert.match(staleApiMechanics.diagnostics[0] ?? "", /docs\/api-mechanics\.md/);
      assert.equal(
        runPackageApiDocumentationCli(["--write"], { repositoryRoot: fixtureRoot }).exitCode,
        0
      );

      const jsdocPath = join(fixtureRoot, "src/check/check.ts");
      writeFileSync(
        jsdocPath,
        readFileSync(jsdocPath, "utf8").replace("定义带 options、Records", "stale generated tail"),
        "utf8"
      );
      const staleJSDoc = runPackageApiDocumentationCli(["--check"], {
        repositoryRoot: fixtureRoot
      });
      assert.equal(staleJSDoc.exitCode, 1);
      assert.match(staleJSDoc.diagnostics[0] ?? "", /src\/check\/check\.ts/);
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
