import { CURRENT_PUBLIC_CONTRACT } from "./public-api-inventory.ts";

export const PACKAGE_NAME = CURRENT_PUBLIC_CONTRACT.packageImport;
/** Exact filesystem-safe stem emitted by Bun when it packs {@link PACKAGE_NAME}. */
export const PACKAGE_TARBALL_STEM = "zxyycom-vibe-check";
export const PACKAGE_BUN_ENGINE = ">=1.3.14";
export const PACKAGE_LICENSE = "MIT";
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
export const PACKAGE_MOMOA_LICENSE_PATH = "third-party-licenses/momoa-3.3.12-LICENSE";
export const PACKAGE_README_PATH = "README.md";
export const PACKAGE_RUNTIME_DIRECTORY = `${PACKAGE_DISTRIBUTION_DIRECTORY}/esm`;
export const PACKAGE_RUNTIME_ENTRY_PATH = `${PACKAGE_RUNTIME_DIRECTORY}/index.mjs`;
export const PACKAGE_SOURCE_DIRECTORY = "src";
export const PACKAGE_THIRD_PARTY_LICENSES_DIRECTORY = "third-party-licenses";
export const PACKAGE_TYPES_DIRECTORY = "types";
export const PACKAGE_TYPES_PATH = `${PACKAGE_TYPES_DIRECTORY}/index.d.ts`;
export const PACKAGE_ENTRY_SOURCE = `export * from "./${PACKAGE_RUNTIME_ENTRY_PATH}";\n`;

export const PACKAGE_MANIFEST_FILES = Object.freeze([
  PACKAGE_ENTRY_PATH,
  PACKAGE_LICENSE_PATH,
  PACKAGE_README_PATH,
  PACKAGE_DOCUMENTATION_DIRECTORY,
  PACKAGE_DISTRIBUTION_DIRECTORY,
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
  })
]);

export const RUNTIME_EXPORTS = Object.freeze(
  [
    ...Object.values(CURRENT_PUBLIC_CONTRACT.defaults),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.operations),
    ...Object.values(CURRENT_PUBLIC_CONTRACT.parsers)
  ].sort()
);
