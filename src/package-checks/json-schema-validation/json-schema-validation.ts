import type { DeepReadonly, CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { collectProjectFiles } from "../project-files/collection.ts";
import type { JsonDocumentIssue } from "../json-document/strict-document.ts";
import { compileSchemaSet, type SchemaCompileReason } from "./schema-engine.ts";
import {
  loadConfiguredSchemas,
  reportCompilationFailures,
  validateSchemaBindings
} from "./execution-stages.ts";
import { type JsonSchemaValidationFinalData } from "./final-data.ts";
import { SchemaIssueCollector } from "./issue-collector.ts";
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
  options: DeepReadonly<ResolvedJsonSchemaValidationOptions>,
  context: Pick<CheckExecutionContext, "project" | "records" | "signal">
): Promise<CheckResult<JsonSchemaValidationFinalData>> {
  if (!validJsonSchemaValidationOptions(options)) return unavailable("invalid-options");

  try {
    return await execute(options, context);
  } catch {
    return unavailable("engine-unavailable");
  }
}

async function execute(
  options: DeepReadonly<ResolvedJsonSchemaValidationOptions>,
  context: Pick<CheckExecutionContext, "project" | "records" | "signal">
): Promise<CheckResult<JsonSchemaValidationFinalData>> {
  if (context.signal.aborted) return unavailable("execution-cancelled");
  if (options.bindings.length === 0) return noBindingsResult();
  const selectedPaths = selectedProjectPaths(options, context);
  if (selectedPaths === undefined) return unavailable("scan-input-unavailable");
  if (context.signal.aborted) return unavailable("execution-cancelled");

  const issueCollector = new SchemaIssueCollector(context);
  const loaded = await loadConfiguredSchemas(options, context, selectedPaths, issueCollector);
  if (loaded.kind === "unavailable") return unavailable(loaded.code);
  const compilation = await compileSchemaSet({
    referenceResolution: options.referenceResolution,
    schemaIdentity: options.schemaIdentity,
    schemas: loaded.value.schemas,
    signal: context.signal
  });
  if (compilation.kind === "unavailable") return unavailable(compilation.reason);
  if (context.signal.aborted) return unavailable("execution-cancelled");

  const schemaFailures = new Set(loaded.value.failures);
  reportCompilationFailures(options, compilation.compiledSchemaSet, schemaFailures, issueCollector);
  const bindings = await validateSchemaBindings({
    options,
    context,
    selectedPaths,
    compiled: compilation.compiledSchemaSet,
    schemaFailures,
    issueCollector
  });
  if (bindings.kind === "unavailable") return unavailable(bindings.code);
  return completedValidationResult(options, context, bindings.value, issueCollector);
}

function selectedProjectPaths(
  options: DeepReadonly<ResolvedJsonSchemaValidationOptions>,
  context: Pick<CheckExecutionContext, "project" | "records" | "signal">
): ReadonlySet<string> | undefined {
  try {
    return new Set(collectProjectFiles(context.project.root, options.files));
  } catch {
    return undefined;
  }
}

function noBindingsResult(): CheckResult<JsonSchemaValidationFinalData> {
  return Object.freeze({ status: "not-applicable", reason: { code: "no-bindings" } });
}

function completedValidationResult(
  options: DeepReadonly<ResolvedJsonSchemaValidationOptions>,
  context: Pick<CheckExecutionContext, "project" | "records" | "signal">,
  bindings: Readonly<{
    readonly blockedBindingCount: number;
    readonly invalidBindingCount: number;
    readonly validBindingCount: number;
  }>,
  issueCollector: SchemaIssueCollector
): CheckResult<JsonSchemaValidationFinalData> {
  const data = Object.freeze({
    bindingCount: options.bindings.length,
    blockedBindingCount: bindings.blockedBindingCount,
    invalidBindingCount: bindings.invalidBindingCount,
    issueCount: issueCollector.count,
    issuesTruncated: issueCollector.truncated,
    reportedIssueCount: issueCollector.reportedCount,
    schemaCount: options.schemas.length,
    validBindingCount: bindings.validBindingCount
  });
  if (issueCollector.count === 0) return Object.freeze({ data, status: "passed" });
  return Object.freeze({
    data,
    messages: Object.freeze([
      Object.freeze({
        code: "schema-validation-issues",
        level: "error" as const,
        message: validationIssueMessage(issueCollector)
      })
    ]),
    status: "failed"
  });
}

function validationIssueMessage(issueCollector: SchemaIssueCollector): string {
  const truncation = issueCollector.truncated ? " (the published Record list is truncated)" : "";
  return `${issueCollector.count} schema validation issue(s) were found; inspect this Check's Records${truncation}.`;
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
