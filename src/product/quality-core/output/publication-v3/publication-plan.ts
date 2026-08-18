import { readdirSync } from "node:fs";
import { join } from "node:path";

const CANONICAL_NAMES = ["records.ndjson", "report.md", "run.json"] as const;
const RETIRED_NAMES = ["metrics.json", "warnings-all.ndjson", "warnings.ndjson"] as const;
const OWNED_TEMP_PREFIX = ".vibe-check-publication-";

export interface PublicationCleanupPlanV3 {
  readonly canonicalPaths: readonly string[];
  readonly ownedTempPaths: readonly string[];
  readonly retiredPaths: readonly string[];
}

export function planPublicationCleanupV3(artifactDir: string): PublicationCleanupPlanV3 {
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
