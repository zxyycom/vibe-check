import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

import { errorMessage } from "../../error-message.ts";
import { isNonArrayRecord } from "../../value-guards.ts";
import {
  AJV_PACKAGE_NAME,
  JSCPD_PACKAGE_NAME,
  MARKDOWNLINT_PACKAGE_NAME
} from "../package-contract.ts";

/** Resolves dependency evidence from the already-resolved candidate entry. */
export function candidateInstallationProbe(candidateEntryUrl: string) {
  const requireFromCandidate = createRequire(fileURLToPath(candidateEntryUrl));
  return {
    candidateEntryUrl,
    ajvPackageManifestPath: requireFromCandidate.resolve(`${AJV_PACKAGE_NAME}/package.json`),
    jscpdPackageManifestPath: requireFromCandidate.resolve(`${JSCPD_PACKAGE_NAME}/package.json`),
    markdownlintPackageManifestPath: owningMarkdownlintManifest(
      requireFromCandidate.resolve(MARKDOWNLINT_PACKAGE_NAME)
    )
  };
}

/** Finds the nearest package boundary of the resolved entry, never an ancestor fallback. */
function owningMarkdownlintManifest(entryPath: string): string {
  let directory = dirname(entryPath);
  while (directory !== parse(directory).root) {
    const manifestPath = join(directory, "package.json");
    let source: string;
    try {
      source = readFileSync(manifestPath, "utf8");
    } catch (error: unknown) {
      if (isNonArrayRecord(error) && error.code === "ENOENT") {
        directory = dirname(directory);
        continue;
      }
      throw new Error(
        `could not read resolved markdownlint package manifest ${manifestPath}: ${errorMessage(error)}`,
        { cause: error }
      );
    }
    let manifest: unknown;
    try {
      manifest = JSON.parse(source);
    } catch (error: unknown) {
      throw new Error(
        `could not parse resolved markdownlint package manifest ${manifestPath}: ${errorMessage(error)}`,
        { cause: error }
      );
    }
    if (!isNonArrayRecord(manifest) || manifest.name !== MARKDOWNLINT_PACKAGE_NAME) {
      throw new Error(`resolved markdownlint package identity mismatch: ${manifestPath}`);
    }
    return manifestPath;
  }
  throw new Error(`resolved markdownlint package manifest not found for entry: ${entryPath}`);
}
