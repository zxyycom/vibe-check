import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { collectPackageDocumentation } from "./check-guides.ts";
import { PACKAGE_CHECK_GUIDES } from "./check-guide-registry.ts";
import { renderPackageApiDocumentation } from "./render.ts";
import { createPackageApiDocumentationFixture } from "./test-support.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("package Check guides", () => {
  it("requires one README-linked guide for every package-provided Check and constructor", () => {
    const rendered = renderPackageApiDocumentation({ repositoryRoot });
    const documents = collectPackageDocumentation(repositoryRoot, rendered.markdownDocuments);
    assert.equal(PACKAGE_CHECK_GUIDES.length, 7);
    assert.deepEqual(documents.map((document) => document.packagePath).sort(), [
      "docs/api-mechanics.md",
      "docs/checks/duplicate-detection.md",
      "docs/checks/file-metrics.md",
      "docs/checks/function-metrics.md",
      "docs/checks/json-schema-validation.md",
      "docs/checks/json-validation.md",
      "docs/checks/maintenance-reminders.md",
      "docs/checks/markdown-link-validation.md"
    ]);
    assert.equal(
      documents.some((document) => document.packagePath.endsWith("index.md")),
      false
    );
  });

  it("rejects a missing direct README link and an extra Check guide page", () => {
    const fixture = createPackageApiDocumentationFixture();
    try {
      const rendered = renderPackageApiDocumentation({ repositoryRoot: fixture });
      const readme = rendered.markdownDocuments.find(
        (document) => document.packagePath === "README.md"
      );
      assert.ok(readme);
      const missingLinkMarkdown = rendered.markdownDocuments.map((document) =>
        document.packagePath === "README.md"
          ? {
              ...document,
              content: document.content.replace(
                "./docs/checks/duplicate-detection.md",
                "./docs/checks/missing.md"
              )
            }
          : document
      );
      assert.throws(
        () => collectPackageDocumentation(fixture, missingLinkMarkdown),
        /README is missing a direct package Check guide link/
      );

      writeFileSync(join(fixture, "docs/checks/extra.md"), "# extra\n", "utf8");
      assert.throws(
        () => collectPackageDocumentation(fixture, rendered.markdownDocuments),
        /must exactly match the registry/
      );
    } finally {
      rmSync(fixture, { force: true, recursive: true });
    }
  });

  it("rejects package documentation without exactly one trailing LF", () => {
    const fixture = createPackageApiDocumentationFixture();
    try {
      const rendered = renderPackageApiDocumentation({ repositoryRoot: fixture });
      const extraTrailingLf = rendered.markdownDocuments.map((document) =>
        document.packagePath === "docs/api-mechanics.md"
          ? { ...document, content: `${document.content}\n` }
          : document
      );
      assert.throws(
        () => collectPackageDocumentation(fixture, extraTrailingLf),
        /package documentation must use LF and one trailing LF/
      );
    } finally {
      rmSync(fixture, { force: true, recursive: true });
    }
  });
});
