import { dirname, join, normalize, resolve } from "node:path";

import { collectPackageMachineMaterials } from "./machine-artifacts/package-materials.ts";
import { loadPackageDocuments } from "./package-documents.ts";
import {
  assertPackageCheckGuideLinks,
  collectPackageCheckGuides
} from "./package-api/check-guides.ts";
import { hasPackageApiExampleProjectionMarker } from "./package-api/markdown-example-fences.ts";

const README_PATH = "README.md";

export interface PackageDocumentationFile {
  readonly content: string;
  readonly packagePath: string;
}

/** Closes the published Markdown and exact hand-written Check guide inventories. */
export function collectPackageDocumentation(
  repositoryRoot: string,
  renderedMarkdown: readonly PackageDocumentationFile[]
): readonly PackageDocumentationFile[] {
  const root = resolve(repositoryRoot);
  const mapping = loadPackageDocuments(root);
  const guides = mapping.checkGuides;
  const rendered = assertRenderedMarkdownInventory(renderedMarkdown, mapping.markdownDocuments);
  const checkGuides = collectPackageCheckGuides(root, guides);
  for (const document of checkGuides) assertDocumentText(document);
  const machineMaterials = collectPackageMachineMaterials(root);
  const machineMarkdown = machineMarkdownDocuments(machineMaterials);
  const readme = requiredDocument(rendered, README_PATH);
  const publishedDocuments = rendered.filter((document) => document.packagePath !== README_PATH);
  const supportingDocuments = [...publishedDocuments, ...checkGuides];
  const publishedMarkdownDocuments = [readme, ...supportingDocuments, ...machineMarkdown];
  for (const document of publishedMarkdownDocuments)
    assertNoPackageApiExampleProjectionMarker(document);
  assertReadmeDocumentLinks(
    readme,
    supportingDocuments,
    mapping.markdownDocuments,
    mapping.machineMaterials.map((material) => material.packagePath)
  );
  assertPackageCheckGuideLinks(readme, supportingDocuments, guides);
  assertLocalMarkdownLinks(
    publishedMarkdownDocuments,
    mapping.machineMaterials.map((material) => material.packagePath)
  );
  return Object.freeze(supportingDocuments);
}

function assertRenderedMarkdownInventory(
  documents: readonly PackageDocumentationFile[],
  markdownDocuments: readonly Readonly<{ readonly packagePath: string }>[]
): readonly PackageDocumentationFile[] {
  const expected = markdownDocuments.map((document) => document.packagePath).sort();
  const actual = documents.map((document) => document.packagePath).sort();
  if (
    actual.length !== expected.length ||
    actual.some((packagePath, index) => packagePath !== expected[index])
  ) {
    throw new Error(
      `rendered package Markdown must exactly match the document registry: received ${actual.join(", ")}`
    );
  }
  for (const document of documents) assertDocumentText(document);
  return documents;
}

function machineMarkdownDocuments(
  materials: readonly Readonly<{ readonly content: Buffer; readonly packagePath: string }>[]
): readonly PackageDocumentationFile[] {
  return Object.freeze(
    materials
      .filter((material) => material.packagePath.endsWith(".md"))
      .map((material) =>
        Object.freeze({
          content: material.content.toString("utf8"),
          packagePath: material.packagePath
        })
      )
  );
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

function assertNoPackageApiExampleProjectionMarker(document: PackageDocumentationFile): void {
  if (hasPackageApiExampleProjectionMarker(document.content)) {
    throw new Error(
      `package documentation contains a package API example projection marker: ${document.packagePath}`
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

function assertReadmeDocumentLinks(
  readme: PackageDocumentationFile,
  documents: readonly PackageDocumentationFile[],
  markdownDocuments: readonly Readonly<{ readonly packagePath: string }>[],
  machineMaterialPaths: readonly string[]
): void {
  for (const document of documents.filter((candidate) =>
    markdownDocuments.some((registered) => registered.packagePath === candidate.packagePath)
  )) {
    if (!readme.content.includes(`](./${document.packagePath})`)) {
      throw new Error(`README is missing a direct package document link: ${document.packagePath}`);
    }
  }
  for (const packagePath of machineMaterialPaths.filter((path) => path.endsWith(".md"))) {
    if (!readme.content.includes(`](./${packagePath})`)) {
      throw new Error(`README is missing a direct package machine guide link: ${packagePath}`);
    }
  }
}

function assertLocalMarkdownLinks(
  documents: readonly PackageDocumentationFile[],
  machineMaterialPaths: readonly string[]
): void {
  const paths = new Set([
    ...documents.map((document) => document.packagePath),
    ...machineMaterialPaths
  ]);
  for (const document of documents) {
    for (const match of document.content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const rawTarget = match[1];
      if (rawTarget === undefined) {
        throw new TypeError(`package documentation link has no target: ${document.packagePath}`);
      }
      const [target] = rawTarget.replace(/^<|>$/g, "").split(/[?#]/, 1);
      if (
        target === undefined ||
        target === "" ||
        /^[a-z][a-z0-9+.-]*:/i.test(target) ||
        target.startsWith("/")
      )
        continue;
      const resolved = normalize(join(dirname(document.packagePath), target)).replaceAll("\\", "/");
      if (!paths.has(resolved)) {
        throw new Error(
          `package documentation link does not resolve: ${document.packagePath} -> ${target}`
        );
      }
    }
  }
}
