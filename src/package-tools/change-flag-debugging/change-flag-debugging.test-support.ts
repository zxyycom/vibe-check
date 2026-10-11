import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { write } from "../../project-run/changes/git.test-support.ts";
import type { DebugChangeFlagsOptions } from "./change-flag-debugging.ts";

export function fixture(paths: readonly string[]): string {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-debug-flags-"));
  for (const path of paths) write(root, path, "fixture\n");
  return root;
}

export function options(projectRoot: string): DebugChangeFlagsOptions {
  return {
    projectRoot,
    selection: { patterns: ["**/*"] },
    regions: { source: { patterns: ["src/**"] }, empty: { patterns: [] } }
  };
}
