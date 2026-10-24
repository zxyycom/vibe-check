import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { collectPackageDocumentation, type PackageDocumentationFile } from "./package-markdown.ts";
import { loadPackageDocuments, PACKAGE_DOCUMENTS_CONFIG_PATH } from "./package-documents.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function createPackageMarkdownFixture(): {
  readonly root: string;
  readonly markdownDocuments: readonly PackageDocumentationFile[];
} {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-package-markdown-"));
  const mapping = loadPackageDocuments(repositoryRoot);
  for (const sourcePath of [
    PACKAGE_DOCUMENTS_CONFIG_PATH,
    ...mapping.checkGuides.map((guide) => guide.sourcePath),
    ...mapping.machineMaterials.map((material) => material.sourcePath)
  ]) {
    const destination = join(root, sourcePath);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(repositoryRoot, sourcePath), destination);
  }
  return {
    root,
    markdownDocuments: mapping.markdownDocuments.map((document) => ({
      content: readFileSync(join(repositoryRoot, document.sourcePath), "utf8"),
      packagePath: document.packagePath
    }))
  };
}

describe("package Markdown", () => {
  it("closes fixture documentation inventory and rejects missing links or extra guide pages", () => {
    const { root: fixture, markdownDocuments } = createPackageMarkdownFixture();
    try {
      const mapping = loadPackageDocuments(fixture);
      const documents = collectPackageDocumentation(fixture, markdownDocuments);
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
        documents.some((document) => basename(document.packagePath) === "index.md"),
        false
      );
      const changelog = documents.find((document) => document.packagePath === "docs/changelog.md");
      assert.ok(changelog);
      assert.equal(
        changelog.content,
        readFileSync(join(repositoryRoot, "docs/changelog.md"), "utf8")
      );
      const readme = markdownDocuments.find((document) => document.packagePath === "README.md");
      assert.ok(readme);
      const missingLinkMarkdown = markdownDocuments.map((document) =>
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
        const missingDocumentMarkdown = markdownDocuments.map((document) =>
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

      const mappingPath = join(fixture, "docs/package-documents.json");
      const mappingText = readFileSync(mappingPath, "utf8");
      writeFileSync(
        mappingPath,
        JSON.stringify({ ...mapping, checkGuides: mapping.checkGuides.slice(1) }),
        "utf8"
      );
      assert.throws(
        () => collectPackageDocumentation(fixture, markdownDocuments),
        /must exactly cover package-provided Check functions/
      );
      writeFileSync(mappingPath, mappingText, "utf8");

      writeFileSync(join(fixture, "docs/checks/extra.md"), "# extra\n", "utf8");
      assert.throws(
        () => collectPackageDocumentation(fixture, markdownDocuments),
        /must exactly match the registry/
      );
    } finally {
      rmSync(fixture, { force: true, recursive: true });
    }
  });

  it("rejects package documentation without exactly one trailing LF", () => {
    const { root: fixture, markdownDocuments } = createPackageMarkdownFixture();
    try {
      const extraTrailingLf = markdownDocuments.map((document) =>
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
        const { root: fixture, markdownDocuments } = createPackageMarkdownFixture();
        try {
          const markdownPath = join(fixture, sourcePath);
          const markdown = readFileSync(markdownPath, "utf8");
          writeFileSync(markdownPath, markdown.replace(/\n$/, `\n${marker}\n`), "utf8");
          assert.throws(
            () => collectPackageDocumentation(fixture, markdownDocuments),
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
