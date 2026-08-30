import { Ajv2020 } from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";

import type { ResolvedJsonSchemaValidationOptions } from "./options.ts";
import { prepareSchema, rejectDuplicateEngineIds, type PreparedSchema } from "./schema-policy.ts";
import {
  ControlledReferenceResolver,
  ReferenceResolutionFailure,
  ReferenceTransportFailure
} from "./reference-resolver.ts";
import type { StrictJsonValue } from "../json-document/strict-document.ts";

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

/** Compiles a closed set without exposing Ajv objects, errors, or resolved remote material to callers. */
export async function compileSchemaSet(input: {
  readonly referenceResolution: ResolvedJsonSchemaValidationOptions["referenceResolution"];
  readonly schemaIdentity: ResolvedJsonSchemaValidationOptions["schemaIdentity"];
  readonly schemas: readonly LoadedSchema[];
  readonly signal: AbortSignal;
}): Promise<CompileSchemaSetResult> {
  if (input.signal.aborted) return unavailable("execution-cancelled");
  const prepared = prepareSchemas(input);
  const resolver = new ControlledReferenceResolver({
    referenceResolution: input.referenceResolution,
    signal: input.signal
  });
  const ajv = createSchemaEngine(resolver);
  if (ajv === undefined) return unavailable("engine-unavailable");
  const registered = registerSchemas(ajv, prepared, input.signal);
  if (registered === undefined) return unavailable("execution-cancelled");
  const validators = await compileRegisteredSchemas(ajv, prepared, registered, input.signal);
  if (validators === "cancelled") return unavailable("execution-cancelled");
  if (validators === "transport-failed") return unavailable("reference-transport-unavailable");

  return Object.freeze({
    compiledSchemaSet: Object.freeze({
      failures: new Map(prepared.failures),
      validators: new Map(validators)
    }),
    kind: "settled"
  });
}

interface PreparedSchemaSet {
  readonly failures: Map<string, SchemaCompileReason>;
  readonly schemas: Map<string, PreparedSchema>;
}

function prepareSchemas(input: {
  readonly schemaIdentity: ResolvedJsonSchemaValidationOptions["schemaIdentity"];
  readonly schemas: readonly LoadedSchema[];
}): PreparedSchemaSet {
  const failures = new Map<string, SchemaCompileReason>();
  const schemas = new Map<string, PreparedSchema>();
  for (const loadedSchema of input.schemas) {
    const preparation = prepareSchema(loadedSchema, input.schemaIdentity.mode);
    if (typeof preparation === "string") failures.set(loadedSchema.id, preparation);
    else schemas.set(loadedSchema.id, preparation);
  }
  rejectDuplicateEngineIds(schemas, failures);
  return { failures, schemas };
}

function createSchemaEngine(resolver: ControlledReferenceResolver): Ajv2020 | undefined {
  try {
    return new Ajv2020({
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
    return undefined;
  }
}

function registerSchemas(
  ajv: Ajv2020,
  prepared: PreparedSchemaSet,
  signal: AbortSignal
): ReadonlySet<string> | undefined {
  const registered = new Set<string>();
  for (const schema of prepared.schemas.values()) {
    if (signal.aborted) return undefined;
    try {
      ajv.addSchema(schema.engineSchema, schema.engineId);
      registered.add(schema.authoringId);
    } catch {
      prepared.failures.set(schema.authoringId, "invalid-schema");
    }
  }
  return registered;
}

async function compileRegisteredSchemas(
  ajv: Ajv2020,
  prepared: PreparedSchemaSet,
  registered: ReadonlySet<string>,
  signal: AbortSignal
): Promise<ReadonlyMap<string, ValidateFunction> | "cancelled" | "transport-failed"> {
  const validators = new Map<string, ValidateFunction>();
  for (const schema of prepared.schemas.values()) {
    const outcome = await compilePreparedSchema(ajv, schema, registered, signal);
    if (outcome === "cancelled" || outcome === "transport-failed") return outcome;
    if (outcome instanceof ReferenceResolutionFailure)
      prepared.failures.set(schema.authoringId, outcome.reason);
    else if (outcome === "invalid") prepared.failures.set(schema.authoringId, "invalid-schema");
    else if (outcome !== undefined) validators.set(schema.authoringId, outcome);
  }
  return validators;
}

async function compilePreparedSchema(
  ajv: Ajv2020,
  schema: PreparedSchema,
  registered: ReadonlySet<string>,
  signal: AbortSignal
): Promise<
  | ValidateFunction
  | ReferenceResolutionFailure
  | "cancelled"
  | "invalid"
  | "transport-failed"
  | undefined
> {
  if (!registered.has(schema.authoringId)) return undefined;
  if (signal.aborted) return "cancelled";
  try {
    return typeof schema.engineSchema === "boolean"
      ? ajv.compile(schema.engineSchema)
      : await ajv.compileAsync(schema.engineSchema);
  } catch (error) {
    if (signal.aborted) return "cancelled";
    if (error instanceof ReferenceTransportFailure) return "transport-failed";
    return error instanceof ReferenceResolutionFailure ? error : "invalid";
  }
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

function unavailable(
  reason: Extract<CompileSchemaSetResult, { readonly kind: "unavailable" }>["reason"]
): CompileSchemaSetResult {
  return Object.freeze({ kind: "unavailable", reason });
}
