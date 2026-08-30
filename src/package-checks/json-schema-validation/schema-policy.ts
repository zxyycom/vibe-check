import type { AnySchema } from "ajv";

import type { ResolvedJsonSchemaValidationOptions } from "./options.ts";
import type { LoadedSchema, SchemaCompileReason } from "./schema-engine.ts";
import type { StrictJsonValue } from "../json-document/strict-document.ts";

export interface PreparedSchema {
  readonly authoringId: string;
  readonly engineId: string;
  readonly engineSchema: AnySchema;
}

export function prepareSchema(
  loadedSchema: LoadedSchema,
  mode: ResolvedJsonSchemaValidationOptions["schemaIdentity"]["mode"]
): PreparedSchema | SchemaCompileReason {
  if (mode === "configuration-authoritative") {
    const documentValue = withConfigurationIdentity(loadedSchema.documentValue, loadedSchema.id);
    const engineSchema = toAjvSchema(documentValue);
    if (engineSchema === undefined) return "invalid-schema";
    const referenceReason = inspectSchemaPolicy(documentValue);
    if (referenceReason !== undefined) return referenceReason;
    return Object.freeze({
      authoringId: loadedSchema.id,
      engineId: loadedSchema.id,
      engineSchema
    });
  }

  if (!isJsonObject(loadedSchema.documentValue)) return "missing-schema-id";
  const documentId = loadedSchema.documentValue.$id;
  if (typeof documentId !== "string") return "missing-schema-id";
  if (!safeSchemaIdentifier(documentId)) return "invalid-document-id";
  if (mode === "require-match" && documentId !== loadedSchema.id) return "schema-id-mismatch";
  const referenceReason = inspectSchemaPolicy(loadedSchema.documentValue);
  if (referenceReason !== undefined) return referenceReason;
  return Object.freeze({
    authoringId: loadedSchema.id,
    engineId: documentId,
    engineSchema: loadedSchema.documentValue
  });
}

export function rejectDuplicateEngineIds(
  preparedSchemas: Map<string, PreparedSchema>,
  failures: Map<string, SchemaCompileReason>
): void {
  const byEngineId = new Map<string, string[]>();
  for (const preparedSchema of preparedSchemas.values()) {
    const authoringIds = byEngineId.get(preparedSchema.engineId) ?? [];
    authoringIds.push(preparedSchema.authoringId);
    byEngineId.set(preparedSchema.engineId, authoringIds);
  }
  for (const authoringIds of byEngineId.values()) {
    if (authoringIds.length < 2) continue;
    for (const authoringId of authoringIds) {
      preparedSchemas.delete(authoringId);
      failures.set(authoringId, "duplicate-engine-id");
    }
  }
}

function withConfigurationIdentity(
  documentValue: StrictJsonValue,
  configuredSchemaId: string
): StrictJsonValue {
  if (!isJsonObject(documentValue)) return documentValue;
  const copy: Record<string, StrictJsonValue> = {};
  Object.setPrototypeOf(copy, null);
  for (const [key, nested] of Object.entries(documentValue)) {
    Object.defineProperty(copy, key, {
      configurable: false,
      enumerable: true,
      value: key === "$id" ? configuredSchemaId : nested,
      writable: false
    });
  }
  if (!Object.hasOwn(copy, "$id")) {
    Object.defineProperty(copy, "$id", {
      configurable: false,
      enumerable: true,
      value: configuredSchemaId,
      writable: false
    });
  }
  return Object.freeze(copy);
}

/**
 * Inspects only JSON Schema-bearing locations. Annotation payloads and property names are data, not keywords,
 * so they must not be mistaken for `$ref`, `$dynamicRef`, or an Ajv extension.
 */
export function inspectSchemaPolicy(schemaValue: StrictJsonValue): SchemaCompileReason | undefined {
  if (!isJsonObject(schemaValue)) return undefined;
  return inspectSchemaObject(schemaValue);
}

function inspectSchemaObject(
  schemaObject: Readonly<Record<string, StrictJsonValue>>
): SchemaCompileReason | undefined {
  const directReason = inspectDirectSchemaPolicy(schemaObject);
  if (directReason !== undefined) return directReason;
  return inspectNestedSchemaPolicies(schemaObject);
}

function inspectDirectSchemaPolicy(
  schemaObject: Readonly<Record<string, StrictJsonValue>>
): SchemaCompileReason | undefined {
  if (Object.hasOwn(schemaObject, "$async")) return "invalid-schema";
  if (hasUnsupportedReferenceKeyword(schemaObject)) return "unsupported-reference";
  if (Object.hasOwn(schemaObject, "$id") && !permittedNestedIdentifier(schemaObject.$id)) {
    return "unsupported-reference";
  }
  return hasInvalidReferenceValue(schemaObject) ? "unsupported-reference" : undefined;
}

function hasUnsupportedReferenceKeyword(
  schemaObject: Readonly<Record<string, StrictJsonValue>>
): boolean {
  return Object.hasOwn(schemaObject, "$dynamicRef") || Object.hasOwn(schemaObject, "$recursiveRef");
}

function hasInvalidReferenceValue(
  schemaObject: Readonly<Record<string, StrictJsonValue>>
): boolean {
  return ["$ref", "$schema"].some(
    (key) => Object.hasOwn(schemaObject, key) && !permittedReference(schemaObject[key])
  );
}

function inspectNestedSchemaPolicies(
  schemaObject: Readonly<Record<string, StrictJsonValue>>
): SchemaCompileReason | undefined {
  for (const [keyword, keywordValue] of Object.entries(schemaObject)) {
    const reason = inspectNestedSchemaPolicy(keyword, keywordValue);
    if (reason !== undefined) return reason;
  }
  return undefined;
}

function inspectNestedSchemaPolicy(
  keyword: string,
  keywordValue: StrictJsonValue
): SchemaCompileReason | undefined {
  if (SCHEMA_MAP_KEYWORDS.has(keyword)) return inspectSchemaMap(keywordValue);
  if (SCHEMA_VALUE_KEYWORDS.has(keyword)) return inspectSchemaValue(keywordValue);
  if (SCHEMA_ARRAY_KEYWORDS.has(keyword)) return inspectSchemaArray(keywordValue);
  if (keyword === "dependencies") return inspectLegacyDependencies(keywordValue);
  return undefined;
}

function inspectSchemaMap(schemaMap: StrictJsonValue): SchemaCompileReason | undefined {
  if (!isJsonObject(schemaMap)) return undefined;
  for (const nestedSchema of Object.values(schemaMap)) {
    const reason = inspectSchemaValue(nestedSchema);
    if (reason !== undefined) return reason;
  }
  return undefined;
}

function inspectSchemaValue(candidateSchema: StrictJsonValue): SchemaCompileReason | undefined {
  if (!isJsonObject(candidateSchema)) return undefined;
  return inspectSchemaObject(candidateSchema);
}

function inspectSchemaArray(schemaArray: StrictJsonValue): SchemaCompileReason | undefined {
  if (!isStrictJsonArray(schemaArray)) return undefined;
  for (const nestedSchema of schemaArray) {
    const reason = inspectSchemaValue(nestedSchema);
    if (reason !== undefined) return reason;
  }
  return undefined;
}

function inspectLegacyDependencies(
  dependencyMap: StrictJsonValue
): SchemaCompileReason | undefined {
  if (!isJsonObject(dependencyMap)) return undefined;
  for (const dependencySchema of Object.values(dependencyMap)) {
    const reason = inspectSchemaValue(dependencySchema);
    if (reason !== undefined) return reason;
  }
  return undefined;
}

const SCHEMA_MAP_KEYWORDS: ReadonlySet<string> = new Set([
  "$defs",
  "definitions",
  "dependentSchemas",
  "patternProperties",
  "properties"
]);

const SCHEMA_VALUE_KEYWORDS: ReadonlySet<string> = new Set([
  "additionalItems",
  "additionalProperties",
  "contains",
  "contentSchema",
  "else",
  "if",
  "items",
  "not",
  "propertyNames",
  "then",
  "unevaluatedItems",
  "unevaluatedProperties"
]);

const SCHEMA_ARRAY_KEYWORDS: ReadonlySet<string> = new Set([
  "allOf",
  "anyOf",
  "oneOf",
  "prefixItems"
]);

function permittedReference(referenceValue: StrictJsonValue): boolean {
  if (typeof referenceValue !== "string") return false;
  if (referenceValue.startsWith("#")) return true;
  try {
    const url = new URL(referenceValue);
    return (
      (url.protocol === "https:" || url.protocol === "urn:") &&
      url.username.length === 0 &&
      url.password.length === 0 &&
      url.search.length === 0
    );
  } catch {
    return false;
  }
}

function permittedNestedIdentifier(identifierValue: StrictJsonValue): boolean {
  return (
    typeof identifierValue === "string" &&
    (identifierValue.startsWith("#") || safeSchemaIdentifier(identifierValue))
  );
}

function safeSchemaIdentifier(identifier: string): boolean {
  try {
    const url = new URL(identifier);
    return (
      (url.protocol === "https:" || url.protocol === "urn:") &&
      url.username.length === 0 &&
      url.password.length === 0 &&
      url.search.length === 0 &&
      url.hash.length === 0 &&
      url.href === identifier
    );
  } catch {
    return false;
  }
}

export function isJsonObject(
  candidateValue: StrictJsonValue
): candidateValue is Readonly<Record<string, StrictJsonValue>> {
  return (
    typeof candidateValue === "object" &&
    candidateValue !== null &&
    !isStrictJsonArray(candidateValue)
  );
}

function isStrictJsonArray(
  candidateValue: StrictJsonValue
): candidateValue is readonly StrictJsonValue[] {
  return Array.isArray(candidateValue);
}

function toAjvSchema(documentValue: StrictJsonValue): AnySchema | undefined {
  if (typeof documentValue === "boolean") return documentValue;
  if (!isJsonObject(documentValue)) return undefined;
  return documentValue;
}
