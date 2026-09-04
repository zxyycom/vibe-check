import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  processFailureFromResult,
  runProcessSync,
  writeProcessOutput,
  type RunProcessSyncOptions
} from "../../process-execution/execution.ts";
import { runMain } from "../../process-execution/command.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Explicit physical candidate lifecycle integration; routine Gate test discovery does not select it. */
export const PACKAGE_CANDIDATE_INTEGRATION_INVOCATION = Object.freeze({
  args: Object.freeze([
    "test",
    resolve(repositoryRoot, "scripts/package/candidate/candidate.integration.ts"),
    "--reporter=dots"
  ]),
  command: process.execPath,
  cwd: repositoryRoot,
  timeout: 30_000
} satisfies RunProcessSyncOptions);

export function runPackageCandidateIntegration(): void {
  const result = runProcessSync(PACKAGE_CANDIDATE_INTEGRATION_INVOCATION);
  writeProcessOutput(result);
  const failure = processFailureFromResult(result);
  if (failure) throw failure;
}

if (import.meta.main) runMain(runPackageCandidateIntegration);
