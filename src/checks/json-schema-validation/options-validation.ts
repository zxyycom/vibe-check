/* eslint-disable no-unused-vars */
import { snapshotClosedArray, snapshotClosedRecord } from "../../foundation/closed-values.ts";
import { validProjectFileSelection } from "../../project-files/configuration.ts";
function exactRecord(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const record = snapshotClosedRecord(value);
  return record !== undefined &&
    Object.keys(record).length === keys.length &&
    keys.every((key) => Object.hasOwn(record, key))
    ? record
    : undefined;
}
function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function positiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function boundedPositiveSafeInteger(value: unknown, maximum: number): value is number {
  return positiveSafeInteger(value) && value <= maximum;
}
function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
function validStringArray(value: unknown): boolean {
  const items = snapshotClosedArray(value);
  return items !== undefined && items.every((item) => typeof item === "string");
}
export function validJsonSchemaValidationOptions(candidateOptions: object): boolean {
  const options = exactRecord(candidateOptions, [
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
    !positiveSafeInteger(options.maximumBytes) ||
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
  const identity = exactRecord(candidateIdentity, ["mode"]);
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
    return exactRecord(referenceResolution, ["mode"]) !== undefined;
  }
  if (referenceResolution.mode !== "allowlisted") return false;

  const allowlisted = exactRecord(referenceResolution, ["mode", "sources"]);
  const sources = allowlisted === undefined ? undefined : snapshotClosedArray(allowlisted.sources);
  return sources !== undefined && sources.length > 0 && validJsonSchemaReferenceSources(sources);
}

function validJsonSchemaReferenceSources(sources: readonly unknown[]): boolean {
  const sourceIds = new Set<string>();
  const sourceLocations = new Set<string>();
  let bundledCatalogCount = 0;
  for (const sourceCandidate of sources) {
    const sourceRecord = snapshotClosedRecord(sourceCandidate);
    if (sourceRecord === undefined || typeof sourceRecord.kind !== "string") return false;
    if (sourceRecord.kind === "bundled") {
      const bundledSource = exactRecord(sourceRecord, ["kind", "catalog"]);
      if (bundledSource === undefined || bundledSource.catalog !== "json-schema-2020-12") {
        return false;
      }
      bundledCatalogCount += 1;
      if (bundledCatalogCount > 1) return false;
      continue;
    }
    if (sourceRecord.kind !== "https") return false;
    const httpsSource = exactRecord(sourceRecord, ["kind", "id", "origin", "pathPrefix"]);
    if (
      httpsSource === undefined ||
      !safeAbsoluteIdentifier(httpsSource.id) ||
      !safeHttpsOrigin(httpsSource.origin) ||
      !safePathPrefix(httpsSource.pathPrefix) ||
      sourceIds.has(httpsSource.id)
    ) {
      return false;
    }
    const sourceLocation = `${httpsSource.origin}\n${httpsSource.pathPrefix}`;
    if (sourceLocations.has(sourceLocation)) return false;
    sourceIds.add(httpsSource.id);
    sourceLocations.add(sourceLocation);
  }
  return true;
}

/** Returns declared IDs only after the whole schema registry satisfies its closed authoring invariant. */
function validatedSchemaRegistryIds(schemas: readonly unknown[]): ReadonlySet<string> | undefined {
  const declaredSchemaIds = new Set<string>();
  const schemaPaths = new Set<string>();
  for (const schemaCandidate of schemas) {
    const schemaRecord = exactRecord(schemaCandidate, ["id", "path"]);
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
    const bindingRecord = exactRecord(bindingCandidate, ["id", "instancePath", "schemaId"]);
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
  if (typeof identifier !== "string" || identifier.length === 0 || identifier.length > 256) {
    return false;
  }
  try {
    const url = new URL(identifier);
    if (url.protocol !== "https:" && url.protocol !== "urn:") return false;
    if (
      url.username.length > 0 ||
      url.password.length > 0 ||
      url.search.length > 0 ||
      url.hash.length > 0
    ) {
      return false;
    }
    return url.href === identifier;
  } catch {
    return false;
  }
}

function safeHttpsOrigin(origin: unknown): origin is string {
  if (typeof origin !== "string" || origin.length === 0 || origin.length > 200) return false;
  try {
    const url = new URL(origin);
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
  } catch {
    return false;
  }
}

function safePathPrefix(pathPrefix: unknown): pathPrefix is string {
  if (
    typeof pathPrefix !== "string" ||
    pathPrefix.length === 0 ||
    pathPrefix.length > 256 ||
    !pathPrefix.startsWith("/") ||
    (pathPrefix !== "/" && !pathPrefix.endsWith("/")) ||
    pathPrefix.includes("\\") ||
    pathPrefix.includes("?") ||
    pathPrefix.includes("#") ||
    pathPrefix.includes("//")
  ) {
    return false;
  }
  const segments = pathPrefix.split("/");
  return segments.every(
    (segment, index) => index === 0 || segment === "" || (segment !== "." && segment !== "..")
  );
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
