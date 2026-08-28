import { createHash } from "node:crypto";
import { resolve } from "node:path";

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
import {
  MAX_REPORTED_JSON_SCHEMA_ISSUES,
  type JsonSchemaValidationFinalData
} from "./final-data.ts";
import type { ResolvedJsonSchemaValidationOptions } from "./options.ts";
import { validJsonSchemaValidationOptions } from "./options-validation.ts";

export const JSON_SCHEMA_VALIDATION_CHECK_DEFINITION = {
  checkId: "json-schema-validation",
  displayName: "JSON Schema validation"
} as const;

/** `json-schema-validation` whole-Check unavailable outcome 的稳定 reason code。 */
export type JsonSchemaValidationUnavailableCode =
  | "invalid-options"
  | "engine-unavailable"
  | "execution-cancelled"
  | "reference-transport-unavailable"
  | "scan-input-unavailable"
  | "document-unavailable";

/** Schema 或 instance document Record 的稳定 document reason。 */
export type JsonSchemaDocumentReason = JsonDocumentIssue | "out-of-scope";

/** Schema/document Record 中带 `reason` branch 的稳定问题原因。 */
export type JsonSchemaValidationRecordReason = JsonSchemaDocumentReason | SchemaCompileReason;

/** 一条 schema document、compile、instance 或 keyword issue Record 的 data。 */
export type JsonSchemaValidationRecordData =
  | Readonly<{
      readonly kind: "schema-document";
      readonly path: string;
      readonly reason: JsonSchemaDocumentReason;
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
      readonly reason: JsonSchemaDocumentReason;
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

/** Validates only explicitly registered/bound JSON files inside the current global scan scope. */
export async function executeJsonSchemaValidation(
  context: CheckExecutionContext<ResolvedJsonSchemaValidationOptions>
): Promise<CheckResult<JsonSchemaValidationFinalData>> {
  if (!validJsonSchemaValidationOptions(context.options)) return unavailable("invalid-options");

  try {
    return await execute(context);
  } catch {
    return unavailable("engine-unavailable");
  }
}

async function execute(
  context: CheckExecutionContext<ResolvedJsonSchemaValidationOptions>
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
  if (issueCollector.count === 0) {
    return Object.freeze({ data: finalData, status: "passed" });
  }
  return Object.freeze({
    data: finalData,
    messages: Object.freeze([
      Object.freeze({
        code: "schema-validation-issues",
        level: "error" as const,
        message: `${issueCollector.count} schema validation issue(s) were found; inspect this Check's Records${issueCollector.truncated ? " (the published Record list is truncated)" : ""}.`
      })
    ]),
    status: "failed"
  });
}

/** Owns the invocation-local issue count, display cap, and deterministic Record identity ordinal. */
class SchemaIssueCollector {
  #count = 0;
  #reportedCount = 0;
  readonly #issueOccurrences = new Map<string, number>();
  readonly #checkContext: CheckExecutionContext<ResolvedJsonSchemaValidationOptions>;

  constructor(context: CheckExecutionContext<ResolvedJsonSchemaValidationOptions>) {
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

  add(issue: JsonSchemaValidationRecordData): void {
    this.#count += 1;
    if (this.#reportedCount >= MAX_REPORTED_JSON_SCHEMA_ISSUES) return;
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
  return Object.freeze({
    status: "unavailable",
    reason: { code },
    messages: Object.freeze([
      Object.freeze({ code, level: "error" as const, message: unavailableMessage(code) })
    ])
  });
}

function unavailableMessage(code: JsonSchemaValidationUnavailableCode): string {
  switch (code) {
    case "invalid-options":
      return "jsonSchemaValidation options are invalid; recreate the Check with jsonSchemaValidation(options) or restore its complete resolved options.";
    case "scan-input-unavailable":
      return "JSON Schema validation could not collect its configured project files; check the project root, permissions, and selected file source.";
    case "document-unavailable":
      return "A selected schema or instance document could not be read safely; check that it still exists, is readable, and was not replaced during the Run.";
    case "reference-transport-unavailable":
      return "An allowlisted HTTPS schema reference could not be loaded; check the allowlist, network, and remote availability.";
    case "engine-unavailable":
      return "The schema engine could not form a trusted complete result; check package/runtime integrity and inspect any retained issue Records.";
    case "execution-cancelled":
      return "JSON Schema validation was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate.";
  }
}
