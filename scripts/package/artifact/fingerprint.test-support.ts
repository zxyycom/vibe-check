import { cpSync } from "node:fs";
import { basename, join } from "node:path";

/** Copies fingerprint test inputs without workspace-generated state; the caller owns cleanup. */
export function copyArtifactFingerprintFixture(
  roots: Readonly<{ repositoryRoot: string; fixtureRoot: string }>
): void {
  const { repositoryRoot, fixtureRoot } = roots;
  const workspaceScratchRoot = join(repositoryRoot, "tmp");
  cpSync(repositoryRoot, fixtureRoot, {
    dereference: false,
    recursive: true,
    filter: (source) =>
      // Exclude only root scratch evidence, not same-named directories within source inputs.
      source !== workspaceScratchRoot &&
      ![".cache", ".codegraph", ".git", ".log", "build", "node_modules"].includes(basename(source))
  });
}
