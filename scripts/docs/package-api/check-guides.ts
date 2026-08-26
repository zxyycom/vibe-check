import { existsSync, readdirSync, readFileSync } from "node:fs";

import { CURRENT_PUBLIC_CONTRACT } from "./public-api-inventory.ts";
import { dirname, join, normalize, relative, resolve } from "node:path";

import {
  PACKAGE_CHECK_GUIDE_INDEX_PATH,
  PACKAGE_CHECK_GUIDES,
  type PackageCheckGuide
} from "./registry.ts";

const GUIDE_HEADINGS = Object.freeze([
  "## 用途",
  "## 参数与默认配置",
  "## 工作原理",
  "## 效果与结果",
  "## `not-applicable` 与 `unavailable`",
  "## 外部工具与安全边界",
  "## 最小用法",
  "## 非目标"
]);

export interface PackageDocumentationFile {
  readonly content: string;
  readonly packagePath: string;
}

/** Reads the exact hand-written guide inventory and rejects incomplete package documentation. */
export function collectPackageCheckGuides(
  repositoryRoot: string,
  readmeContent?: string
): readonly PackageDocumentationFile[] {
  const root = resolve(repositoryRoot);
  assertGuideRegistry(PACKAGE_CHECK_GUIDES);
  const guidePaths = [
    PACKAGE_CHECK_GUIDE_INDEX_PATH,
    ...PACKAGE_CHECK_GUIDES.map((guide) => guide.sourcePath)
  ];
  assertExactGuideDirectory(root, guidePaths);
  const documents = guidePaths.map((packagePath) => readDocument(root, packagePath));
  const readme = Object.freeze({
    content: readmeContent ?? readFileSync(join(root, "README.md"), "utf8"),
    packagePath: "README.md"
  });
  assertGuideLinks(readme, documents);
  assertLocalMarkdownLinks([readme, ...documents]);
  return Object.freeze(documents);
}

function assertGuideRegistry(guides: readonly PackageCheckGuide[]): void {
  if (guides.length !== 7)
    throw new Error("package Check guide registry must contain exactly seven entries");
  const ids = new Set<string>();
  const names = new Set<string>();
  const paths = new Set<string>();
  for (const guide of guides) {
    if (!/^[a-z][a-z0-9-]*$/.test(guide.checkId))
      throw new Error(`invalid package Check guide id: ${guide.checkId}`);
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(guide.constructorName))
      throw new Error(`invalid package Check guide constructor: ${guide.constructorName}`);
    if (!guide.sourcePath.startsWith("docs/checks/") || !guide.sourcePath.endsWith(".md"))
      throw new Error(`invalid package Check guide path: ${guide.sourcePath}`);
    if (ids.has(guide.checkId) || names.has(guide.constructorName) || paths.has(guide.sourcePath))
      throw new Error(`duplicate package Check guide registry entry: ${guide.checkId}`);
    ids.add(guide.checkId);
    names.add(guide.constructorName);
    paths.add(guide.sourcePath);
  }
  const expectedConstructors = [
    ...Object.values(CURRENT_PUBLIC_CONTRACT.values),
    CURRENT_PUBLIC_CONTRACT.operations.maintenanceReminders
  ].sort();
  const actualConstructors = [...names].sort();
  if (actualConstructors.join("\0") !== expectedConstructors.join("\0")) {
    throw new Error(
      `package Check guides must exactly cover package-provided Check values and constructors: expected ${expectedConstructors.join(", ")}; received ${actualConstructors.join(", ")}`
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

function readDocument(root: string, packagePath: string): PackageDocumentationFile {
  const path = join(root, packagePath);
  if (!existsSync(path)) throw new Error(`package documentation file is missing: ${packagePath}`);
  const content = readFileSync(path, "utf8");
  if (!content.endsWith("\n") || content.includes("\r"))
    throw new Error(`package documentation must use LF and one trailing LF: ${packagePath}`);
  if (
    packagePath !== "README.md" &&
    packagePath !== "docs/package-readme.template.md" &&
    packagePath !== PACKAGE_CHECK_GUIDE_INDEX_PATH
  )
    for (const heading of GUIDE_HEADINGS)
      if (!content.includes(heading))
        throw new Error(
          `package Check guide is missing required section ${heading}: ${packagePath}`
        );
  return Object.freeze({ content, packagePath });
}

function assertGuideLinks(
  readme: PackageDocumentationFile,
  documents: readonly PackageDocumentationFile[]
): void {
  if (!readme.content.includes(`(./${PACKAGE_CHECK_GUIDE_INDEX_PATH})`)) {
    throw new Error(
      `README is missing package Check guide index link: ${PACKAGE_CHECK_GUIDE_INDEX_PATH}`
    );
  }
  const index = documents.find(
    (document) => document.packagePath === PACKAGE_CHECK_GUIDE_INDEX_PATH
  );
  if (index === undefined) throw new Error("package Check guide index is missing");
  for (const guide of PACKAGE_CHECK_GUIDES) {
    if (!index.content.includes(`](${guide.checkId}.md)`))
      throw new Error(`package Check guide index is missing link: ${guide.sourcePath}`);
    const document = documents.find((candidate) => candidate.packagePath === guide.sourcePath);
    if (document === undefined || !document.content.includes(`# \`${guide.constructorName}\``))
      throw new Error(
        `package Check guide does not identify its public constructor: ${guide.sourcePath}`
      );
  }
}

function assertLocalMarkdownLinks(documents: readonly PackageDocumentationFile[]): void {
  const paths = new Set(documents.map((document) => document.packagePath));
  for (const document of documents) {
    for (const match of document.content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].replace(/^<|>$/g, "").split(/[?#]/, 1)[0];
      if (target === "" || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("/")) continue;
      const resolved = normalize(join(dirname(document.packagePath), target)).replaceAll("\\", "/");
      if (!paths.has(resolved))
        throw new Error(
          `package documentation link does not resolve: ${document.packagePath} -> ${target}`
        );
    }
  }
}
