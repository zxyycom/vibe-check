import { readdirSync } from "node:fs";
import { join } from "node:path";

const CANONICAL_NAMES = ["records.ndjson", "run.json"] as const;
const RETIRED_NAMES = [
  "metrics.json",
  "report.md",
  "warnings-all.ndjson",
  "warnings.ndjson"
] as const;
const OWNED_TEMP_PREFIX = ".vibe-check-publication-";

export interface PublicationCleanupPlanV4 {
  readonly canonicalPaths: readonly string[];
  readonly ownedTempPaths: readonly string[];
  readonly retiredPaths: readonly string[];
}

export function planPublicationCleanupV4(artifactDir: string): PublicationCleanupPlanV4 {
  const entries = readdirSync(artifactDir, { withFileTypes: true });
  return Object.freeze({
    canonicalPaths: Object.freeze(CANONICAL_NAMES.map((name) => join(artifactDir, name))),
    retiredPaths: Object.freeze(RETIRED_NAMES.map((name) => join(artifactDir, name))),
    ownedTempPaths: Object.freeze(
      entries
        .filter((entry) => entry.name.startsWith(OWNED_TEMP_PREFIX))
        .map((entry) => join(artifactDir, entry.name))
        .sort()
    )
  });
}
