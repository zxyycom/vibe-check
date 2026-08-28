import { Ajv2020 } from "ajv/dist/2020.js";
import type { AnySchema, AnySchemaObject, ErrorObject, ValidateFunction } from "ajv";

import type { ResolvedJsonSchemaValidationOptions } from "./options.ts";
import { inspectStrictJsonBytes, type StrictJsonValue } from "../json-document/strict-document.ts";

export type SchemaCompileReason =
  | "duplicate-engine-id"
  | "invalid-document-id"
  | "invalid-schema"
  | "missing-schema-id"
  | "schema-id-mismatch"
  | "unapproved-reference"
  | "unsupported-reference"
  | "remote-document-invalid"
  | "remote-schema-id-mismatch";

export interface LoadedSchema {
  readonly id: string;
  readonly documentValue: StrictJsonValue;
}

export interface CompiledSchemaSet {
  readonly failures: ReadonlyMap<string, SchemaCompileReason>;
  readonly validators: ReadonlyMap<string, ValidateFunction>;
}

/** The only validation fields that may cross from the Ajv adapter to Check-owned Record settlement. */
export interface NormalizedValidationError {
  readonly keyword: string;
  readonly pointer: string;
}

export type CompileSchemaSetResult =
  | Readonly<{ readonly compiledSchemaSet: CompiledSchemaSet; readonly kind: "settled" }>
  | Readonly<{
      readonly kind: "unavailable";
      readonly reason:
        | "engine-unavailable"
        | "execution-cancelled"
        | "reference-transport-unavailable";
    }>;

interface PreparedSchema {
  readonly authoringId: string;
  readonly engineId: string;
  readonly engineSchema: AnySchema;
}

interface ControlledResolverInput {
  readonly referenceResolution: ResolvedJsonSchemaValidationOptions["referenceResolution"];
  readonly signal: AbortSignal;
}

const MAX_REMOTE_RESPONSE_BYTES = 1_048_576;
const REMOTE_TIMEOUT_MS = 5_000;

/** Compiles a closed set without exposing Ajv objects, errors, or resolved remote material to callers. */
export async function compileSchemaSet(input: {
  readonly referenceResolution: ResolvedJsonSchemaValidationOptions["referenceResolution"];
  readonly schemaIdentity: ResolvedJsonSchemaValidationOptions["schemaIdentity"];
  readonly schemas: readonly LoadedSchema[];
  readonly signal: AbortSignal;
}): Promise<CompileSchemaSetResult> {
  if (input.signal.aborted) return unavailable("execution-cancelled");

  const failures = new Map<string, SchemaCompileReason>();
  const preparedSchemas = new Map<string, PreparedSchema>();
  for (const loadedSchema of input.schemas) {
    const preparation = prepareSchema(loadedSchema, input.schemaIdentity.mode);
    if (typeof preparation === "string") {
      failures.set(loadedSchema.id, preparation);
    } else {
      preparedSchemas.set(loadedSchema.id, preparation);
    }
  }
  rejectDuplicateEngineIds(preparedSchemas, failures);

  const resolver = new ControlledReferenceResolver({
    referenceResolution: input.referenceResolution,
    signal: input.signal
  });
  let ajv: Ajv2020;
  try {
    ajv = new Ajv2020({
      allErrors: true,
      coerceTypes: false,
      loadSchema: (uri) => resolver.load(uri),
      logger: false,
      messages: false,
      removeAdditional: false,
      strict: false,
      strictNumbers: true,
      strictRequired: false,
      strictSchema: true,
      strictTuples: false,
      strictTypes: false,
      useDefaults: false,
      validateFormats: false
    });
  } catch {
    return unavailable("engine-unavailable");
  }

  const registeredAuthoringIds = new Set<string>();
  for (const preparedSchema of preparedSchemas.values()) {
    if (input.signal.aborted) return unavailable("execution-cancelled");
    try {
      ajv.addSchema(preparedSchema.engineSchema, preparedSchema.engineId);
      registeredAuthoringIds.add(preparedSchema.authoringId);
    } catch {
      failures.set(preparedSchema.authoringId, "invalid-schema");
    }
  }

  const validators = new Map<string, ValidateFunction>();
  for (const preparedSchema of preparedSchemas.values()) {
    if (!registeredAuthoringIds.has(preparedSchema.authoringId)) continue;
    if (input.signal.aborted) return unavailable("execution-cancelled");
    try {
      let validator: ValidateFunction;
      if (typeof preparedSchema.engineSchema === "boolean") {
        validator = ajv.compile(preparedSchema.engineSchema);
      } else {
        validator = await ajv.compileAsync(preparedSchema.engineSchema);
      }
      validators.set(preparedSchema.authoringId, validator);
    } catch (error) {
      if (input.signal.aborted) return unavailable("execution-cancelled");
      if (error instanceof ReferenceTransportFailure) {
        return unavailable("reference-transport-unavailable");
      }
      failures.set(
        preparedSchema.authoringId,
        error instanceof ReferenceResolutionFailure ? error.reason : "invalid-schema"
      );
    }
  }

  return Object.freeze({
    compiledSchemaSet: Object.freeze({
      failures: new Map(failures),
      validators: new Map(validators)
    }),
    kind: "settled"
  });
}

/** Converts the only engine-visible error fields into fixed safe validation facts. */
export function normalizeValidationErrors(
  errors: readonly ErrorObject[] | null | undefined
): readonly NormalizedValidationError[] {
  if (errors === null || errors === undefined) return Object.freeze([]);
  const normalized = errors.map((error) =>
    Object.freeze({
      keyword: normalizeKeyword(error.keyword),
      pointer: normalizePointer(error.instancePath)
    })
  );
  normalized.sort((left, right) => {
    const leftKey = `${left.pointer}\n${left.keyword}`;
    const rightKey = `${right.pointer}\n${right.keyword}`;
    if (leftKey < rightKey) return -1;
    if (leftKey > rightKey) return 1;
    return 0;
  });
  return Object.freeze(normalized);
}

function prepareSchema(
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

function rejectDuplicateEngineIds(
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
function inspectSchemaPolicy(schemaValue: StrictJsonValue): SchemaCompileReason | undefined {
  if (!isJsonObject(schemaValue)) return undefined;
  return inspectSchemaObject(schemaValue);
}

function inspectSchemaObject(
  schemaObject: Readonly<Record<string, StrictJsonValue>>
): SchemaCompileReason | undefined {
  if (Object.hasOwn(schemaObject, "$async")) return "invalid-schema";
  if (Object.hasOwn(schemaObject, "$dynamicRef") || Object.hasOwn(schemaObject, "$recursiveRef")) {
    return "unsupported-reference";
  }
  if (Object.hasOwn(schemaObject, "$id") && !permittedNestedIdentifier(schemaObject.$id)) {
    return "unsupported-reference";
  }
  for (const key of ["$ref", "$schema"] as const) {
    if (Object.hasOwn(schemaObject, key) && !permittedReference(schemaObject[key])) {
      return "unsupported-reference";
    }
  }

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

function isJsonObject(
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

function normalizeKeyword(candidateKeyword: unknown): string {
  return typeof candidateKeyword === "string" && KNOWN_KEYWORDS.has(candidateKeyword)
    ? candidateKeyword
    : "other";
}

function normalizePointer(candidatePointer: unknown): string {
  if (typeof candidatePointer !== "string") return "/<redacted>";
  if (candidatePointer === "") return "";
  if (candidatePointer.length > 256 || !candidatePointer.startsWith("/")) {
    return "/<redacted>";
  }
  const segments = candidatePointer.slice(1).split("/");
  return segments.every((segment) => /^[A-Za-z0-9_.-]{1,64}$/u.test(segment))
    ? candidatePointer
    : "/<redacted>";
}

const KNOWN_KEYWORDS: ReadonlySet<string> = new Set([
  "additionalProperties",
  "allOf",
  "anyOf",
  "const",
  "contains",
  "dependentRequired",
  "enum",
  "exclusiveMaximum",
  "exclusiveMinimum",
  "format",
  "if",
  "maxContains",
  "maxItems",
  "maxLength",
  "maxProperties",
  "maximum",
  "minContains",
  "minItems",
  "minLength",
  "minProperties",
  "minimum",
  "multipleOf",
  "not",
  "oneOf",
  "pattern",
  "patternProperties",
  "propertyNames",
  "required",
  "type",
  "unevaluatedItems",
  "unevaluatedProperties",
  "uniqueItems"
]);

class ControlledReferenceResolver {
  readonly #cache = new Map<string, Promise<AnySchemaObject>>();
  #loadQueue: Promise<void> = Promise.resolve();
  readonly #allowedHttpsSources: readonly Readonly<{
    readonly origin: string;
    readonly pathPrefix: string;
  }>[];
  readonly #resolverInput: ControlledResolverInput;

  constructor(input: ControlledResolverInput) {
    this.#resolverInput = input;
    this.#allowedHttpsSources =
      input.referenceResolution.mode === "allowlisted"
        ? Object.freeze(
            input.referenceResolution.sources.flatMap((source) =>
              source.kind === "https"
                ? [Object.freeze({ origin: source.origin, pathPrefix: source.pathPrefix })]
                : []
            )
          )
        : Object.freeze([]);
  }

  load(referenceUri: string): Promise<AnySchemaObject> {
    let normalizedReferenceUri: string;
    try {
      normalizedReferenceUri = normalizeRemoteReference(referenceUri);
    } catch {
      return Promise.reject(new ReferenceResolutionFailure("unapproved-reference"));
    }
    const cached = this.#cache.get(normalizedReferenceUri);
    if (cached !== undefined) return cached;
    const loading = this.queueLoad(normalizedReferenceUri);
    this.#cache.set(normalizedReferenceUri, loading);
    return loading;
  }

  private queueLoad(referenceUri: string): Promise<AnySchemaObject> {
    const loading = this.#loadQueue.then(
      () => this.loadUncached(referenceUri),
      () => this.loadUncached(referenceUri)
    );
    this.#loadQueue = loading.then(
      () => undefined,
      () => undefined
    );
    return loading;
  }

  private async loadUncached(referenceUri: string): Promise<AnySchemaObject> {
    if (!this.isAllowedReference(referenceUri)) {
      throw new ReferenceResolutionFailure("unapproved-reference");
    }
    if (this.#resolverInput.signal.aborted) throw new ReferenceTransportFailure();

    const controller = new AbortController();
    const abortForCaller = (): void => controller.abort();
    this.#resolverInput.signal.addEventListener("abort", abortForCaller, { once: true });
    const timeout = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
    try {
      if (typeof globalThis.fetch !== "function") throw new ReferenceTransportFailure();
      const response = await globalThis.fetch(referenceUri, {
        credentials: "omit",
        method: "GET",
        redirect: "manual",
        signal: controller.signal
      });
      if (this.#resolverInput.signal.aborted) throw new ReferenceTransportFailure();
      if (response.redirected || (response.status >= 300 && response.status < 400)) {
        throw new ReferenceResolutionFailure("unapproved-reference");
      }
      if (!response.ok) {
        if (response.status >= 500) throw new ReferenceTransportFailure();
        throw new ReferenceResolutionFailure("unapproved-reference");
      }
      const bytes = await readBoundedResponse(
        response,
        MAX_REMOTE_RESPONSE_BYTES,
        this.#resolverInput.signal
      );
      if (bytes === "too-large") throw new ReferenceResolutionFailure("remote-document-invalid");
      const document = inspectStrictJsonBytes(bytes);
      if (document.kind !== "valid" || !isJsonObject(document.jsonValue)) {
        throw new ReferenceResolutionFailure("remote-document-invalid");
      }
      if (document.jsonValue.$id !== referenceUri) {
        throw new ReferenceResolutionFailure("remote-schema-id-mismatch");
      }
      const referenceReason = inspectSchemaPolicy(document.jsonValue);
      if (referenceReason !== undefined) throw new ReferenceResolutionFailure(referenceReason);
      return document.jsonValue;
    } catch (error) {
      if (
        error instanceof ReferenceResolutionFailure ||
        error instanceof ReferenceTransportFailure
      ) {
        throw error;
      }
      throw new ReferenceTransportFailure();
    } finally {
      clearTimeout(timeout);
      this.#resolverInput.signal.removeEventListener("abort", abortForCaller);
    }
  }

  private isAllowedReference(referenceUri: string): boolean {
    let url: URL;
    try {
      url = new URL(referenceUri);
    } catch {
      return false;
    }
    return this.#allowedHttpsSources.some(
      (source) =>
        url.origin === source.origin &&
        (source.pathPrefix === "/" || url.pathname.startsWith(source.pathPrefix))
    );
  }
}

async function readBoundedResponse(
  response: Response,
  maximumBytes: number,
  signal: AbortSignal
): Promise<Uint8Array | "too-large"> {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    /^[0-9]+$/u.test(declaredLength) &&
    Number(declaredLength) > maximumBytes
  ) {
    return "too-large";
  }
  const reader = response.body?.getReader();
  if (reader === undefined) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      if (signal.aborted) throw new ReferenceTransportFailure();
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > maximumBytes) {
        try {
          await reader.cancel();
        } catch {
          // The bounded response has already been rejected; cancellation detail is not a transport fact.
        }
        return "too-large";
      }
      chunks.push(chunk.value);
    }
  } catch (error) {
    if (error instanceof ReferenceTransportFailure) throw error;
    throw new ReferenceTransportFailure();
  } finally {
    reader.releaseLock();
  }

  const responseBytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    responseBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return responseBytes;
}

function normalizeRemoteReference(referenceUri: string): string {
  const url = new URL(referenceUri);
  if (
    url.protocol !== "https:" ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new TypeError("unapproved remote reference");
  }
  return url.href;
}

class ReferenceResolutionFailure extends Error {
  readonly reason: SchemaCompileReason;

  constructor(reason: SchemaCompileReason) {
    super(reason);
    this.reason = reason;
  }
}

class ReferenceTransportFailure extends Error {}

function unavailable(
  reason: Extract<CompileSchemaSetResult, { readonly kind: "unavailable" }>["reason"]
): CompileSchemaSetResult {
  return Object.freeze({ kind: "unavailable", reason });
}
