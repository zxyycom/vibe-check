import { readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import {
  PACKAGE_API_EXAMPLE_PROJECTIONS,
  PACKAGE_API_MARKDOWN_DOCUMENTS,
  type PackageApiExampleProjection,
  type PackageApiMarkdownDocument
} from "./example-projections.ts";
import {
  renderMarkdownExampleFences,
  type MarkdownExampleFenceReplacement
} from "./markdown-example-fences.ts";
import { renderJSDocSources } from "./jsdoc-render.ts";
import { collectExamplePayloads, type ExamplePayload } from "./example-payloads.ts";

const README_DOCUMENT_ID = "readme";

export interface RenderedPackageApiFile {
  readonly absolutePath: string;
  readonly content: string;
}

export interface RenderedPackageApiMarkdownDocument extends RenderedPackageApiFile {
  readonly documentId: string;
  readonly packagePath: string;
}

export interface RenderedPackageApiDocumentation {
  readonly jsdocSources: readonly RenderedPackageApiFile[];
  readonly markdownDocuments: readonly RenderedPackageApiMarkdownDocument[];
  readonly readme: RenderedPackageApiMarkdownDocument;
}

function assertMarkdownDocumentRegistry(documents: readonly PackageApiMarkdownDocument[]): void {
  if (documents.length !== 2) {
    throw new Error("package API documentation must contain one README and one deeper guide");
  }
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const document of documents) {
    if (
      !validIdentifier(document.id) ||
      !document.packagePath.endsWith(".md") ||
      ids.has(document.id) ||
      paths.has(document.packagePath)
    ) {
      throw new Error(`invalid package API Markdown document: ${document.id}`);
    }
    ids.add(document.id);
    paths.add(document.packagePath);
  }
  const readme = documents.find((document) => document.id === README_DOCUMENT_ID);
  const deeperGuide = documents.find((document) => document.id !== README_DOCUMENT_ID);
  if (readme?.packagePath !== "README.md" || deeperGuide?.packagePath !== "docs/api-mechanics.md") {
    throw new Error("package API Markdown documents must be README.md plus docs/api-mechanics.md");
  }
}

/**
 * Computes heading-scoped Markdown fence and JSDoc example projections without writing files.
 * The CLI and candidate preparation own their respective side effects.
 */
export function renderPackageApiDocumentation(
  input: Readonly<{
    readonly projections?: readonly PackageApiExampleProjection[];
    readonly repositoryRoot: string;
  }>
): RenderedPackageApiDocumentation {
  const repositoryRoot = resolve(input.repositoryRoot);
  const projections = input.projections ?? PACKAGE_API_EXAMPLE_PROJECTIONS;
  assertMarkdownDocumentRegistry(PACKAGE_API_MARKDOWN_DOCUMENTS);
  const payloads = collectExamplePayloads(repositoryRoot, projections);
  const markdownDocuments = renderMarkdownDocuments(repositoryRoot, projections, payloads);
  const readme = markdownDocuments.find((document) => document.documentId === README_DOCUMENT_ID);
  if (readme === undefined) throw new Error("package API documentation is missing its README");
  const jsdocSources = renderJSDocSources(repositoryRoot, projections, payloads);
  return Object.freeze({ jsdocSources, markdownDocuments, readme });
}

function renderMarkdownDocuments(
  repositoryRoot: string,
  projections: readonly PackageApiExampleProjection[],
  payloads: ReadonlyMap<string, ExamplePayload>
): readonly RenderedPackageApiMarkdownDocument[] {
  return Object.freeze(
    PACKAGE_API_MARKDOWN_DOCUMENTS.map((document) =>
      renderMarkdownDocument(repositoryRoot, document, projections, payloads)
    )
  );
}

function renderMarkdownDocument(
  repositoryRoot: string,
  document: PackageApiMarkdownDocument,
  projections: readonly PackageApiExampleProjection[],
  payloads: ReadonlyMap<string, ExamplePayload>
): RenderedPackageApiMarkdownDocument {
  const filePath = repositoryFilePath(repositoryRoot, document.packagePath);
  const replacements = markdownExampleFenceReplacements(document.id, projections, payloads);
  const content = renderMarkdownExampleFences({
    documentPackagePath: document.packagePath,
    replacements,
    sourceMarkdown: readText(filePath)
  });
  return Object.freeze({
    absolutePath: filePath,
    content,
    documentId: document.id,
    packagePath: document.packagePath
  });
}

function markdownExampleFenceReplacements(
  documentId: string,
  projections: readonly PackageApiExampleProjection[],
  payloads: ReadonlyMap<string, ExamplePayload>
): readonly MarkdownExampleFenceReplacement[] {
  const replacements: MarkdownExampleFenceReplacement[] = [];
  for (const projection of projections) {
    for (const target of projection.targets) {
      if (target.kind !== "markdown" || target.documentId !== documentId) continue;
      const payload = requiredPayload(payloads, projection.id);
      replacements.push(
        Object.freeze({
          headingPath: target.headingPath,
          replacementLines: Object.freeze(fencedTypeScript(payload.content).split("\n"))
        })
      );
    }
  }
  return Object.freeze(replacements);
}

function fencedTypeScript(payload: string): string {
  let fence = "```";
  while (payload.includes(fence)) fence = `${fence}\``;
  return `${fence}ts\n${payload}${fence}`;
}

function requiredPayload(
  payloads: ReadonlyMap<string, ExamplePayload>,
  id: string
): ExamplePayload {
  const payload = payloads.get(id);
  if (payload === undefined) throw new Error(`missing package API example payload: ${id}`);
  return payload;
}

function repositoryFilePath(repositoryRoot: string, repositoryPath: string): string {
  const filePath = resolve(repositoryRoot, repositoryPath);
  const relativePath = relative(repositoryRoot, filePath);
  if (relativePath === "" || relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
    throw new Error(`package API documentation path escapes repository root: ${repositoryPath}`);
  }
  return filePath;
}

function validIdentifier(value: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(value);
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}
