import { CURRENT_PUBLIC_CONTRACT } from "../../../src/contract/public-api.ts";

export const CANDIDATE_NAME = "vibe-check";
export const JSCPD_BIN_NAME = "jscpd";
export const JSCPD_PACKAGE_NAME = "jscpd";

export const CANDIDATE_DEPENDENCIES = Object.freeze({
  "csv-parse": "7.0.1",
  execa: "9.6.1",
  jscpd: "5.0.11",
  minimatch: "10.2.5",
  neverthrow: "8.2.0",
  typebox: "1.3.9"
});

export const PACKAGE_DISTRIBUTION_DIRECTORY = "dist";
export const PACKAGE_ENTRY_PATH = "index.mjs";
export const PACKAGE_README_PATH = "README.md";
export const PACKAGE_RUNTIME_DIRECTORY = `${PACKAGE_DISTRIBUTION_DIRECTORY}/esm`;
export const PACKAGE_RUNTIME_ENTRY_PATH = `${PACKAGE_RUNTIME_DIRECTORY}/index.mjs`;
export const PACKAGE_SOURCE_DIRECTORY = "src";
export const PACKAGE_TYPES_DIRECTORY = "types";
export const PACKAGE_TYPES_PATH = `${PACKAGE_TYPES_DIRECTORY}/index.d.ts`;
export const PACKAGE_ENTRY_SOURCE = `export * from "./${PACKAGE_RUNTIME_ENTRY_PATH}";\n`;

export const RUNTIME_EXPORTS = Object.freeze(
  [
    ...Object.values(CURRENT_PUBLIC_CONTRACT.operations),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.values)
  ].sort()
);
