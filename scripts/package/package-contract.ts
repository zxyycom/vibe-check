import { CURRENT_PUBLIC_CONTRACT } from "./public-api-inventory.ts";

export const PACKAGE_NAME = CURRENT_PUBLIC_CONTRACT.packageImport;
/** Exact filesystem-safe stem emitted by Bun when it packs {@link PACKAGE_NAME}. */
export const PACKAGE_TARBALL_STEM = "zxyycom-vibe-check";
export const PACKAGE_BUN_ENGINE = ">=1.3.14";
/** SPDX expression for the complete shipped work, including translated analyzer ranges. */
export const PACKAGE_LICENSE = "MIT AND Apache-2.0 AND BSD-2-Clause";
export const PACKAGE_LICENSE_PATH = "LICENSE";
export const PACKAGE_LICENSE_SHA256 =
  "2c005fcd357a0fd2f0136a9cbb3b80645ace42b186368c8ffe144b2912bb107a";
export const PACKAGE_LICENSE_SOURCE_PATH = "LICENSE";
export const PACKAGE_PUBLISH_ACCESS = "public";
export const PACKAGE_PUBLISH_REGISTRY = "https://registry.npmjs.org/";
export const PACKAGE_REPOSITORY_MANIFEST_URL = "git+https://github.com/zxyycom/vibe-check.git";
export const AJV_PACKAGE_NAME = "ajv";
export const JSCPD_BIN_NAME = "jscpd";
export const JSCPD_PACKAGE_NAME = "jscpd";
export const JSCPD_VERSION_RANGE = "^5.1.1";

export const CANDIDATE_DEPENDENCIES = Object.freeze({
  "@humanwhocodes/momoa": "3.3.12",
  "@secretlint/core": "13.0.5",
  "@secretlint/secretlint-rule-privatekey": "13.0.5",
  [AJV_PACKAGE_NAME]: "8.20.0",
  "csv-parse": "7.0.1",
  execa: "9.6.1",
  "github-slugger": "2.0.0",
  immutable: "5.1.9",
  [JSCPD_PACKAGE_NAME]: JSCPD_VERSION_RANGE,
  "mdast-util-from-markdown": "2.0.3",
  "mdast-util-frontmatter": "2.0.1",
  "mdast-util-gfm": "3.1.0",
  "micromark-extension-frontmatter": "2.0.0",
  "micromark-extension-gfm": "3.0.0",
  minimatch: "10.2.5",
  neverthrow: "8.2.0",
  typebox: "1.3.9"
});

export const PACKAGE_DOCUMENTATION_DIRECTORY = "docs";
export const PACKAGE_DISTRIBUTION_DIRECTORY = "dist";
export const PACKAGE_ENTRY_PATH = "index.mjs";
export const PACKAGE_IMMUTABLE_LICENSE_PATH = "third-party-licenses/immutable-5.1.9-LICENSE";
export const PACKAGE_FUNCTION_METRICS_WORKER_SOURCE_PATH =
  "src/package-checks/function-metrics/analyzer-worker.ts";
export const PACKAGE_FUNCTION_METRICS_WORKER_RUNTIME_PATH =
  "dist/esm/package-checks/function-metrics/analyzer-worker.mjs";
export const PACKAGE_FUNCTION_METRICS_MEASUREMENT_RUNTIME_PATH =
  "dist/esm/package-checks/function-metrics/measurement.mjs";
export const PACKAGE_MOMOA_LICENSE_PATH = "third-party-licenses/momoa-3.3.12-LICENSE";
export const PACKAGE_SECRETLINT_LICENSE_PATH = "third-party-licenses/secretlint-13.0.5-MIT-LICENSE";
export const PACKAGE_README_PATH = "README.md";
export const PACKAGE_RUNTIME_DIRECTORY = `${PACKAGE_DISTRIBUTION_DIRECTORY}/esm`;
export const PACKAGE_RUNTIME_ENTRY_PATH = `${PACKAGE_RUNTIME_DIRECTORY}/index.mjs`;
export const PACKAGE_SOURCE_DIRECTORY = "src";
export const PACKAGE_THIRD_PARTY_LICENSES_DIRECTORY = "third-party-licenses";
export const PACKAGE_THIRD_PARTY_NOTICES_PATH = "THIRD_PARTY_NOTICES.md";
export const PACKAGE_TYPES_DIRECTORY = "types";
export const PACKAGE_TYPES_PATH = `${PACKAGE_TYPES_DIRECTORY}/index.d.ts`;
export const PACKAGE_ENTRY_SOURCE = `export * from "./${PACKAGE_RUNTIME_ENTRY_PATH}";\n`;
/** Explicit tsgo roots; Worker code is not reachable through a static import from `src/index.ts`. */
export const PACKAGE_RUNTIME_COMPILER_SOURCE_PATHS = Object.freeze([
  "src/index.ts",
  PACKAGE_FUNCTION_METRICS_WORKER_SOURCE_PATH
]);

export const PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH = "licenses/lizard-1.24.0-provenance.json";
export const PACKAGE_LIZARD_MIT_LICENSE_PATH = "licenses/Lizard-1.24.0-MIT.txt";
export const PACKAGE_LIZARD_APACHE_LICENSE_PATH = "licenses/Lizard-1.24.0-lizard.py-Apache-2.0.txt";
export const PACKAGE_PYGMENTS_LICENSE_PATH = "licenses/Pygments-2.18.0-BSD-2-Clause.txt";
export const PACKAGE_TRANSLATED_ANALYZER_LICENSES_DIRECTORY = "licenses";

export const PACKAGE_THIRD_PARTY_NOTICES_SHA256 =
  "76e071c61a6bbe3bc94d03d1a4c357301988e153e42a49ebd81137308777305d";
export const PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_SHA256 =
  "f973ceea173a5eae638810523141110a9b3bee780ef53299561ea8ab818e4041";
export const PACKAGE_LIZARD_MIT_LICENSE_SHA256 =
  "d39663810f02975743f69d01856f93c7391ce6b842a20189544b9fd464f663f3";
export const PACKAGE_LIZARD_APACHE_LICENSE_SHA256 =
  "cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30";
export const PACKAGE_PYGMENTS_LICENSE_SHA256 =
  "a9d66f1d526df02e29dce73436d34e56e8632f46c275bbdffc70569e882f9f17";

export const PACKAGE_MANIFEST_FILES = Object.freeze([
  PACKAGE_ENTRY_PATH,
  PACKAGE_LICENSE_PATH,
  PACKAGE_README_PATH,
  PACKAGE_THIRD_PARTY_NOTICES_PATH,
  PACKAGE_DOCUMENTATION_DIRECTORY,
  PACKAGE_DISTRIBUTION_DIRECTORY,
  PACKAGE_TRANSLATED_ANALYZER_LICENSES_DIRECTORY,
  PACKAGE_TYPES_DIRECTORY,
  PACKAGE_SOURCE_DIRECTORY,
  PACKAGE_THIRD_PARTY_LICENSES_DIRECTORY
]);

/** Exact MIT text from Immutable.js 5.1.9's published package. */
export const IMMUTABLE_LICENSE_SHA256 =
  "784fd7232e106901065a329b285ff9ba9ad98ff08ac1932b45b53a0b954974c5";
export const IMMUTABLE_LICENSE_SOURCE_PATH =
  "scripts/package/artifact/third-party-licenses/immutable-5.1.9-LICENSE";
/** Exact Apache-2.0 text from Momoa's `momoa-js-v3.3.12` source tag. */
export const MOMOA_LICENSE_SHA256 =
  "c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4";
export const MOMOA_LICENSE_SOURCE_PATH =
  "scripts/package/artifact/third-party-licenses/momoa-3.3.12-LICENSE";
export const SECRETLINT_LICENSE_SHA256 =
  "e52f20f13c0107521b01a47e7b7adbee09ff72289299fbb500375cdd8311cc83";
export const SECRETLINT_LICENSE_SOURCE_PATH =
  "scripts/package/artifact/third-party-licenses/secretlint-13.0.5-MIT-LICENSE";

/** Third-party texts that must ship with every candidate and formal receipt. */
export const PACKAGE_THIRD_PARTY_LICENSES = Object.freeze([
  Object.freeze({
    packageName: "immutable",
    path: PACKAGE_IMMUTABLE_LICENSE_PATH,
    sha256: IMMUTABLE_LICENSE_SHA256,
    sourcePath: IMMUTABLE_LICENSE_SOURCE_PATH
  }),
  Object.freeze({
    packageName: "@humanwhocodes/momoa",
    path: PACKAGE_MOMOA_LICENSE_PATH,
    sha256: MOMOA_LICENSE_SHA256,
    sourcePath: MOMOA_LICENSE_SOURCE_PATH
  }),
  Object.freeze({
    packageName: "Secretlint",
    path: PACKAGE_SECRETLINT_LICENSE_PATH,
    sha256: SECRETLINT_LICENSE_SHA256,
    sourcePath: SECRETLINT_LICENSE_SOURCE_PATH
  })
]);

export const RUNTIME_EXPORTS = Object.freeze(
  [
    ...Object.values(CURRENT_PUBLIC_CONTRACT.defaults),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.operations),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.parsers)
  ].sort()
);
