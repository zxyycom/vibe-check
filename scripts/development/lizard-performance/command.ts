/** Explicit developer-only comparison. It is intentionally absent from package.json and Project Gate. */
import { parseArguments } from "./arguments.ts";
import { runComparison } from "./comparison.ts";

export { parseArguments } from "./arguments.ts";
export { runComparison } from "./comparison.ts";
export { assertStableOutputDigest, statisticalWallMs, temperatureArguments } from "./sampling.ts";
export { isSupportedSupervisorPlatform, parseChildResult } from "./target-evidence.ts";
export { parseWorkloadManifest } from "./workload.ts";

if (import.meta.main) runComparison(parseArguments(process.argv.slice(2)));
