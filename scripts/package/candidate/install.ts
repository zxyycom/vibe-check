import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  if (!isPrivateCandidateConsumer(consumerDirectory)) {
    throw new Error(
      `candidate consumer ${consumerDirectory} must provide a package.json with private: true before local installation`
    );
  }
  // This directory is a dedicated private candidate consumer. Replacing its whole
  // install prevents Bun from satisfying a missing candidate dependency through
  // an ancestor node_modules directory.
  rmSync(join(consumerDirectory, "node_modules"), { force: true, recursive: true });
  runBun({
    args: ["install", "--no-save", "--ignore-scripts", artifactPath],
    cwd: consumerDirectory,
    phase: `install candidate in ${consumerDirectory}`
  });
  const installation = inspectInstallation({
    candidateVersion,
    consumerDirectory,
    expectedJSDocExamplePayloads,
    expectedReadme
  });
  if (installation === undefined) {
    throw new Error(
      `candidate installation did not resolve ${CANDIDATE_NAME} with its declared ${JSCPD_PACKAGE_NAME} dependency from ${consumerDirectory}`
    );
  }
  return installation;
}

/** Inspects a candidate without accepting an ancestor package or dependency fallback. */
export function inspectInstallation(input: {
  readonly candidateVersion: string;
  readonly consumerDirectory: string;
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedReadme: string;
}): InstalledCandidate | undefined {
  const { candidateVersion, consumerDirectory, expectedJSDocExamplePayloads, expectedReadme } =
    input;
  const packageDirectory = join(consumerDirectory, "node_modules", CANDIDATE_NAME);
  const manifestPath = join(packageDirectory, "package.json");
  if (!existsSync(manifestPath)) return undefined;
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return undefined;
  }
  if (
    !isNonArrayRecord(manifest) ||
    manifest.name !== CANDIDATE_NAME ||
    manifest.version !== candidateVersion
  ) {
    return undefined;
  }
  let resolvedEntryPath: string;
  try {
    const resolvedUrl = runBun({
      args: ["-e", "process.stdout.write(import.meta.resolve(process.argv[1]))", CANDIDATE_NAME],
      cwd: consumerDirectory,
      phase: `resolve candidate in ${consumerDirectory}`
    }).trim();
    resolvedEntryPath = fileURLToPath(resolvedUrl);
  } catch {
    return undefined;
  }
  if (!existsSync(resolvedEntryPath) || !isPathWithin(packageDirectory, resolvedEntryPath)) {
    return undefined;
  }
  const readmePath = join(packageDirectory, "README.md");
  if (!existsSync(readmePath) || readFileSync(readmePath, "utf8") !== expectedReadme) {
    return undefined;
  }
  try {
    assertJSDocExamplePayloads({
      declarationSources: collectFiles(join(packageDirectory, "types"), (path) =>
        path.endsWith(".d.ts")
      ).map((path) => readFileSync(path, "utf8")),
      description: "installed candidate declarations",
      expectedPayloads: expectedJSDocExamplePayloads
    });
  } catch {
    return undefined;
  }
  if (!hasCandidateJscpdDependency(consumerDirectory, resolvedEntryPath)) return undefined;
  return Object.freeze({
    installedPackageDirectory: packageDirectory,
    resolvedEntryPath,
    resolvedEntrySha256: sha256File(resolvedEntryPath)
  });
}

function isPrivateCandidateConsumer(consumerDirectory: string): boolean {
  const manifestPath = join(consumerDirectory, "package.json");
  if (!existsSync(manifestPath)) return false;
  try {
    const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
    return isNonArrayRecord(manifest) && manifest.private === true;
  } catch {
    return false;
  }
}

function hasCandidateJscpdDependency(
  consumerDirectory: string,
  candidateEntryPath: string
): boolean {
  let packageManifestPath: string;
  try {
    packageManifestPath = runBun({
      args: [
        "-e",
        "import { createRequire } from 'node:module'; process.stdout.write(createRequire(process.argv[1]).resolve('jscpd/package.json'))",
        candidateEntryPath
      ],
      cwd: consumerDirectory,
      phase: `resolve declared ${JSCPD_PACKAGE_NAME} dependency in ${consumerDirectory}`
    }).trim();
  } catch {
    return false;
  }
  if (!isPathWithin(join(consumerDirectory, "node_modules"), packageManifestPath)) return false;

  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(packageManifestPath, "utf8"));
  } catch {
    return false;
  }
  if (
    !isNonArrayRecord(manifest) ||
    manifest.name !== JSCPD_PACKAGE_NAME ||
    manifest.version !== CANDIDATE_DEPENDENCIES.jscpd
  ) {
    return false;
  }

  const binTarget = declaredJscpdBinTarget(manifest.bin);
  if (binTarget === undefined) return false;
  const packageDirectory = dirname(packageManifestPath);
  const binPath = resolve(packageDirectory, binTarget);
  return isPathWithin(packageDirectory, binPath) && existsSync(binPath);
}

function declaredJscpdBinTarget(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!isNonArrayRecord(value)) return undefined;
  const target = value[JSCPD_BIN_NAME];
  return typeof target === "string" ? target : undefined;
}
