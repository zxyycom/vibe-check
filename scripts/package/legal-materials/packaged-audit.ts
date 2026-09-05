import { createHash } from "node:crypto";

import {
  PACKAGE_LIZARD_APACHE_LICENSE_PATH,
  PACKAGE_LIZARD_MIT_LICENSE_PATH,
  PACKAGE_MOMOA_LICENSE_PATH,
  PACKAGE_PYGMENTS_LICENSE_PATH,
  PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH
} from "../package-contract.ts";
import {
  TRANSLATED_ANALYZER_LIZARD_REVISION,
  type ProvenanceEntry
} from "./provenance-inventory.ts";
import type { PackagedLegalMaterial, PackagedLegalMaterialAccess } from "../legal-materials.ts";

const TRANSLATED_SOURCE_HEADER = "Derived from terryyin/lizard 1.24.0.";
const SPDX_LICENSES = Object.freeze(["Apache-2.0", "BSD-2-Clause", "MIT"] as const);
const SPDX_LICENSE_SET: ReadonlySet<string> = new Set(SPDX_LICENSES);
const DEFERRED_EXTENSION_BODY_COUNT = 20;
const DEFERRED_EXTENSION_SUPPORT_COUNT = 2;

export function assertExactLegalMaterialBytes(
  access: PackagedLegalMaterialAccess,
  materials: readonly PackagedLegalMaterial[]
): void {
  for (const material of materials) {
    if (!access.hasFile(material.path)) {
      throw new Error(
        `candidate package is missing translated-analyzer legal material: ${material.path}`
      );
    }
    if (sha256(access.readFile(material.path)) !== material.sha256) {
      throw new Error(
        `candidate translated-analyzer legal material differs from its approved bytes: ${material.path}`
      );
    }
  }
}

export function assertTranslatedTargetHeaders(
  access: PackagedLegalMaterialAccess,
  translatedByTarget: ReadonlyMap<string, readonly ProvenanceEntry[]>
): void {
  for (const [targetPath, entries] of translatedByTarget) {
    if (!access.hasFile(targetPath)) {
      throw new Error(`candidate package is missing translated analyzer target: ${targetPath}`);
    }
    const header = leadingBlockComment(access.readFile(targetPath), targetPath);
    assertSourceHeaderIdentity(header, targetPath);
    assertHeaderProvenance(access, header, targetPath, entries);
  }
}

export function assertNoUntrackedTranslatedSourceHeaders(
  access: PackagedLegalMaterialAccess,
  translatedByTarget: ReadonlyMap<string, readonly ProvenanceEntry[]>
): void {
  for (const packagePath of access.files) {
    if (!packagePath.startsWith("src/") || !packagePath.endsWith(".ts")) continue;
    const source = access.readFile(packagePath).toString("utf8");
    if (source.startsWith("/**") && source.includes(TRANSLATED_SOURCE_HEADER)) {
      if (!translatedByTarget.has(packagePath)) {
        throw new Error(
          `packaged translated analyzer header has no provenance target entry: ${packagePath}`
        );
      }
    }
  }
}

export function assertDeferredExtensionBodiesRemainUnshipped(
  access: PackagedLegalMaterialAccess,
  entries: readonly ProvenanceEntry[]
): void {
  const deferred = entries.filter((entry) => entry.status === "deferred-extension-body");
  if (deferred.length !== DEFERRED_EXTENSION_BODY_COUNT + DEFERRED_EXTENSION_SUPPORT_COUNT) {
    throw new Error("translated-analyzer deferred extension closure drifted");
  }
  for (const entry of deferred) {
    if (entry.targetPath === undefined) {
      throw new Error(
        `deferred translated-analyzer source lacks target identity: ${entry.sourcePath}`
      );
    }
    const runtimePath = emittedRuntimePath(entry.targetPath);
    if (access.hasFile(entry.targetPath) || access.hasFile(runtimePath)) {
      throw new Error(
        `deferred translated-analyzer extension body must not be shipped: ${entry.sourcePath}`
      );
    }
  }
}

export function assertNoticeSummarizesFixedSources(source: Buffer): void {
  const notice = source.toString("utf8");
  for (const requiredText of [
    TRANSLATED_ANALYZER_LIZARD_REVISION,
    "Lizard 1.24.0",
    "Apache-2.0",
    "Pygments 2.18.0",
    "BSD-2-Clause",
    "20 remaining Lizard concrete extension bodies",
    "`lizardhalstead` entry body",
    "two extension-only Halstead support modules",
    PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_PATH,
    PACKAGE_MOMOA_LICENSE_PATH
  ]) {
    if (!notice.includes(requiredText)) {
      throw new Error(
        `translated-analyzer third-party notices omit required material: ${requiredText}`
      );
    }
  }
}

function assertSourceHeaderIdentity(header: string, targetPath: string): void {
  if (!header.includes(TRANSLATED_SOURCE_HEADER)) throwMissingSourceHeader(targetPath);
  if (!header.includes(`Upstream revision: ${TRANSLATED_ANALYZER_LIZARD_REVISION}.`)) {
    throwMissingSourceHeader(targetPath);
  }
  if (!header.includes("Modified:")) throwMissingSourceHeader(targetPath);
}

function throwMissingSourceHeader(targetPath: string): never {
  throw new Error(
    `translated analyzer target lacks source/revision/modified header: ${targetPath}`
  );
}

function assertHeaderProvenance(
  access: PackagedLegalMaterialAccess,
  header: string,
  targetPath: string,
  entries: readonly ProvenanceEntry[]
): void {
  const headerSpdx = spdxIdentifiers(header, targetPath);
  for (const entry of entries) {
    if (!header.includes(entry.sourcePath)) {
      throw new Error(
        `translated analyzer header does not identify provenance source ${entry.sourcePath}: ${targetPath}`
      );
    }
    if (!headerSpdx.has(entry.spdx)) {
      throw new Error(
        `translated analyzer header does not carry ${entry.spdx} from ${entry.sourcePath}: ${targetPath}`
      );
    }
  }
  for (const identifier of headerSpdx) assertPhysicalLicenseForSpdx(access, identifier, targetPath);
}

function assertPhysicalLicenseForSpdx(
  access: PackagedLegalMaterialAccess,
  identifier: string,
  targetPath: string
): void {
  const path = physicalLicensePath(identifier);
  if (path === undefined || !access.hasFile(path)) {
    throw new Error(
      `translated analyzer SPDX ${identifier} has no physical license: ${targetPath}`
    );
  }
}

function physicalLicensePath(identifier: string): string | undefined {
  switch (identifier) {
    case "MIT":
      return PACKAGE_LIZARD_MIT_LICENSE_PATH;
    case "Apache-2.0":
      return PACKAGE_LIZARD_APACHE_LICENSE_PATH;
    case "BSD-2-Clause":
      return PACKAGE_PYGMENTS_LICENSE_PATH;
    default:
      return undefined;
  }
}

function leadingBlockComment(source: Buffer, targetPath: string): string {
  const text = source.toString("utf8");
  if (!text.startsWith("/**")) {
    throw new Error(`translated analyzer target must start with a source header: ${targetPath}`);
  }
  const end = text.indexOf("*/");
  if (end === -1) {
    throw new Error(`translated analyzer target has an unterminated source header: ${targetPath}`);
  }
  return text.slice(0, end + 2);
}

function spdxIdentifiers(header: string, targetPath: string): ReadonlySet<string> {
  const match = /SPDX-License-Identifier:\s*([^\r\n*]+)/u.exec(header);
  if (match === null)
    throw new Error(`translated analyzer target lacks an SPDX header: ${targetPath}`);
  const identifiers = match[1].trim().split(" AND ");
  if (
    identifiers.length === 0 ||
    identifiers.some((identifier) => !SPDX_LICENSE_SET.has(identifier))
  ) {
    throw new Error(`translated analyzer target has an unsupported SPDX expression: ${targetPath}`);
  }
  return new Set(identifiers);
}

function emittedRuntimePath(sourcePath: string): string {
  if (!sourcePath.startsWith("src/") || !sourcePath.endsWith(".ts")) {
    throw new Error(
      `translated-analyzer target path is not a package TypeScript source: ${sourcePath}`
    );
  }
  return `dist/esm/${sourcePath.slice("src/".length, -".ts".length)}.mjs`;
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
