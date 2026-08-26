import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { collectPackageCheckGuides } from "./check-guides.ts";
import { PACKAGE_CHECK_GUIDES } from "./registry.ts";
import { createPackageApiDocumentationFixture } from "./test-support.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("package Check guides", () => {
  it("requires one exact linked guide for every package-provided Check and constructor", () => {
    const documents = collectPackageCheckGuides(repositoryRoot);
    assert.equal(PACKAGE_CHECK_GUIDES.length, 7);
    assert.deepEqual(documents.map((document) => document.packagePath).sort(), [
      "docs/checks/duplicate-detection.md",
      "docs/checks/file-metrics.md",
      "docs/checks/function-metrics.md",
      "docs/checks/index.md",
      "docs/checks/json-schema-validation.md",
      "docs/checks/json-validation.md",
      "docs/checks/maintenance-reminders.md",
      "docs/checks/markdown-link-validation.md"
    ]);
  });

  it("rejects a missing guide link and an extra guide page", () => {
    const fixture = createPackageApiDocumentationFixture();
    try {
      for (const path of [
        "docs/checks/index.md",
        ...PACKAGE_CHECK_GUIDES.map((guide) => guide.sourcePath)
      ]) {
        const source = join(repositoryRoot, path);
        const target = join(fixture, path);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, readFileSync(source, "utf8"), "utf8");
      }
      writeFileSync(join(fixture, "docs/package-readme.template.md"), "# README\n", "utf8");
      assert.throws(
        () => collectPackageCheckGuides(fixture, "# README\n"),
        /README is missing package Check guide index link/
      );
      writeFileSync(
        join(fixture, "docs/package-readme.template.md"),
        readFileSync(join(repositoryRoot, "docs/package-readme.template.md"), "utf8"),
        "utf8"
      );
      writeFileSync(join(fixture, "docs/checks/extra.md"), "# extra\n", "utf8");
      assert.throws(
        () => collectPackageCheckGuides(fixture, "[guides](./docs/checks/index.md)\n"),
        /must exactly match the registry/
      );
    } finally {
      rmSync(fixture, { force: true, recursive: true });
    }
  });
});
