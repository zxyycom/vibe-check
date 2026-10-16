import type { DeepReadonly, CheckExecutionContext } from "../../check/check.ts";
import { resolve } from "node:path";

import { readStrictJsonDocument } from "../json-document/strict-document.ts";
import {
  normalizeValidationErrors,
  type CompiledSchemaSet,
  type LoadedSchema
} from "./schema-engine.ts";
import type { SchemaIssueCollector } from "./issue-collector.ts";
import type {
  JsonSchemaValidationRecordData,
  JsonSchemaValidationUnavailableCode
} from "./json-schema-validation.ts";
import type { ResolvedJsonSchemaValidationOptions } from "./options.ts";

type UnavailableStage = Readonly<{
  readonly code: JsonSchemaValidationUnavailableCode;
  readonly kind: "unavailable";
}>;

type Stage<T> = Readonly<{ readonly kind: "complete"; readonly value: T }> | UnavailableStage;

export interface LoadedSchemaStage {
  readonly failures: ReadonlySet<string>;
  readonly schemas: readonly LoadedSchema[];
}

export interface BindingCounts {
  readonly blockedBindingCount: number;
  readonly invalidBindingCount: number;
  readonly validBindingCount: number;
}

type SchemaContext = Pick<CheckExecutionContext, "project" | "signal">;

export async function loadConfiguredSchemas(
  options: DeepReadonly<ResolvedJsonSchemaValidationOptions>,
  context: SchemaContext,
  selectedPaths: ReadonlySet<string>,
  issueCollector: SchemaIssueCollector
): Promise<Stage<LoadedSchemaStage>> {
  const failures = new Set<string>();
  const schemas: LoadedSchema[] = [];
  for (const schema of options.schemas) {
    const outcome = loadConfiguredSchema(options, context, selectedPaths, schema, issueCollector);
    if (outcome.kind === "unavailable") return outcome;
    if (outcome.kind === "failure") failures.add(schema.id);
    else schemas.push(outcome.value);
  }
  return complete({ failures, schemas });
}

type SchemaLoadOutcome =
  | Readonly<{ readonly kind: "failure" }>
  | Readonly<{ readonly kind: "loaded"; readonly value: LoadedSchema }>
  | Readonly<{ readonly code: JsonSchemaValidationUnavailableCode; readonly kind: "unavailable" }>;

function loadConfiguredSchema(
  options: DeepReadonly<ResolvedJsonSchemaValidationOptions>,
  context: SchemaContext,
  selectedPaths: ReadonlySet<string>,
  schema: ResolvedJsonSchemaValidationOptions["schemas"][number],
  issueCollector: SchemaIssueCollector
): SchemaLoadOutcome {
  if (context.signal.aborted) return unavailable("execution-cancelled");
  if (!selectedPaths.has(schema.path)) {
    issueCollector.add(schemaDocumentIssue(schema, "out-of-scope"));
    return { kind: "failure" };
  }
  const document = readStrictJsonDocument({
    filePath: resolve(context.project.root, schema.path),
    maximumBytes: options.maximumBytes
  });
  if (context.signal.aborted) return unavailable("execution-cancelled");
  if (document.kind === "unavailable") return unavailable("document-unavailable");
  if (document.kind === "issue") {
    issueCollector.add(schemaDocumentIssue(schema, document.reason));
    return { kind: "failure" };
  }
  return {
    kind: "loaded",
    value: Object.freeze({ documentValue: document.jsonValue, id: schema.id })
  };
}

function schemaDocumentIssue(
  schema: ResolvedJsonSchemaValidationOptions["schemas"][number],
  reason: Extract<JsonSchemaValidationRecordData, { readonly kind: "schema-document" }>["reason"]
): Extract<JsonSchemaValidationRecordData, { readonly kind: "schema-document" }> {
  return Object.freeze({ kind: "schema-document", path: schema.path, reason, schemaId: schema.id });
}

export function reportCompilationFailures(
  options: DeepReadonly<ResolvedJsonSchemaValidationOptions>,
  compiled: CompiledSchemaSet,
  failures: Set<string>,
  issueCollector: SchemaIssueCollector
): void {
  for (const schema of options.schemas) {
    const reason = compiled.failures.get(schema.id);
    if (reason === undefined) continue;
    failures.add(schema.id);
    issueCollector.add(
      Object.freeze({ kind: "schema-compile", path: schema.path, reason, schemaId: schema.id })
    );
  }
}

export async function validateSchemaBindings(
  input: Omit<BindingValidationInput, "binding">
): Promise<Stage<BindingCounts>> {
  const counts = { blockedBindingCount: 0, invalidBindingCount: 0, validBindingCount: 0 };
  for (const binding of input.options.bindings) {
    const outcome = validateSchemaBinding({ ...input, binding });
    if (outcome.kind === "unavailable") return outcome;
    counts[outcome.kind] += 1;
  }
  return complete(counts);
}

type BindingOutcome =
  | Readonly<{ readonly kind: "blockedBindingCount" | "invalidBindingCount" | "validBindingCount" }>
  | Readonly<{ readonly code: JsonSchemaValidationUnavailableCode; readonly kind: "unavailable" }>;

interface BindingValidationInput {
  readonly binding: ResolvedJsonSchemaValidationOptions["bindings"][number];
  readonly compiled: CompiledSchemaSet;
  readonly context: SchemaContext;
  readonly options: DeepReadonly<ResolvedJsonSchemaValidationOptions>;
  readonly issueCollector: SchemaIssueCollector;
  readonly schemaFailures: ReadonlySet<string>;
  readonly selectedPaths: ReadonlySet<string>;
}

function validateSchemaBinding(input: Readonly<BindingValidationInput>): BindingOutcome {
  const { binding, compiled, context, options, issueCollector, schemaFailures, selectedPaths } =
    input;
  if (context.signal.aborted) return unavailable("execution-cancelled");
  const inScope = selectedPaths.has(binding.instancePath);
  if (!inScope) issueCollector.add(instanceDocumentIssue(binding, "out-of-scope"));
  if (schemaFailures.has(binding.schemaId)) return { kind: "blockedBindingCount" };
  if (!inScope) return { kind: "invalidBindingCount" };
  return validateBoundDocument(options, context, compiled, binding, issueCollector);
}

function validateBoundDocument(
  options: DeepReadonly<ResolvedJsonSchemaValidationOptions>,
  context: SchemaContext,
  compiled: CompiledSchemaSet,
  binding: ResolvedJsonSchemaValidationOptions["bindings"][number],
  issueCollector: SchemaIssueCollector
): BindingOutcome {
  const document = readStrictJsonDocument({
    filePath: resolve(context.project.root, binding.instancePath),
    maximumBytes: options.maximumBytes
  });
  if (context.signal.aborted) return unavailable("execution-cancelled");
  if (document.kind === "unavailable") return unavailable("document-unavailable");
  if (document.kind === "issue") {
    issueCollector.add(instanceDocumentIssue(binding, document.reason));
    return { kind: "invalidBindingCount" };
  }
  return validateDocumentValue(compiled, binding, document.jsonValue, issueCollector);
}

function validateDocumentValue(
  compiled: CompiledSchemaSet,
  binding: ResolvedJsonSchemaValidationOptions["bindings"][number],
  value: LoadedSchema["documentValue"],
  issueCollector: SchemaIssueCollector
): BindingOutcome {
  const validator = compiled.validators.get(binding.schemaId);
  if (validator === undefined) return unavailable("engine-unavailable");
  try {
    if (validator(value)) return { kind: "validBindingCount" };
  } catch {
    return unavailable("engine-unavailable");
  }
  reportKeywordViolations(binding, normalizeValidationErrors(validator.errors), issueCollector);
  return { kind: "invalidBindingCount" };
}

function instanceDocumentIssue(
  binding: ResolvedJsonSchemaValidationOptions["bindings"][number],
  reason: Extract<JsonSchemaValidationRecordData, { readonly kind: "instance-document" }>["reason"]
): Extract<JsonSchemaValidationRecordData, { readonly kind: "instance-document" }> {
  return Object.freeze({
    bindingId: binding.id,
    kind: "instance-document",
    path: binding.instancePath,
    reason,
    schemaId: binding.schemaId
  });
}

function reportKeywordViolations(
  binding: ResolvedJsonSchemaValidationOptions["bindings"][number],
  violations: ReturnType<typeof normalizeValidationErrors>,
  issueCollector: SchemaIssueCollector
): void {
  const reported =
    violations.length === 0 ? [Object.freeze({ keyword: "other", pointer: "" })] : violations;
  for (const violation of reported) {
    issueCollector.add(
      Object.freeze({
        bindingId: binding.id,
        keyword: violation.keyword,
        kind: "keyword-violation",
        path: binding.instancePath,
        pointer: violation.pointer,
        schemaId: binding.schemaId
      })
    );
  }
}

function complete<T>(value: T): Stage<T> {
  return Object.freeze({ kind: "complete", value });
}

function unavailable(code: JsonSchemaValidationUnavailableCode): UnavailableStage {
  return Object.freeze({ code, kind: "unavailable" });
}
