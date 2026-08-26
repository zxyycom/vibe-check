import { validJsonSchemaValidationOptions } from "./options-validation.ts";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

import type { JsonSchemaValidationOptions } from "./options.ts";
import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { collectProjectFiles } from "../project-files/collection.ts";
import {
  readStrictJsonDocument,
  type JsonDocumentIssue
} from "../json-document/strict-document.ts";
import {
  compileSchemaSet,
  normalizeValidationErrors,
  type LoadedSchema,
  type SchemaCompileReason
} from "./schema-engine.ts";

export const JSON_SCHEMA_VALIDATION_CHECK_DEFINITION = {
  checkId: "json-schema-validation",
  displayName: "JSON Schema validation"
} as const;

interface JsonSchemaValidationFinalData {
  readonly bindingCount: number;
  readonly blockedBindingCount: number;
  readonly invalidBindingCount: number;
  readonly issueCount: number;
  readonly issuesTruncated: boolean;
  readonly reportedIssueCount: number;
  readonly schemaCount: number;
  readonly validBindingCount: number;
}

type JsonSchemaValidationUnavailableCode =
  | "invalid-options"
  | "engine-unavailable"
  | "execution-cancelled"
  | "reference-transport-unavailable"
  | "scan-input-unavailable"
  | "document-unavailable";

type SchemaDocumentReason = JsonDocumentIssue | "out-of-scope";

type JsonSchemaIssue =
  | Readonly<{
      readonly kind: "schema-document";
      readonly path: string;
      readonly reason: SchemaDocumentReason;
      readonly schemaId: string;
    }>
  | Readonly<{
      readonly kind: "schema-compile";
      readonly path: string;
      readonly reason: SchemaCompileReason;
      readonly schemaId: string;
    }>
  | Readonly<{
      readonly bindingId: string;
      readonly kind: "instance-document";
      readonly path: string;
      readonly reason: SchemaDocumentReason;
      readonly schemaId: string;
    }>
  | Readonly<{
      readonly bindingId: string;
      readonly keyword: string;
      readonly kind: "keyword-violation";
      readonly path: string;
      readonly pointer: string;
      readonly schemaId: string;
    }>;

const MAX_REPORTED_SCHEMA_ISSUES = 100;

/** Validates only explicitly registered/bound JSON files inside the current global scan scope. */
export async function executeJsonSchemaValidation(
  context: CheckExecutionContext<JsonSchemaValidationOptions>
): Promise<CheckResult<JsonSchemaValidationFinalData>> {
  if (!validJsonSchemaValidationOptions(context.options)) return unavailable("invalid-options");

  try {
    return await execute(context);
  } catch {
    return unavailable("engine-unavailable");
  }
}

async function execute(
  context: CheckExecutionContext<JsonSchemaValidationOptions>
): Promise<CheckResult<JsonSchemaValidationFinalData>> {
  if (context.signal.aborted) return unavailable("execution-cancelled");
  if (context.options.bindings.length === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-bindings" } });
  }

  let selectedPaths: ReadonlySet<string>;
  try {
    selectedPaths = new Set(collectProjectFiles(context.project.root, context.options.files));
  } catch {
    return unavailable("scan-input-unavailable");
  }
  if (context.signal.aborted) return unavailable("execution-cancelled");

  const issueCollector = new SchemaIssueCollector(context);
  const schemaFailures = new Set<string>();
  const loadedSchemas: LoadedSchema[] = [];

  for (const schema of context.options.schemas) {
    if (context.signal.aborted) return unavailable("execution-cancelled");
    if (!selectedPaths.has(schema.path)) {
      schemaFailures.add(schema.id);
      issueCollector.add(
        Object.freeze({
          kind: "schema-document",
          path: schema.path,
          reason: "out-of-scope",
          schemaId: schema.id
        })
      );
      continue;
    }
    const document = readStrictJsonDocument({
      filePath: resolve(context.project.root, schema.path),
      maximumBytes: context.options.maximumBytes
    });
    if (context.signal.aborted) return unavailable("execution-cancelled");
    if (document.kind === "unavailable") return unavailable("document-unavailable");
    if (document.kind === "issue") {
      schemaFailures.add(schema.id);
      issueCollector.add(
        Object.freeze({
          kind: "schema-document",
          path: schema.path,
          reason: document.reason,
          schemaId: schema.id
        })
      );
      continue;
    }
    loadedSchemas.push(Object.freeze({ documentValue: document.jsonValue, id: schema.id }));
  }

  const compilationResult = await compileSchemaSet({
    referenceResolution: context.options.referenceResolution,
    schemaIdentity: context.options.schemaIdentity,
    schemas: loadedSchemas,
    signal: context.signal
  });
  if (compilationResult.kind === "unavailable") return unavailable(compilationResult.reason);
  if (context.signal.aborted) return unavailable("execution-cancelled");

  for (const schema of context.options.schemas) {
    const reason = compilationResult.compiledSchemaSet.failures.get(schema.id);
    if (reason === undefined) continue;
    schemaFailures.add(schema.id);
    issueCollector.add(
      Object.freeze({ kind: "schema-compile", path: schema.path, reason, schemaId: schema.id })
    );
  }

  let blockedBindingCount = 0;
  let invalidBindingCount = 0;
  let validBindingCount = 0;
  for (const binding of context.options.bindings) {
    if (context.signal.aborted) return unavailable("execution-cancelled");
    const schemaFailed = schemaFailures.has(binding.schemaId);
    const isInstancePathInScope = selectedPaths.has(binding.instancePath);
    if (!isInstancePathInScope) {
      issueCollector.add(
        Object.freeze({
          bindingId: binding.id,
          kind: "instance-document",
          path: binding.instancePath,
          reason: "out-of-scope",
          schemaId: binding.schemaId
        })
      );
    }
    if (schemaFailed) {
      blockedBindingCount += 1;
      continue;
    }
    if (!isInstancePathInScope) {
      invalidBindingCount += 1;
      continue;
    }

    const document = readStrictJsonDocument({
      filePath: resolve(context.project.root, binding.instancePath),
      maximumBytes: context.options.maximumBytes
    });
    if (context.signal.aborted) return unavailable("execution-cancelled");
    if (document.kind === "unavailable") return unavailable("document-unavailable");
    if (document.kind === "issue") {
      invalidBindingCount += 1;
      issueCollector.add(
        Object.freeze({
          bindingId: binding.id,
          kind: "instance-document",
          path: binding.instancePath,
          reason: document.reason,
          schemaId: binding.schemaId
        })
      );
      continue;
    }

    const validator = compilationResult.compiledSchemaSet.validators.get(binding.schemaId);
    if (validator === undefined) return unavailable("engine-unavailable");
    let isValid: boolean;
    try {
      isValid = validator(document.jsonValue);
    } catch {
      return unavailable("engine-unavailable");
    }
    if (isValid) {
      validBindingCount += 1;
      continue;
    }

    invalidBindingCount += 1;
    const violations = normalizeValidationErrors(validator.errors);
    if (violations.length === 0) {
      issueCollector.add(
        Object.freeze({
          bindingId: binding.id,
          keyword: "other",
          kind: "keyword-violation",
          path: binding.instancePath,
          pointer: "",
          schemaId: binding.schemaId
        })
      );
      continue;
    }
    for (const violation of violations) {
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

  const finalData = Object.freeze({
    bindingCount: context.options.bindings.length,
    blockedBindingCount,
    invalidBindingCount,
    issueCount: issueCollector.count,
    issuesTruncated: issueCollector.truncated,
    reportedIssueCount: issueCollector.reportedCount,
    schemaCount: context.options.schemas.length,
    validBindingCount
  });
  return Object.freeze({
    data: finalData,
    status: issueCollector.count === 0 ? "passed" : "failed"
  });
}

/** Owns the invocation-local issue count, display cap, and deterministic Record identity ordinal. */
class SchemaIssueCollector {
  #count = 0;
  #reportedCount = 0;
  readonly #issueOccurrences = new Map<string, number>();
  readonly #checkContext: CheckExecutionContext<JsonSchemaValidationOptions>;

  constructor(context: CheckExecutionContext<JsonSchemaValidationOptions>) {
    this.#checkContext = context;
  }

  get count(): number {
    return this.#count;
  }

  get reportedCount(): number {
    return this.#reportedCount;
  }

  get truncated(): boolean {
    return this.#count > this.#reportedCount;
  }

  add(issue: JsonSchemaIssue): void {
    this.#count += 1;
    if (this.#reportedCount >= MAX_REPORTED_SCHEMA_ISSUES) return;
    const semanticKey = JSON.stringify(issue);
    const occurrence = this.#issueOccurrences.get(semanticKey) ?? 0;
    this.#issueOccurrences.set(semanticKey, occurrence + 1);
    const digest = createHash("sha256")
      .update(`${semanticKey}\n${occurrence}`, "utf8")
      .digest("hex");
    this.#checkContext.records.report({ id: `json-schema:${issue.kind}:${digest}` }, issue);
    this.#reportedCount += 1;
  }
}

function unavailable(
  code: JsonSchemaValidationUnavailableCode
): CheckResult<JsonSchemaValidationFinalData> {
  return Object.freeze({ status: "unavailable", reason: { code } });
}
