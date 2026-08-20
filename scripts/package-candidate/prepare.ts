import { preparePackageCandidate } from "./index.ts";

try {
  const prepared = await preparePackageCandidate();
  console.log(
    `prepared ${prepared.candidateVersion} (${prepared.reused ? "reused" : "updated"}) at ${prepared.resolvedEntryPath}`
  );
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`candidate preparation failed: ${message}`);
  process.exitCode = 1;
}
