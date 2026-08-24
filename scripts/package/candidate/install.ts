import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { errorMessage } from "../../foundation/errors.ts";
import { isPathWithin } from "../../foundation/path.ts";
import { isNonArrayRecord } from "../../foundation/type-guards.ts";
import { assertJSDocExamplePayloads } from "../artifact/audit.ts";
import {
  CANDIDATE_DEPENDENCIES,
  CANDIDATE_NAME,
  collectFiles,
  JSCPD_BIN_NAME,
  JSCPD_PACKAGE_NAME
} from "../artifact/fingerprint.ts";
import { runBun, sha256File } from "../artifact/pack.ts";
import type { InstalledCandidate } from "./receipt.ts";

/** Replaces the dedicated private install and verifies the exact installed package entry. */
export function installCandidate(input: {
  readonly artifactPath: string;
  readonly candidateVersion: string;
  readonly consumerDirectory: string;
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedReadme: string;
}): InstalledCandidate {
  const {
    artifactPath,
    candidateVersion,
    consumerDirectory,
    expectedJSDocExamplePayloads,
    expectedReadme
  } = input;
  assertPrivateCandidateConsumer(consumerDirectory);
  // This directory is a dedicated private candidate consumer. Replacing its whole
  // install prevents Bun from satisfying a missing candidate dependency through
  // an ancestor node_modules directory.
  rmSync(join(consumerDirectory, "node_modules"), { force: true, recursive: true });
  runBun({
    args: ["install", "--no-save", "--ignore-scripts", artifactPath],
    cwd: consumerDirectory,
    phase: `install candidate in ${consumerDirectory}`
  });
  return verifyInstallation({
    candidateVersion,
    consumerDirectory,
    expectedJSDocExamplePayloads,
    expectedReadme
  });
}

/** Inspects a candidate without accepting an ancestor package or dependency fallback. */
export function inspectInstallation(input: {
  readonly candidateVersion: string;
  readonly consumerDirectory: string;
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedReadme: string;
}): InstalledCandidate | undefined {
  try {
    return verifyInstallation(input);
  } catch {
    return undefined;
  }
}

/** Strictly validates a fresh install while retaining every failed validation stage. */
function verifyInstallation(input: {
  readonly candidateVersion: string;
  readonly consumerDirectory: string;
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedReadme: string;
}): InstalledCandidate {
  const { candidateVersion, consumerDirectory, expectedJSDocExamplePayloads, expectedReadme } =
    input;
  const packageDirectory = join(consumerDirectory, "node_modules", CANDIDATE_NAME);
  const manifestPath = join(packageDirectory, "package.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`installed candidate package manifest is missing: ${manifestPath}`);
  }
  const manifest = readJsonFile(manifestPath, "installed candidate package manifest");
  if (
    !isNonArrayRecord(manifest) ||
    manifest.name !== CANDIDATE_NAME ||
    manifest.version !== candidateVersion
  ) {
    throw new Error(
      `installed candidate package manifest must declare ${CANDIDATE_NAME}@${candidateVersion}: ${manifestPath}`
    );
  }
  const resolvedUrl = runBun({
    args: ["-e", "process.stdout.write(import.meta.resolve(process.argv[1]))", CANDIDATE_NAME],
    cwd: consumerDirectory,
    phase: `resolve candidate in ${consumerDirectory}`
  }).trim();
  let resolvedEntryPath: string;
  try {
    resolvedEntryPath = fileURLToPath(resolvedUrl);
  } catch (error: unknown) {
    throw new Error(
      `candidate entry resolution returned an invalid file URL from ${consumerDirectory}: ${errorMessage(error)}`,
      { cause: error }
    );
  }
  if (!existsSync(resolvedEntryPath)) {
    throw new Error(`candidate entry resolved to a missing path: ${resolvedEntryPath}`);
  }
  if (!isPathWithin(packageDirectory, resolvedEntryPath)) {
    throw new Error(`candidate entry resolved outside its installed package: ${resolvedEntryPath}`);
  }
  const readmePath = join(packageDirectory, "README.md");
  if (!existsSync(readmePath)) {
    throw new Error(`installed candidate README is missing: ${readmePath}`);
  }
  let readme: string;
  try {
    readme = readFileSync(readmePath, "utf8");
  } catch (error: unknown) {
    throw new Error(
      `could not read installed candidate README ${readmePath}: ${errorMessage(error)}`,
      { cause: error }
    );
  }
  if (readme !== expectedReadme) {
    throw new Error(
      `installed candidate README differs from the expected package documentation: ${readmePath}`
    );
  }
  try {
    assertJSDocExamplePayloads({
      declarationSources: collectFiles(join(packageDirectory, "types"), (path) =>
        path.endsWith(".d.ts")
      ).map((path) => readFileSync(path, "utf8")),
      description: "installed candidate declarations",
      expectedPayloads: expectedJSDocExamplePayloads
    });
  } catch (error: unknown) {
    throw new Error(`installed candidate declaration validation failed: ${errorMessage(error)}`, {
      cause: error
    });
  }
  verifyCandidateJscpdDependency(consumerDirectory, resolvedEntryPath);
  return Object.freeze({
    installedPackageDirectory: packageDirectory,
    resolvedEntryPath,
    resolvedEntrySha256: sha256File(resolvedEntryPath)
  });
}

function assertPrivateCandidateConsumer(consumerDirectory: string): void {
  const manifestPath = join(consumerDirectory, "package.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`private candidate consumer package manifest is missing: ${manifestPath}`);
  }
  const manifest = readJsonFile(manifestPath, "private candidate consumer package manifest");
  if (!isNonArrayRecord(manifest) || manifest.private !== true) {
    throw new Error(`candidate consumer must set private: true in ${manifestPath}`);
  }
}

function verifyCandidateJscpdDependency(
  consumerDirectory: string,
  candidateEntryPath: string
): void {
  const packageManifestPath = runBun({
    args: [
      "-e",
      "import { createRequire } from 'node:module'; process.stdout.write(createRequire(process.argv[1]).resolve('jscpd/package.json'))",
      candidateEntryPath
    ],
    cwd: consumerDirectory,
    phase: `resolve declared ${JSCPD_PACKAGE_NAME} dependency in ${consumerDirectory}`
  }).trim();
  if (!isPathWithin(join(consumerDirectory, "node_modules"), packageManifestPath)) {
    throw new Error(
      `candidate ${JSCPD_PACKAGE_NAME} dependency resolved outside private consumer node_modules: ${packageManifestPath}`
    );
  }

  const manifest = readJsonFile(
    packageManifestPath,
    `resolved ${JSCPD_PACKAGE_NAME} package manifest`
  );
  if (
    !isNonArrayRecord(manifest) ||
    manifest.name !== JSCPD_PACKAGE_NAME ||
    manifest.version !== CANDIDATE_DEPENDENCIES.jscpd
  ) {
    throw new Error(
      `resolved ${JSCPD_PACKAGE_NAME} package manifest must declare ${JSCPD_PACKAGE_NAME}@${CANDIDATE_DEPENDENCIES.jscpd}: ${packageManifestPath}`
    );
  }

  const binTarget = declaredJscpdBinTarget(manifest.bin);
  if (binTarget === undefined) {
    throw new Error(
      `resolved ${JSCPD_PACKAGE_NAME} package manifest does not declare its ${JSCPD_BIN_NAME} bin: ${packageManifestPath}`
    );
  }
  const packageDirectory = dirname(packageManifestPath);
  const binPath = resolve(packageDirectory, binTarget);
  if (!isPathWithin(packageDirectory, binPath)) {
    throw new Error(`resolved ${JSCPD_PACKAGE_NAME} bin escapes its package directory: ${binPath}`);
  }
  if (!existsSync(binPath)) {
    throw new Error(`resolved ${JSCPD_PACKAGE_NAME} bin is missing: ${binPath}`);
  }
}

function readJsonFile(filePath: string, description: string): unknown {
  let source: string;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (error: unknown) {
    throw new Error(`could not read ${description} ${filePath}: ${errorMessage(error)}`, {
      cause: error
    });
  }
  try {
    return JSON.parse(source);
  } catch (error: unknown) {
    throw new Error(`could not parse ${description} ${filePath}: ${errorMessage(error)}`, {
      cause: error
    });
  }
}

function declaredJscpdBinTarget(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!isNonArrayRecord(value)) return undefined;
  const target = value[JSCPD_BIN_NAME];
  return typeof target === "string" ? target : undefined;
}
