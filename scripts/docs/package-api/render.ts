import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  PACKAGE_API_EXAMPLE_PROJECTIONS,
  type PackageApiExampleProjection
} from "./example-projections.ts";
import {
  loadPackageDocuments,
  repositoryPath,
  type PackageMarkdownDocument
} from "../package-documents.ts";
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

export interface RenderedPackageMarkdownDocument extends RenderedPackageApiFile {
  readonly documentId: string;
  readonly packagePath: string;
}

export interface RenderedPackageApiDocumentation {
  readonly jsdocSources: readonly RenderedPackageApiFile[];
  readonly markdownDocuments: readonly RenderedPackageMarkdownDocument[];
  readonly readme: RenderedPackageMarkdownDocument;
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
  const documents = loadPackageDocuments(repositoryRoot).markdownDocuments;
  const payloads = collectExamplePayloads(repositoryRoot, projections);
  const markdownDocuments = renderMarkdownDocuments(
    repositoryRoot,
    documents,
    projections,
    payloads
  );
  const readme = markdownDocuments.find((document) => document.documentId === README_DOCUMENT_ID);
  if (readme === undefined) throw new Error("package API documentation is missing its README");
  const jsdocSources = renderJSDocSources(repositoryRoot, projections, payloads);
  return Object.freeze({ jsdocSources, markdownDocuments, readme });
}

function renderMarkdownDocuments(
  repositoryRoot: string,
  documents: readonly PackageMarkdownDocument[],
  projections: readonly PackageApiExampleProjection[],
  payloads: ReadonlyMap<string, ExamplePayload>
): readonly RenderedPackageMarkdownDocument[] {
  return Object.freeze(
    documents.map((document) =>
      renderMarkdownDocument(repositoryRoot, document, projections, payloads)
    )
  );
}

function renderMarkdownDocument(
  repositoryRoot: string,
  document: PackageMarkdownDocument,
  projections: readonly PackageApiExampleProjection[],
  payloads: ReadonlyMap<string, ExamplePayload>
): RenderedPackageMarkdownDocument {
  const filePath = repositoryPath(
    repositoryRoot,
    document.sourcePath,
    "package Markdown source path"
  );
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

function readText(path: string): string {
  return readFileSync(path, "utf8");
}
