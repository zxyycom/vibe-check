import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { errorMessage } from "../error-message.ts";
import { preparePackageInstallationCache } from "./installation.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** The only package command that explicitly permits network cache preparation. */
export function runPackageCacheCommand(
  argv: readonly string[],
  prepare: () => void = () => {
    preparePackageInstallationCache({ repositoryRoot });
  }
): void {
  if (argv.length !== 0) throw new Error("usage: bun run package:cache:prepare");
  prepare();
}

if (import.meta.main) {
  try {
    runPackageCacheCommand(process.argv.slice(2));
    console.log("package installation cache prepared; acceptance installs remain strictly offline");
  } catch (error: unknown) {
    console.error(`package cache preparation failed: ${errorMessage(error)}`);
    process.exitCode = 1;
  }
}
