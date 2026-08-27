import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isPathWithin } from "../../repository-files/paths.ts";
import { assertExternalConsumerCommandSucceeded } from "./external-consumer-command-result.ts";
import {
  resolveCandidateAcceptanceArtifact,
  type CandidateAcceptanceArtifact
} from "./acceptance-input.ts";
import { writeExternalConsumerDocumentationFixture } from "./isolated-consumer-documentation.ts";
import { writeExternalConsumerRuntimeFixture } from "./isolated-consumer-runtime.ts";
import { writeExternalConsumerTypesFixture } from "./isolated-consumer-types.ts";
import { readGateExternalConsumerMaterial } from "./external-consumer-input.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Invocation-local isolated install shared only by Gate external-consumer Checks. */
export interface ExternalConsumerMaterial extends CandidateAcceptanceArtifact {
  readonly consumerDirectory: string;
  readonly installedPackageDirectory: string;
  readonly resolvedEntryPath: string;
}

/** Resolves one Gate-owned install or a direct-test-only local fixture. */
export async function resolveExternalConsumerMaterial(): Promise<
  Readonly<{ readonly cleanup: boolean; readonly material: ExternalConsumerMaterial }>
> {
  const gateMaterial = readGateExternalConsumerMaterial();
  if (gateMaterial !== undefined) return Object.freeze({ cleanup: false, material: gateMaterial });
  const artifact = await resolveCandidateAcceptanceArtifact();
  return Object.freeze({ cleanup: true, material: prepareExternalConsumerMaterial(artifact) });
}

/** Creates one ancestry-external consumer and verifies only shared install identity facts. */
export function prepareExternalConsumerMaterial(
  artifact: CandidateAcceptanceArtifact,
  options: Readonly<{ readonly consumerDirectory?: string }> = {}
): ExternalConsumerMaterial {
  if (options.consumerDirectory !== undefined && existsSync(options.consumerDirectory)) {
    throw new TypeError("external consumer setup directory must not already exist");
  }
  const consumerDirectory =
    options.consumerDirectory ?? mkdtempSync(join(tmpdir(), "vibe-check-isolated-consumer-"));
  try {
    writeExternalConsumerFixture(consumerDirectory);
    installCandidate(consumerDirectory, artifact.artifactPath);
    const resolvedEntryPath = resolvePublicEntry(consumerDirectory);
    const installedPackageDirectory = join(consumerDirectory, "node_modules", "vibe-check");
    const material = {
      ...artifact,
      consumerDirectory,
      installedPackageDirectory,
      resolvedEntryPath
    };
    assertExternalConsumerInstallationIdentity(material);
    return Object.freeze(material);
  } catch (error: unknown) {
    rmSync(consumerDirectory, { force: true, recursive: true });
    throw error;
  }
}

/** Releases the provider-owned temporary consumer after the Gate Run settles. */
export function cleanupExternalConsumerMaterial(
  material: Pick<ExternalConsumerMaterial, "consumerDirectory">
): void {
  rmSync(material.consumerDirectory, { force: true, recursive: true });
}

/** Verifies the shared physical isolated-install boundary without accepting package documentation. */
export function assertExternalConsumerInstallationIdentity(
  material: ExternalConsumerMaterial
): void {
  assert.equal(isAbsolute(material.artifactPath), true);
  assert.equal(isPathWithin(repositoryRoot, material.consumerDirectory), false);
  assert.equal(isPathWithin(material.installedPackageDirectory, material.resolvedEntryPath), true);
  assert.equal(isPathWithin(repositoryRoot, material.resolvedEntryPath), false);
}

function writeExternalConsumerFixture(consumerDirectory: string): void {
  writePackageManifest(consumerDirectory, "vibe-check-isolated-consumer");
  writeExternalConsumerTypesFixture(consumerDirectory);
  writeExternalConsumerDocumentationFixture(consumerDirectory, repositoryRoot);
  writeExternalConsumerRuntimeFixture(consumerDirectory);
}

function writePackageManifest(consumerDirectory: string, name: string): void {
  mkdirSync(consumerDirectory, { recursive: true });
  writeFileSync(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify({ name, private: true, type: "module" })}\n`,
    "utf8"
  );
}

function installCandidate(consumerDirectory: string, artifactPath: string): void {
  const result = spawnSync(
    process.execPath,
    ["install", "--no-save", "--ignore-scripts", artifactPath],
    { cwd: consumerDirectory, encoding: "utf8" }
  );
  assertExternalConsumerCommandSucceeded(result, "isolated bun install");
}

function resolvePublicEntry(consumerDirectory: string): string {
  const result = spawnSync(
    process.execPath,
    ["-e", "process.stdout.write(import.meta.resolve(process.argv[1]))", "vibe-check"],
    { cwd: consumerDirectory, encoding: "utf8" }
  );
  assertExternalConsumerCommandSucceeded(result, "isolated public-entry resolution");
  const resolved = result.stdout.trim();
  assert.equal(resolved.startsWith("file:"), true, `expected file URL, received ${resolved}`);
  return fileURLToPath(resolved);
}
