import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { processFailure, runProcessSync, writeProcessOutput } from "../../foundation/process.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const lockedRunPath = fileURLToPath(new URL("./locked-run.ts", import.meta.url));

/** Starts the repository-owned locked quality workflow without parsing caller input. */
function runRepositoryQuality(): number {
  try {
    // Resolve `bun` inside mise: process.execPath may point to an ambient Bun installation.
    const result = runProcessSync({
      args: ["exec", "--", "bun", lockedRunPath],
      command: "mise",
      cwd: repositoryRoot
    });
    writeProcessOutput(result);
    if (result.error) return pinnedToolCommandFailure(result.error);
    if (result.status !== null) return result.status;
    return pinnedToolCommandFailure(
      new Error(`pinned tool command terminated by signal ${result.signal ?? "unknown"}`)
    );
  } catch (error) {
    return pinnedToolCommandFailure(error);
  }
}

function pinnedToolCommandFailure(error: unknown): number {
  const failure = processFailure(error);
  console.error(`repository quality could not run its pinned tool command: ${failure.message}`);
  return typeof failure.code === "number" ? failure.code : 1;
}

if (import.meta.main) {
  process.exitCode = runRepositoryQuality();
}
