import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";

import { CURRENT_PUBLIC_CONTRACT } from "../../package/public-api-inventory.ts";
import { PACKAGE_CHECK_GUIDES, type PackageCheckGuide } from "./check-guide-registry.ts";

const README_PATH = "README.md";
const API_MECHANICS_PATH = "docs/api-mechanics.md";
const CHECK_GUIDE_README_LINK = "(../../README.md#随包提供的-check)";
const NON_CHECK_OPERATIONS: readonly string[] = Object.freeze([
  CURRENT_PUBLIC_CONTRACT.operations.defineCheck,
  CURRENT_PUBLIC_CONTRACT.operations.defineConfig,
  CURRENT_PUBLIC_CONTRACT.operations.inherit,
  CURRENT_PUBLIC_CONTRACT.operations.run
]);
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

export interface PackageDocumentationFile {
  readonly content: string;
  readonly packagePath: string;
}

/** Closes the generated API guide and exact hand-written Check guide inventory. */
export function collectPackageDocumentation(
  repositoryRoot: string,
  generatedMarkdown: readonly PackageDocumentationFile[]
): readonly PackageDocumentationFile[] {
  const root = resolve(repositoryRoot);
  assertGuideRegistry(PACKAGE_CHECK_GUIDES);
  const generated = assertGeneratedMarkdownInventory(generatedMarkdown);
  assertExactGuideDirectory(
    root,
    PACKAGE_CHECK_GUIDES.map((guide) => guide.sourcePath)
  );
  const checkGuides = PACKAGE_CHECK_GUIDES.map((guide) => readCheckGuide(root, guide.sourcePath));
  const readme = requiredDocument(generated, README_PATH);
  const supportingDocuments = [requiredDocument(generated, API_MECHANICS_PATH), ...checkGuides];
  assertGuideLinks(readme, supportingDocuments);
  assertLocalMarkdownLinks([readme, ...supportingDocuments]);
  return Object.freeze(supportingDocuments);
}

function assertGeneratedMarkdownInventory(
  documents: readonly PackageDocumentationFile[]
): readonly PackageDocumentationFile[] {
  const expected = [API_MECHANICS_PATH, README_PATH].sort();
  const actual = documents.map((document) => document.packagePath).sort();
  if (
    actual.length !== expected.length ||
    actual.some((packagePath, index) => packagePath !== expected[index])
  ) {
    throw new Error(
      `generated package Markdown must be README.md plus one API mechanics guide: received ${actual.join(", ")}`
    );
  }
  for (const document of documents) assertDocumentText(document);
  return documents;
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
  const expectedCheckExports = [
    ...Object.values(CURRENT_PUBLIC_CONTRACT.values),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.operations).filter(
      (operation) => !NON_CHECK_OPERATIONS.includes(operation)
    )
  ].sort();
  const actualCheckExports = [...names].sort();
  if (actualCheckExports.join("\0") !== expectedCheckExports.join("\0")) {
    throw new Error(
      `package Check guides must exactly cover package-provided Check values and constructors: expected ${expectedCheckExports.join(", ")}; received ${actualCheckExports.join(", ")}`
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

function readCheckGuide(root: string, packagePath: string): PackageDocumentationFile {
  const path = join(root, packagePath);
  if (!existsSync(path)) throw new Error(`package documentation file is missing: ${packagePath}`);
  const document = Object.freeze({ content: readFileSync(path, "utf8"), packagePath });
  assertDocumentText(document);
  for (const heading of GUIDE_HEADINGS) {
    if (!document.content.includes(heading)) {
      throw new Error(`package Check guide is missing required section ${heading}: ${packagePath}`);
    }
  }
  return document;
}

function assertDocumentText(document: PackageDocumentationFile): void {
  if (
    !document.content.endsWith("\n") ||
    document.content.endsWith("\n\n") ||
    document.content.includes("\r")
  ) {
    throw new Error(
      `package documentation must use LF and one trailing LF: ${document.packagePath}`
    );
  }
}

function requiredDocument(
  documents: readonly PackageDocumentationFile[],
  packagePath: string
): PackageDocumentationFile {
  const document = documents.find((candidate) => candidate.packagePath === packagePath);
  if (document === undefined) throw new Error(`package documentation is missing: ${packagePath}`);
  return document;
}

function assertGuideLinks(
  readme: PackageDocumentationFile,
  documents: readonly PackageDocumentationFile[]
): void {
  if (!readme.content.includes(`(./${API_MECHANICS_PATH})`)) {
    throw new Error(`README is missing the package API mechanics link: ${API_MECHANICS_PATH}`);
  }
  for (const guide of PACKAGE_CHECK_GUIDES) {
    if (!readme.content.includes(`](./${guide.sourcePath})`)) {
      throw new Error(`README is missing a direct package Check guide link: ${guide.sourcePath}`);
    }
    const document = requiredDocument(documents, guide.sourcePath);
    if (
      !document.content.includes(`# \`${guide.exportName}\``) ||
      !document.content.includes(CHECK_GUIDE_README_LINK)
    ) {
      throw new Error(
        `package Check guide must identify its public export and link back to README: ${guide.sourcePath}`
      );
    }
  }
}

function assertLocalMarkdownLinks(documents: readonly PackageDocumentationFile[]): void {
  const paths = new Set(documents.map((document) => document.packagePath));
  for (const document of documents) {
    for (const match of document.content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].replace(/^<|>$/g, "").split(/[?#]/, 1)[0];
      if (target === "" || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("/")) continue;
      const resolved = normalize(join(dirname(document.packagePath), target)).replaceAll("\\", "/");
      if (!paths.has(resolved)) {
        throw new Error(
          `package documentation link does not resolve: ${document.packagePath} -> ${target}`
        );
      }
    }
  }
}
