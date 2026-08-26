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
