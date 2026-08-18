import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  processFailure,
  runProcessSync,
  writeProcessOutput
} from "../tools/foundation/src/process.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const scanEntryPath = fileURLToPath(new URL("./scan.ts", import.meta.url));

function runRepositoryQuality(): number {
  try {
    // Resolve `bun` inside mise: process.execPath may point to an ambient Bun installation.
    const result = runProcessSync({
      args: ["exec", "--", "bun", scanEntryPath],
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
