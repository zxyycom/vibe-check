import {
  snapshotClosedArray,
  snapshotClosedRecord,
  snapshotExactClosedRecord
} from "../../data-boundary/closed-values.ts";
import { isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
import type { ResolvedJsonSchemaValidationOptions } from "./options.ts";

export function validJsonSchemaValidationOptions(
  candidateOptions: unknown
): candidateOptions is ResolvedJsonSchemaValidationOptions {
  const options = snapshotExactClosedRecord(candidateOptions, [
    "files",
    "maximumBytes",
    "schemaIdentity",
    "referenceResolution",
    "schemas",
    "bindings"
  ]);
  if (
    options === undefined ||
    !validProjectFileSelection(options.files) ||
    !isPositiveSafeInteger(options.maximumBytes) ||
    !validJsonSchemaIdentity(options.schemaIdentity) ||
    !validJsonSchemaReferenceResolution(options.referenceResolution)
  ) {
    return false;
  }

  const schemas = snapshotClosedArray(options.schemas);
  const bindings = snapshotClosedArray(options.bindings);
  const declaredSchemaIds = schemas === undefined ? undefined : validatedSchemaRegistryIds(schemas);
  return (
    bindings !== undefined &&
    declaredSchemaIds !== undefined &&
    validJsonSchemaBindings(bindings, declaredSchemaIds)
  );
}

function validJsonSchemaIdentity(candidateIdentity: unknown): boolean {
  const identity = snapshotExactClosedRecord(candidateIdentity, ["mode"]);
  return (
    identity !== undefined &&
    (identity.mode === "require-match" ||
      identity.mode === "configuration-authoritative" ||
      identity.mode === "document-authoritative")
  );
}

function validJsonSchemaReferenceResolution(candidateResolution: unknown): boolean {
  const referenceResolution = snapshotClosedRecord(candidateResolution);
  if (referenceResolution === undefined || typeof referenceResolution.mode !== "string") {
    return false;
  }
  if (referenceResolution.mode === "offline") {
    return snapshotExactClosedRecord(referenceResolution, ["mode"]) !== undefined;
  }
  if (referenceResolution.mode !== "allowlisted") return false;

  const allowlisted = snapshotExactClosedRecord(referenceResolution, ["mode", "sources"]);
  const sources = allowlisted === undefined ? undefined : snapshotClosedArray(allowlisted.sources);
  return sources !== undefined && sources.length > 0 && validJsonSchemaReferenceSources(sources);
}

function validJsonSchemaReferenceSources(sources: readonly unknown[]): boolean {
  const sourceIds = new Set<string>();
  const sourceLocations = new Set<string>();
  let bundledCatalogCount = 0;
  for (const sourceCandidate of sources) {
    const source = validatedReferenceSource(sourceCandidate);
    if (source === undefined) return false;
    if (source.kind === "bundled") {
      bundledCatalogCount += 1;
      if (bundledCatalogCount > 1) return false;
      continue;
    }
    if (sourceIds.has(source.id) || sourceLocations.has(source.location)) return false;
    sourceIds.add(source.id);
    sourceLocations.add(source.location);
  }
  return true;
}

function validatedReferenceSource(sourceCandidate: unknown) {
  const source = snapshotClosedRecord(sourceCandidate);
  if (source === undefined || typeof source.kind !== "string") return undefined;
  if (source.kind === "bundled")
    return validBundledSource(source) ? { kind: "bundled" as const } : undefined;
  if (source.kind !== "https") return undefined;
  const httpsSource = validatedHttpsSource(source);
  return httpsSource === undefined ? undefined : { kind: "https" as const, ...httpsSource };
}

function validBundledSource(source: Readonly<Record<string, unknown>>): boolean {
  return snapshotExactClosedRecord(source, ["kind", "catalog"])?.catalog === "json-schema-2020-12";
}

function validatedHttpsSource(source: Readonly<Record<string, unknown>>) {
  const httpsSource = snapshotExactClosedRecord(source, ["kind", "id", "origin", "pathPrefix"]);
  if (
    httpsSource === undefined ||
    !safeAbsoluteIdentifier(httpsSource.id) ||
    !safeHttpsOrigin(httpsSource.origin) ||
    !safePathPrefix(httpsSource.pathPrefix)
  )
    return undefined;
  return { id: httpsSource.id, location: `${httpsSource.origin}\n${httpsSource.pathPrefix}` };
}

/** Returns declared IDs only after the whole schema registry satisfies its closed authoring invariant. */
function validatedSchemaRegistryIds(schemas: readonly unknown[]): ReadonlySet<string> | undefined {
  const declaredSchemaIds = new Set<string>();
  const schemaPaths = new Set<string>();
  for (const schemaCandidate of schemas) {
    const schemaRecord = snapshotExactClosedRecord(schemaCandidate, ["id", "path"]);
    if (
      schemaRecord === undefined ||
      !safeAbsoluteIdentifier(schemaRecord.id) ||
      !normalizedProjectJsonPath(schemaRecord.path) ||
      declaredSchemaIds.has(schemaRecord.id) ||
      schemaPaths.has(schemaRecord.path)
    ) {
      return undefined;
    }
    declaredSchemaIds.add(schemaRecord.id);
    schemaPaths.add(schemaRecord.path);
  }
  return declaredSchemaIds;
}

function validJsonSchemaBindings(
  bindings: readonly unknown[],
  declaredSchemaIds: ReadonlySet<string>
): boolean {
  const bindingIds = new Set<string>();
  const bindingTargets = new Set<string>();
  for (const bindingCandidate of bindings) {
    const bindingRecord = snapshotExactClosedRecord(bindingCandidate, [
      "id",
      "instancePath",
      "schemaId"
    ]);
    if (
      bindingRecord === undefined ||
      !safeBindingId(bindingRecord.id) ||
      !normalizedProjectJsonPath(bindingRecord.instancePath) ||
      typeof bindingRecord.schemaId !== "string" ||
      !declaredSchemaIds.has(bindingRecord.schemaId) ||
      bindingIds.has(bindingRecord.id)
    ) {
      return false;
    }
    const bindingTarget = `${bindingRecord.instancePath}\n${bindingRecord.schemaId}`;
    if (bindingTargets.has(bindingTarget)) return false;
    bindingIds.add(bindingRecord.id);
    bindingTargets.add(bindingTarget);
  }
  return true;
}

function safeAbsoluteIdentifier(identifier: unknown): identifier is string {
  if (!boundedNonEmptyString(identifier, 256)) return false;
  try {
    const url = new URL(identifier);
    return safeIdentifierUrl(url, identifier);
  } catch {
    return false;
  }
}

function safeIdentifierUrl(url: URL, identifier: string): boolean {
  return (
    (url.protocol === "https:" || url.protocol === "urn:") &&
    url.username.length === 0 &&
    url.password.length === 0 &&
    url.search.length === 0 &&
    url.hash.length === 0 &&
    url.href === identifier
  );
}

function safeHttpsOrigin(origin: unknown): origin is string {
  if (!boundedNonEmptyString(origin, 200)) return false;
  try {
    const url = new URL(origin);
    return safeHttpsOriginUrl(url, origin);
  } catch {
    return false;
  }
}

function safeHttpsOriginUrl(url: URL, origin: string): boolean {
  return (
    url.protocol === "https:" &&
    url.hostname.length > 0 &&
    url.username.length === 0 &&
    url.password.length === 0 &&
    url.search.length === 0 &&
    url.hash.length === 0 &&
    url.pathname === "/" &&
    url.origin === origin
  );
}

function safePathPrefix(pathPrefix: unknown): pathPrefix is string {
  if (!validPathPrefixSyntax(pathPrefix)) return false;
  const segments = pathPrefix.split("/");
  return segments.every(
    (segment, index) => index === 0 || segment === "" || (segment !== "." && segment !== "..")
  );
}

function validPathPrefixSyntax(pathPrefix: unknown): pathPrefix is string {
  return (
    boundedNonEmptyString(pathPrefix, 256) &&
    pathPrefix.startsWith("/") &&
    (pathPrefix === "/" || pathPrefix.endsWith("/")) &&
    !pathPrefix.includes("\\") &&
    !pathPrefix.includes("?") &&
    !pathPrefix.includes("#") &&
    !pathPrefix.includes("//")
  );
}

function boundedNonEmptyString(value: unknown, maximumLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximumLength;
}

function normalizedProjectJsonPath(projectPath: unknown): projectPath is string {
  if (
    typeof projectPath !== "string" ||
    projectPath.length === 0 ||
    projectPath.length > 512 ||
    !projectPath.endsWith(".json") ||
    projectPath.startsWith("/") ||
    projectPath.includes("\\") ||
    projectPath.includes("\u0000")
  ) {
    return false;
  }
  return projectPath
    .split("/")
    .every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function safeBindingId(bindingId: unknown): bindingId is string {
  return typeof bindingId === "string" && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u.test(bindingId);
}
