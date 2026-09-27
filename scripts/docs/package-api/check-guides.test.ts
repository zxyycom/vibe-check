import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { collectPackageDocumentation } from "./check-guides.ts";
import { loadPackageDocuments } from "../package-documents.ts";
import { renderPackageApiDocumentation } from "./render.ts";
import { createPackageApiDocumentationFixture } from "./test-support.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("package Check guides", () => {
  it("requires one README-linked guide for every package-provided Check function", () => {
    const mapping = loadPackageDocuments(repositoryRoot);
    const rendered = renderPackageApiDocumentation({ repositoryRoot });
    const documents = collectPackageDocumentation(repositoryRoot, rendered.markdownDocuments);
    assert.deepEqual(
      documents.map((document) => document.packagePath).sort(),
      [
        ...mapping.markdownDocuments
          .filter((document) => document.id !== "readme")
          .map((document) => document.packagePath),
        ...mapping.checkGuides.map((guide) => guide.packagePath)
      ].sort()
    );
    assert.equal(
      documents.some((document) => document.packagePath.endsWith("index.md")),
      false
    );
    const changelog = documents.find((document) => document.packagePath === "docs/changelog.md");
    assert.ok(changelog);
    assert.equal(
      changelog.content,
      readFileSync(join(repositoryRoot, "docs/changelog.md"), "utf8")
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
              content: document.content.replaceAll(
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

      for (const documentPath of ["./docs/guides/scheduling.md", "./docs/changelog.md"]) {
        const missingDocumentMarkdown = rendered.markdownDocuments.map((document) =>
          document.packagePath === "README.md"
            ? {
                ...document,
                content: document.content.replaceAll(documentPath, "./docs/missing.md")
              }
            : document
        );
        assert.throws(
          () => collectPackageDocumentation(fixture, missingDocumentMarkdown),
          /README is missing a direct package document link/
        );
      }

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

  it("rejects package example projection markers in hand-written and machine Markdown", () => {
    for (const sourcePath of ["docs/checks/duplicate-detection.md", "docs/output.md"]) {
      for (const marker of [
        "<!-- package-api-example:obsolete -->",
        "<!-- /package-api-example:obsolete -->"
      ]) {
        const fixture = createPackageApiDocumentationFixture();
        try {
          const markdownPath = join(fixture, sourcePath);
          const markdown = readFileSync(markdownPath, "utf8");
          writeFileSync(markdownPath, markdown.replace(/\n$/, `\n${marker}\n`), "utf8");
          const rendered = renderPackageApiDocumentation({ repositoryRoot: fixture });
          assert.throws(
            () => collectPackageDocumentation(fixture, rendered.markdownDocuments),
            (error: unknown) =>
              error instanceof Error &&
              error.message ===
                `package documentation contains a package API example projection marker: ${sourcePath}`
          );
        } finally {
          rmSync(fixture, { force: true, recursive: true });
        }
      }
    }
  });
});
