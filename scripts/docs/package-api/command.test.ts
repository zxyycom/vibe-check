import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { runPackageApiDocumentationCli } from "./command.ts";
import { PACKAGE_API_MARKDOWN_DOCUMENTS } from "./example-projections.ts";
import { createPackageApiDocumentationFixture } from "./test-support.ts";

describe("package API documentation CLI", () => {
  it("writes expected projections and detects stale output through --check", () => {
    const fixtureRoot = createPackageApiDocumentationFixture();
    try {
      for (const document of PACKAGE_API_MARKDOWN_DOCUMENTS) {
        assert.equal(existsSync(join(fixtureRoot, document.packagePath)), true);
      }
      assert.equal(
        runPackageApiDocumentationCli(["--write"], { repositoryRoot: fixtureRoot }).exitCode,
        0
      );

      const schedulingPath = join(fixtureRoot, "docs/guides/scheduling.md");
      writeFileSync(
        schedulingPath,
        readFileSync(schedulingPath, "utf8").replace(
          "const executionOrder: string[] = [];",
          "stale"
        ),
        "utf8"
      );
      const staleScheduling = runPackageApiDocumentationCli(["--check"], {
        repositoryRoot: fixtureRoot
      });
      assert.equal(staleScheduling.exitCode, 1);
      assert.match(staleScheduling.diagnostics[0] ?? "", /docs\/guides\/scheduling\.md/);
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
          .replace(
            "## 自定义 Check 快速开始\n",
            "## 自定义 Check 快速开始\n\n这段 example fence 外正文必须保留。"
          )
          .replace(
            'import { defineCheck, defineConfig, run } from "@zxyycom/vibe-check";',
            "stale"
          ),
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
      assert.equal(
        readFileSync(readmePath, "utf8").includes("这段 example fence 外正文必须保留。"),
        true
      );
      assert.equal(readFileSync(readmePath, "utf8").includes("\nstale\n"), false);

      const apiMechanicsPath = join(fixtureRoot, "docs/api-mechanics.md");
      writeFileSync(
        apiMechanicsPath,
        readFileSync(apiMechanicsPath, "utf8").replace(
          "const CHANGED_FILES_DATA_VERSION = 1 as const;",
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
