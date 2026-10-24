import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import { isNonArrayRecord, isStringArray } from "../../value-guards.ts";
import { fileMatchesSha256, isSha256Digest, sha256File } from "../pack.ts";
import type { CandidateAcceptanceArtifact } from "../candidate/acceptance-input.ts";
import type { PackageDocumentationExpectation } from "./documentation-audit.ts";

const DOCUMENTATION_PATH_ENV = "VIBE_CHECK_PACKAGE_DOCUMENTATION_PATH";
const DOCUMENTATION_SHA256_ENV = "VIBE_CHECK_PACKAGE_DOCUMENTATION_SHA256";
const DOCUMENTATION_INPUT_FINGERPRINT_ENV = "VIBE_CHECK_PACKAGE_DOCUMENTATION_INPUT_FINGERPRINT";

/** Private process input; document bodies never enter Check data or command stdout. */
export interface PackageDocumentationInput {
  readonly path: string;
  readonly sha256: string;
  readonly inputFingerprint: string;
}

/** Writes only the source expectations already computed during this candidate preparation. */
export function writePackageDocumentationInput(input: {
  readonly artifact: CandidateAcceptanceArtifact & { readonly inputFingerprint: string };
  readonly documentation: PackageDocumentationExpectation;
  readonly path: string;
  readonly repositoryRoot: string;
}): PackageDocumentationInput {
  const { documentation } = input;
  writeFileSync(
    input.path,
    JSON.stringify({
      artifactPath: input.artifact.artifactPath,
      artifactSha256: input.artifact.sha256,
      inputFingerprint: input.artifact.inputFingerprint,
      repositoryRoot: resolve(input.repositoryRoot),
      documents: documentation.documents,
      expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
      machineMaterials: documentation.machineMaterials.map((material) => ({
        ...material,
        content: material.content.toString("base64")
      })),
      readme: documentation.readme
    }),
    "utf8"
  );
  return Object.freeze({
    path: resolve(input.path),
    sha256: sha256File(input.path),
    inputFingerprint: input.artifact.inputFingerprint
  });
}

/** Binds a child to one invocation-local source snapshot, not a cross-invocation cache. */
export function packageDocumentationEnvironment(
  input: PackageDocumentationInput
): Readonly<Record<string, string>> {
  return Object.freeze({
    [DOCUMENTATION_PATH_ENV]: input.path,
    [DOCUMENTATION_SHA256_ENV]: input.sha256,
    [DOCUMENTATION_INPUT_FINGERPRINT_ENV]: input.inputFingerprint
  });
}

/** Rejects missing, damaged or unrelated Gate input before comparing any package bytes. */
export function readPackageDocumentationInput(input: {
  readonly artifact: CandidateAcceptanceArtifact;
  readonly repositoryRoot: string;
  readonly environment?: NodeJS.ProcessEnv;
}): PackageDocumentationExpectation | undefined {
  const descriptor = readDocumentationInputEnvironment(input.environment ?? process.env);
  if (descriptor === undefined) return undefined;
  const snapshot: unknown = JSON.parse(readFileSync(descriptor.path, "utf8"));
  if (!isNonArrayRecord(snapshot) || !matchesDocumentationCandidate(snapshot, input, descriptor)) {
    throw new TypeError("package documentation input does not match its candidate identity");
  }
  return parseDocumentationExpectation(snapshot);
}

function readDocumentationInputEnvironment(
  environment: NodeJS.ProcessEnv
): PackageDocumentationInput | undefined {
  const path = environment[DOCUMENTATION_PATH_ENV];
  const sha256 = environment[DOCUMENTATION_SHA256_ENV];
  const inputFingerprint = environment[DOCUMENTATION_INPUT_FINGERPRINT_ENV];
  if (path === undefined && sha256 === undefined && inputFingerprint === undefined)
    return undefined;
  if (
    path === undefined ||
    !isAbsolute(path) ||
    !isSha256Digest(sha256) ||
    !isSha256Digest(inputFingerprint) ||
    !fileMatchesSha256(path, sha256)
  ) {
    throw new TypeError("package documentation input is incomplete or invalid");
  }
  return Object.freeze({ path, sha256, inputFingerprint });
}

function matchesDocumentationCandidate(
  snapshot: Readonly<Record<string, unknown>>,
  input: Readonly<{
    readonly artifact: CandidateAcceptanceArtifact;
    readonly repositoryRoot: string;
  }>,
  descriptor: PackageDocumentationInput
): boolean {
  return (
    snapshot.artifactPath === input.artifact.artifactPath &&
    snapshot.artifactSha256 === input.artifact.sha256 &&
    snapshot.inputFingerprint === descriptor.inputFingerprint &&
    snapshot.repositoryRoot === resolve(input.repositoryRoot)
  );
}

function parseDocumentationExpectation(
  snapshot: Readonly<Record<string, unknown>>
): PackageDocumentationExpectation {
  if (
    !Array.isArray(snapshot.documents) ||
    !Array.isArray(snapshot.machineMaterials) ||
    !isStringArray(snapshot.expectedJSDocExamplePayloads) ||
    typeof snapshot.readme !== "string"
  ) {
    throw new TypeError("package documentation input has an invalid material shape");
  }
  return Object.freeze({
    documents: Object.freeze(
      snapshot.documents.map((document: unknown) => {
        if (
          !isNonArrayRecord(document) ||
          !isPackagePath(document.packagePath) ||
          typeof document.content !== "string"
        ) {
          throw new TypeError("package documentation input has an invalid document");
        }
        return Object.freeze({ content: document.content, packagePath: document.packagePath });
      })
    ),
    machineMaterials: Object.freeze(
      snapshot.machineMaterials.map((material: unknown) => {
        if (
          !isNonArrayRecord(material) ||
          !isPackagePath(material.packagePath) ||
          typeof material.sourcePath !== "string" ||
          typeof material.content !== "string"
        ) {
          throw new TypeError("package documentation input has an invalid machine material");
        }
        const content = Buffer.from(material.content, "base64");
        if (content.toString("base64") !== material.content) {
          throw new TypeError("package documentation input has invalid machine material bytes");
        }
        return Object.freeze({
          content,
          packagePath: material.packagePath,
          sourcePath: material.sourcePath
        });
      })
    ),
    expectedJSDocExamplePayloads: Object.freeze([...snapshot.expectedJSDocExamplePayloads]),
    readme: snapshot.readme
  });
}

function isPackagePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    !isAbsolute(value) &&
    !value.includes("\\") &&
    value.split("/").every((part) => part !== "" && part !== "." && part !== "..")
  );
}
