import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PACKAGE_API_EXAMPLE_PROJECTIONS } from "./example-projections.ts";
import { loadPackageDocuments, PACKAGE_DOCUMENTS_CONFIG_PATH } from "../package-documents.ts";

type PackageApiJSDocTarget = Readonly<{
  readonly declarationName: string;
  readonly sourcePath: string;
}>;

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export const PACKAGE_API_JSDOC_TARGETS: readonly PackageApiJSDocTarget[] = Object.freeze(
  PACKAGE_API_EXAMPLE_PROJECTIONS.flatMap((projection) =>
    projection.targets.flatMap((target) =>
      target.kind === "jsdoc"
        ? [
            Object.freeze({
              declarationName: target.declarationName,
              sourcePath: target.sourcePath
            })
          ]
        : []
    )
  )
);

export function createPackageApiDocumentationFixture(): string {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-package-api-docs-"));
  copyFixtureFile(fixtureRoot, PACKAGE_DOCUMENTS_CONFIG_PATH);
  const documents = loadPackageDocuments(repositoryRoot);
  for (const document of documents.markdownDocuments) {
    copyFixtureFile(fixtureRoot, document.sourcePath);
  }
  for (const guide of documents.checkGuides) copyFixtureFile(fixtureRoot, guide.sourcePath);
  for (const material of documents.machineMaterials)
    copyFixtureFile(fixtureRoot, material.sourcePath);
  for (const projection of PACKAGE_API_EXAMPLE_PROJECTIONS) {
    copyFixtureFile(fixtureRoot, projection.sourcePath);
  }
  for (const target of PACKAGE_API_JSDOC_TARGETS) writeJSDocTargetFixture(fixtureRoot, target);
  return fixtureRoot;
}

function writeJSDocTargetFixture(fixtureRoot: string, target: PackageApiJSDocTarget): void {
  const sourcePath = join(fixtureRoot, target.sourcePath);
  mkdirSync(dirname(sourcePath), { recursive: true });
  writeFileSync(
    sourcePath,
    [
      "/**",
      ` * Defines ${target.declarationName}.`,
      " */",
      `export function ${target.declarationName}() { return {}; }`,
      ""
    ].join("\n"),
    "utf8"
  );
}

function copyFixtureFile(fixtureRoot: string, repositoryPath: string): void {
  const destination = join(fixtureRoot, repositoryPath);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(join(repositoryRoot, repositoryPath), destination);
}
