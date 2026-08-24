import { writeFileSync } from "node:fs";

import {
  CANDIDATE_DEPENDENCIES,
  CANDIDATE_NAME,
  PACKAGE_ENTRY_PATH,
  PACKAGE_README_PATH,
  PACKAGE_TYPES_PATH
} from "./fingerprint.ts";

/** Writes the only package manifest projection accepted by the artifact audit. */
export function writeCandidateManifest(manifestPath: string, version: string): void {
  const manifest = {
    name: CANDIDATE_NAME,
    version,
    type: "module",
    exports: {
      ".": {
        types: `./${PACKAGE_TYPES_PATH}`,
        import: `./${PACKAGE_ENTRY_PATH}`
      }
    },
    files: [PACKAGE_ENTRY_PATH, PACKAGE_README_PATH, "types"],
    dependencies: CANDIDATE_DEPENDENCIES
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}
