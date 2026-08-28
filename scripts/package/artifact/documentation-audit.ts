import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { PACKAGE_API_EXAMPLE_PROJECTIONS } from "../../docs/package-api/example-projections.ts";
import {
  collectPackageDocumentation,
  type PackageDocumentationFile
} from "../../docs/package-api/check-guides.ts";
import {
  renderPackageApiDocumentation,
  type RenderedPackageApiDocumentation
} from "../../docs/package-api/render.ts";
import { isPathWithin } from "../../repository-files/paths.ts";
import { PACKAGE_README_PATH } from "../package-contract.ts";

export interface ArtifactDocumentation {
  readonly documents: readonly PackageDocumentationFile[];
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly readme: string;
  readonly rendered: RenderedPackageApiDocumentation;
}

/** Reads and validates checked-in package documentation before candidate use. */
export function artifactDocumentation(repositoryRoot: string): ArtifactDocumentation {
  const rendered = renderPackageApiDocumentation({ repositoryRoot });
  const documents = collectPackageDocumentation(repositoryRoot, rendered.markdownDocuments);
  assertDocumentationMatchesSource(repositoryRoot, rendered);
  return Object.freeze({
    documents,
    expectedJSDocExamplePayloads: jsdocExamplePayloads(rendered),
    readme: rendered.readme.content,
    rendered
  });
}

function assertDocumentationMatchesSource(
  repositoryRoot: string,
  documentation: RenderedPackageApiDocumentation
): void {
  const expectedReadmePath = join(repositoryRoot, PACKAGE_README_PATH);
  if (resolve(documentation.readme.path) !== expectedReadmePath) {
    throw new Error(
      `documentation operation must render ${expectedReadmePath}; received ${documentation.readme.path}`
    );
  }
  for (const markdownDocument of documentation.markdownDocuments) {
    if (!isPathWithin(repositoryRoot, markdownDocument.path)) {
      throw new Error(
        `documentation operation returned Markdown outside the repository: ${markdownDocument.path}`
      );
    }
    assertFileContentMatches(markdownDocument);
  }
  for (const jsdocSource of documentation.jsdocSources) {
    if (!isPathWithin(repositoryRoot, jsdocSource.path)) {
      throw new Error(
        `documentation operation returned a JSDoc source outside the repository: ${jsdocSource.path}`
      );
    }
    assertFileContentMatches(jsdocSource);
  }
}

function assertFileContentMatches(
  expected: Readonly<{ readonly content: string; readonly path: string }>
): void {
  if (!existsSync(expected.path)) {
    throw new Error(`checked-in documentation projection is missing: ${expected.path}`);
  }
  if (readFileSync(expected.path, "utf8") !== expected.content) {
    throw new Error(`checked-in documentation projection is stale: ${expected.path}`);
  }
}

function jsdocExamplePayloads(documentation: RenderedPackageApiDocumentation): readonly string[] {
  const payloads = documentation.jsdocSources.flatMap(({ content }) =>
    [...content.matchAll(/@example[^\n]*\n \* ```ts\n([\s\S]*?)\n \* ```/g)].map((match) =>
      match[1]
        .split("\n")
        .map((line) => line.replace(/^ \* ?/, ""))
        .join("\n")
    )
  );
  const expectedPayloadCount = PACKAGE_API_EXAMPLE_PROJECTIONS.reduce(
    (count, projection) =>
      count + projection.targets.filter((target) => target.kind === "jsdoc").length,
    0
  );
  if (payloads.length !== expectedPayloadCount) {
    throw new Error(
      "documentation operation did not provide every registry-managed JSDoc example payload"
    );
  }
  return Object.freeze(payloads);
}
