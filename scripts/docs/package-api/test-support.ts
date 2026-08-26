import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PACKAGE_API_EXAMPLE_PROJECTIONS,
  PACKAGE_CHECK_GUIDE_INDEX_PATH,
  PACKAGE_CHECK_GUIDES
} from "./registry.ts";

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
  copyFixtureFile(fixtureRoot, "docs/package-readme.template.md");
  copyFixtureFile(fixtureRoot, PACKAGE_CHECK_GUIDE_INDEX_PATH);
  for (const guide of PACKAGE_CHECK_GUIDES) copyFixtureFile(fixtureRoot, guide.sourcePath);
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
