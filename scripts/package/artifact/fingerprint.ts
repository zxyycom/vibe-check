import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { CURRENT_PUBLIC_CONTRACT } from "../../../src/contract/public-api.ts";

export const CANDIDATE_NAME = "vibe-check";
export const JSCPD_BIN_NAME = "jscpd";
export const JSCPD_PACKAGE_NAME = "jscpd";
export const CANDIDATE_DEPENDENCIES = Object.freeze({
  jscpd: "5.0.11",
  neverthrow: "8.2.0",
  typebox: "1.3.9"
});
export const PACKAGE_ENTRY_PATH = "index.mjs";
export const PACKAGE_TYPES_PATH = "types/index.d.ts";
export const PACKAGE_README_PATH = "README.md";

const DOCUMENTATION_INPUT_PATHS = Object.freeze([
  "docs/package-readme.template.md",
  "scripts/docs/package-api/registry.ts",
  "scripts/docs/package-api/render.ts"
]);
const DOCUMENTATION_EXAMPLES_DIRECTORY = "docs/examples/package-api";

export const RUNTIME_EXPORTS = Object.freeze(
  [
    ...Object.values(CURRENT_PUBLIC_CONTRACT.operations),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.values)
  ].sort()
);

/** Returns the deterministic source fingerprint that binds one local candidate version. */
export function createArtifactFingerprint(repositoryRoot: string): string {
  const hash = createHash("sha256");
  hash.update(`bun=${bunVersion()}\0`);
  hash.update(`candidate-dependencies=${JSON.stringify(CANDIDATE_DEPENDENCIES)}\0`);

  const inputFiles = [
    ...collectRuntimeSourceFiles(join(repositoryRoot, "src")),
    ...documentationInputFiles(repositoryRoot),
    ...collectPackageSourceFiles(repositoryRoot)
  ].sort();
  for (const filePath of inputFiles) {
    const relativePath = relative(repositoryRoot, filePath).split(sep).join("/");
    hash.update(relativePath);
    hash.update("\0");
    hash.update(readFileSync(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function collectFiles(
  root: string,
  include: (relativePath: string) => boolean
): readonly string[] {
  if (!existsSync(root)) return Object.freeze([]);
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const filePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(filePath);
      } else if (entry.isFile()) {
        const relativePath = relative(root, filePath).split(sep).join("/");
        if (include(relativePath)) files.push(filePath);
      }
    }
  };
  visit(root);
  return Object.freeze(files.sort());
}

function collectRuntimeSourceFiles(sourceRoot: string): readonly string[] {
  return collectFiles(
    sourceRoot,
    (relativePath) =>
      relativePath.endsWith(".ts") &&
      !relativePath.endsWith(".test.ts") &&
      !relativePath.endsWith(".test-support.ts") &&
      !relativePath.endsWith("bun-test.d.ts")
  );
}

function collectPackageSourceFiles(repositoryRoot: string): readonly string[] {
  return collectFiles(
    join(repositoryRoot, "scripts/package"),
    (relativePath) => relativePath.endsWith(".ts") && !relativePath.endsWith(".test.ts")
  );
}

function documentationInputFiles(repositoryRoot: string): readonly string[] {
  return Object.freeze([
    ...DOCUMENTATION_INPUT_PATHS.map((path) => join(repositoryRoot, path)),
    ...collectFiles(join(repositoryRoot, DOCUMENTATION_EXAMPLES_DIRECTORY), (path) =>
      path.endsWith(".ts")
    )
  ]);
}

function bunVersion(): string {
  const version = process.versions.bun;
  if (typeof version !== "string" || version.length === 0) {
    throw new Error("candidate preparation requires a Bun runtime with a reported version");
  }
  return version;
}
