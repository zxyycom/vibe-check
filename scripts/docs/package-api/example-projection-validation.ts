import {
  PACKAGE_API_MARKDOWN_DOCUMENTS,
  type PackageApiExampleProjection,
  type PackageApiExampleTarget
} from "./example-projections.ts";

const EXAMPLE_DIRECTORY = "docs/examples/package-api";

export function assertProjection(projection: PackageApiExampleProjection): void {
  assertProjectionFields(projection);
  assertUniqueProjectionTargets(projection);
}

function assertProjectionFields(projection: PackageApiExampleProjection): void {
  if (!validIdentifier(projection.id)) {
    throw new Error(`invalid package API example projection id: ${projection.id}`);
  }
  if (projection.evidence !== "runtime" && projection.evidence !== "typecheck") {
    throw new Error(`missing package API example evidence: ${projection.id}`);
  }
  if (
    !projection.sourcePath.startsWith(`${EXAMPLE_DIRECTORY}/`) ||
    !projection.sourcePath.endsWith(".ts")
  ) {
    throw new Error(`invalid package API example source path: ${projection.sourcePath}`);
  }
  if (projection.regionId !== undefined && !validIdentifier(projection.regionId)) {
    throw new Error(`invalid package API example region id: ${projection.regionId}`);
  }
  if (projection.title.trim().length === 0) {
    throw new Error(`missing package API example title: ${projection.id}`);
  }
  if (projection.targets.length === 0) {
    throw new Error(`missing package API example target: ${projection.id}`);
  }
}

function assertUniqueProjectionTargets(projection: PackageApiExampleProjection): void {
  const targetKeys = new Set<string>();
  for (const target of projection.targets) {
    assertTarget(target, projection.id);
    const targetKey = projectionTargetKey(target);
    if (targetKeys.has(targetKey)) {
      throw new Error(`duplicate package API example target: ${projection.id}`);
    }
    targetKeys.add(targetKey);
  }
}

export function assertTarget(target: PackageApiExampleTarget, projectionId: string): void {
  if (target.kind === "markdown") {
    if (
      !validIdentifier(target.documentId) ||
      !isValidHeadingPath(target.headingPath) ||
      !PACKAGE_API_MARKDOWN_DOCUMENTS.some((document) => document.id === target.documentId)
    ) {
      throw new Error(`invalid package API Markdown example target: ${projectionId}`);
    }
    return;
  }
  if (
    !target.sourcePath.startsWith("src/") ||
    !target.sourcePath.endsWith(".ts") ||
    !validTypeScriptIdentifier(target.declarationName)
  ) {
    throw new Error(`invalid package API JSDoc target: ${projectionId}`);
  }
}

function projectionTargetKey(target: PackageApiExampleTarget): string {
  return target.kind === "markdown"
    ? `markdown#${markdownTargetKey(target.documentId, target.headingPath)}`
    : `jsdoc#${target.sourcePath}#${target.declarationName}`;
}

export function markdownTargetKey(documentId: string, headingPath: readonly string[]): string {
  return `${documentId}#${JSON.stringify(headingPath)}`;
}

function isValidHeadingPath(value: unknown): value is readonly string[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  for (const [index, heading] of value.entries()) {
    if (
      !Object.hasOwn(value, index) ||
      typeof heading !== "string" ||
      heading.length === 0 ||
      heading.trim() !== heading
    )
      return false;
  }
  return true;
}

function validIdentifier(value: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(value);
}

function validTypeScriptIdentifier(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}
