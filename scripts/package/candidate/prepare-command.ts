import { errorMessage } from "../../foundation/errors.ts";

import { preparePackageCandidate } from "./prepare.ts";

try {
  const prepared = await preparePackageCandidate();
  console.log(
    `prepared ${prepared.candidateVersion} (${prepared.reused ? "reused" : "updated"}) at ${prepared.resolvedEntryPath}`
  );
} catch (error: unknown) {
  console.error(`candidate preparation failed: ${errorMessage(error)}`);
  process.exitCode = 1;
}
