import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { CURRENT_PUBLIC_CONTRACT } from "../../package/public-api-inventory.ts";
import { repositoryPath, type PackageCheckGuide } from "../package-documents.ts";
import type { PackageDocumentationFile } from "../package-markdown.ts";

const GUIDE_HEADINGS = Object.freeze([
  "## 用途",
  "## 参数与默认配置",
  "## 工作原理",
  "## 效果与结果",
  "## `not-applicable` 与 `unavailable`",
  "## I/O 与安全边界",
  "## 最小用法",
  "## 适用边界"
]);

/** Reads and closes the package-provided Check guide registry and source directory. */
export function collectPackageCheckGuides(
  root: string,
  guides: readonly PackageCheckGuide[]
): readonly PackageDocumentationFile[] {
  assertGuideRegistry(guides);
  assertExactGuideDirectory(
    root,
    guides.map((guide) => guide.sourcePath)
  );
  return Object.freeze(guides.map((guide) => readCheckGuide(root, guide)));
}

/** Verifies each registered guide's README link and public Check identity. */
export function assertPackageCheckGuideLinks(
  readme: PackageDocumentationFile,
  documents: readonly PackageDocumentationFile[],
  guides: readonly PackageCheckGuide[]
): void {
  for (const guide of guides) {
    if (!readme.content.includes(`](./${guide.packagePath})`)) {
      throw new Error(`README is missing a direct package Check guide link: ${guide.packagePath}`);
    }
    const document = documents.find((candidate) => candidate.packagePath === guide.packagePath);
    if (document === undefined)
      throw new Error(`package documentation is missing: ${guide.packagePath}`);
    if (!document.content.includes(`# \`${guide.exportName}\``)) {
      throw new Error(`package Check guide must identify its public export: ${guide.packagePath}`);
    }
  }
}

function assertGuideRegistry(guides: readonly PackageCheckGuide[]): void {
  const ids = new Set<string>();
  const names = new Set<string>();
  const paths = new Set<string>();
  for (const guide of guides) {
    if (!/^[a-z][a-z0-9-]*$/.test(guide.checkId))
      throw new Error(`invalid package Check guide id: ${guide.checkId}`);
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(guide.exportName))
      throw new Error(`invalid package Check guide export: ${guide.exportName}`);
    if (!guide.sourcePath.startsWith("docs/checks/") || !guide.sourcePath.endsWith(".md"))
      throw new Error(`invalid package Check guide path: ${guide.sourcePath}`);
    if (ids.has(guide.checkId) || names.has(guide.exportName) || paths.has(guide.sourcePath))
      throw new Error(`duplicate package Check guide registry entry: ${guide.checkId}`);
    ids.add(guide.checkId);
    names.add(guide.exportName);
    paths.add(guide.sourcePath);
  }
  const expectedCheckExports = Object.values(CURRENT_PUBLIC_CONTRACT.checks).sort();
  const actualCheckExports = [...names].sort();
  if (actualCheckExports.join("\0") !== expectedCheckExports.join("\0")) {
    throw new Error(
      `package Check guides must exactly cover package-provided Check functions: expected ${expectedCheckExports.join(", ")}; received ${actualCheckExports.join(", ")}`
    );
  }
}

function assertExactGuideDirectory(root: string, expectedPaths: readonly string[]): void {
  const directory = join(root, "docs/checks");
  if (!existsSync(directory))
    throw new Error("package Check guide directory is missing: docs/checks");
  const actualPaths = collectMarkdownFiles(root, directory);
  const expected = [...expectedPaths].sort();
  if (
    actualPaths.length !== expected.length ||
    actualPaths.some((path, index) => path !== expected[index])
  ) {
    throw new Error(
      `package Check guides must exactly match the registry: expected ${expected.join(", ")}; received ${actualPaths.join(", ")}`
    );
  }
}

function collectMarkdownFiles(root: string, directory: string): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...collectMarkdownFiles(root, path));
    else if (entry.isFile() && entry.name.endsWith(".md"))
      paths.push(relative(root, path).replaceAll("\\", "/"));
    else if (entry.isFile())
      throw new Error(
        `package Check guide directory only permits Markdown: ${relative(root, path)}`
      );
  }
  return paths.sort();
}

function readCheckGuide(root: string, guide: PackageCheckGuide): PackageDocumentationFile {
  const path = repositoryPath(root, guide.sourcePath, "package Check guide source path");
  if (!existsSync(path))
    throw new Error(`package documentation file is missing: ${guide.sourcePath}`);
  const document = Object.freeze({
    content: readFileSync(path, "utf8"),
    packagePath: guide.packagePath
  });
  for (const heading of GUIDE_HEADINGS) {
    if (!document.content.includes(heading)) {
      throw new Error(
        `package Check guide is missing required section ${heading}: ${guide.sourcePath}`
      );
    }
  }
  return document;
}
