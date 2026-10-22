import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import { collectArtifactFingerprintInputFiles } from "./fingerprint.ts";

/** Copies fingerprint test inputs without workspace-generated state; the caller owns cleanup. */
export function copyArtifactFingerprintFixture(
  roots: Readonly<{ repositoryRoot: string; fixtureRoot: string }>
): void {
  const { repositoryRoot, fixtureRoot } = roots;
  for (const sourcePath of new Set(collectArtifactFingerprintInputFiles(repositoryRoot))) {
    const destinationPath = join(fixtureRoot, relative(repositoryRoot, sourcePath));
    mkdirSync(dirname(destinationPath), { recursive: true });
    copyFileSync(sourcePath, destinationPath);
  }
}
