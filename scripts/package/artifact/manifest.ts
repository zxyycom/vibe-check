import { writeFileSync } from "node:fs";

import {
  CANDIDATE_DEPENDENCIES,
  CANDIDATE_NAME,
  PACKAGE_DISTRIBUTION_DIRECTORY,
  PACKAGE_ENTRY_PATH,
  PACKAGE_README_PATH,
  PACKAGE_SOURCE_DIRECTORY,
  PACKAGE_TYPES_DIRECTORY,
  PACKAGE_TYPES_PATH
} from "./package-contract.ts";

/** Writes the only package manifest projection accepted by the artifact audit. */
export function writeCandidateManifest(input: {
  readonly manifestPath: string;
  readonly version: string;
}): void {
  const manifest = {
    name: CANDIDATE_NAME,
    version: input.version,
    type: "module",
    exports: {
      ".": {
        types: `./${PACKAGE_TYPES_PATH}`,
        import: `./${PACKAGE_ENTRY_PATH}`
      }
    },
    files: [
      PACKAGE_ENTRY_PATH,
      PACKAGE_README_PATH,
      PACKAGE_DISTRIBUTION_DIRECTORY,
      PACKAGE_TYPES_DIRECTORY,
      PACKAGE_SOURCE_DIRECTORY
    ],
    dependencies: CANDIDATE_DEPENDENCIES
  };
  writeFileSync(input.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}
