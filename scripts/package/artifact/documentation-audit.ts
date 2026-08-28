import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { PACKAGE_API_EXAMPLE_PROJECTIONS } from "../../docs/package-api/example-projections.ts";
import {
  collectPackageDocumentation,
  type PackageDocumentationFile
} from "../../docs/package-api/check-guides.ts";
import {
  renderPackageApiDocumentation,
  type RenderedPackageApiDocumentation,
  type RenderedPackageApiFile
} from "../../docs/package-api/render.ts";
import { isPathWithin } from "../../repository-files/paths.ts";
import {
  collectPackageMachineMaterials,
  type PackageMachineMaterial
} from "../../docs/machine-artifacts/package-materials.ts";
import { PACKAGE_README_PATH } from "../package-contract.ts";

export interface ArtifactDocumentation {
  readonly documents: readonly PackageDocumentationFile[];
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly machineMaterials: readonly PackageMachineMaterial[];
  readonly readme: string;
  readonly rendered: RenderedPackageApiDocumentation;
}

/** Reads and validates checked-in package documentation before candidate use. */
export function artifactDocumentation(repositoryRoot: string): ArtifactDocumentation {
  const rendered = renderPackageApiDocumentation({ repositoryRoot });
  const documents = collectPackageDocumentation(repositoryRoot, rendered.markdownDocuments);
  const machineMaterials = collectPackageMachineMaterials(repositoryRoot);
  assertDocumentationMatchesSource(repositoryRoot, rendered);
  return Object.freeze({
    documents,
    expectedJSDocExamplePayloads: jsdocExamplePayloads(rendered),
    machineMaterials,
    readme: rendered.readme.content,
    rendered
  });
}

function assertDocumentationMatchesSource(
  repositoryRoot: string,
  documentation: RenderedPackageApiDocumentation
): void {
  const expectedReadmePath = join(repositoryRoot, PACKAGE_README_PATH);
  if (resolve(documentation.readme.absolutePath) !== expectedReadmePath) {
    throw new Error(
      `documentation operation must render ${expectedReadmePath}; received ${documentation.readme.absolutePath}`
    );
  }
  for (const markdownDocument of documentation.markdownDocuments) {
    if (!isPathWithin(repositoryRoot, markdownDocument.absolutePath)) {
      throw new Error(
        `documentation operation returned Markdown outside the repository: ${markdownDocument.absolutePath}`
      );
    }
    assertFileContentMatches(markdownDocument);
  }
  for (const jsdocSource of documentation.jsdocSources) {
    if (!isPathWithin(repositoryRoot, jsdocSource.absolutePath)) {
      throw new Error(
        `documentation operation returned a JSDoc source outside the repository: ${jsdocSource.absolutePath}`
      );
    }
    assertFileContentMatches(jsdocSource);
  }
}

function assertFileContentMatches(renderedFile: RenderedPackageApiFile): void {
  if (!existsSync(renderedFile.absolutePath)) {
    throw new Error(`checked-in documentation projection is missing: ${renderedFile.absolutePath}`);
  }
  if (readFileSync(renderedFile.absolutePath, "utf8") !== renderedFile.content) {
    throw new Error(`checked-in documentation projection is stale: ${renderedFile.absolutePath}`);
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
