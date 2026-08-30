import { resolve } from "node:path";

import type { CheckExecutionContext, CheckMessage, CheckResult } from "../../check/check.ts";
import {
  readStrictJsonDocument,
  type JsonDocumentIssue
} from "../json-document/strict-document.ts";
import { collectProjectFiles } from "../project-files/collection.ts";
import { partitionProjectFilesByEligibility } from "../project-files/input-eligibility.ts";
import type { JsonValidationFinalData } from "./final-data.ts";
import type { ResolvedJsonValidationOptions } from "./options.ts";
import { validJsonValidationOptions } from "./options-validation.ts";

export const JSON_VALIDATION_CHECK_DEFINITION = {
  checkId: "json-validation",
  displayName: "JSON validation"
} as const;

/** `json-validation` whole-Check unavailable outcome 的稳定 reason code。 */
export type JsonValidationUnavailableCode =
  | "invalid-options"
  | "document-unavailable"
  | "execution-cancelled"
  | "scan-input-unavailable";

/** Validates the lower-case JSON subset selected by this Check's options. */
export function executeJsonValidation(
  context: CheckExecutionContext<ResolvedJsonValidationOptions>
): CheckResult<JsonValidationFinalData> {
  if (!validJsonValidationOptions(context.options)) return unavailable("invalid-options");
  if (context.signal.aborted) return unavailable("execution-cancelled");

  const inputs = jsonInputPaths(context);
  if (inputs === undefined) return unavailable("scan-input-unavailable");
  if (context.signal.aborted) return unavailable("execution-cancelled");
  if (inputs.selectedPathCount === 0) return noEligibleInput();
  reportRejectedInputs(context, inputs.rejectedPaths);
  return appendRejectedInputMessage(
    validateJsonPaths(context, inputs.acceptedPaths, inputs.rejectedPaths.length),
    inputs.rejectedPaths.length
  );
}

function validateJsonPaths(
  context: CheckExecutionContext<ResolvedJsonValidationOptions>,
  paths: readonly string[],
  rejectedInputCount: number
): CheckResult<JsonValidationFinalData> {
  const counts = { invalidFileCount: 0, validFileCount: 0 };
  for (const path of paths) {
    if (context.signal.aborted) return unavailable("execution-cancelled");
    const document = readJsonDocument(context, path);
    if (context.signal.aborted) return unavailable("execution-cancelled");
    if (document.kind === "unavailable") return unavailable("document-unavailable");
    if (document.kind === "valid") {
      counts.validFileCount += 1;
      continue;
    }

    counts.invalidFileCount += 1;
    reportInvalidDocument(context, path, document.reason);
  }

  return resultForValidationCounts(paths.length, rejectedInputCount, counts);
}

interface JsonInputPaths {
  readonly acceptedPaths: readonly string[];
  readonly rejectedPaths: readonly string[];
  readonly selectedPathCount: number;
}

function jsonInputPaths(
  context: CheckExecutionContext<ResolvedJsonValidationOptions>
): JsonInputPaths | undefined {
  try {
    const selectedPaths = collectProjectFiles(context.project.root, context.options.files);
    const partition = partitionProjectFilesByEligibility(selectedPaths, isJsonInputPath);
    return Object.freeze({ ...partition, selectedPathCount: selectedPaths.length });
  } catch {
    return undefined;
  }
}

function isJsonInputPath(path: string): boolean {
  return path.endsWith(".json");
}

function noEligibleInput(): CheckResult<JsonValidationFinalData> {
  return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
}

function readJsonDocument(
  context: CheckExecutionContext<ResolvedJsonValidationOptions>,
  path: string
) {
  return readStrictJsonDocument({
    filePath: resolve(context.project.root, path),
    maximumBytes: context.options.maximumBytes
  });
}

function reportInvalidDocument(
  context: CheckExecutionContext<ResolvedJsonValidationOptions>,
  path: string,
  reason: JsonDocumentIssue
): void {
  const record: JsonValidationRecordData = Object.freeze({ path, reason });
  context.records.report({ id: path }, record);
}

function resultForValidationCounts(
  scannedFileCount: number,
  rejectedInputCount: number,
  counts: Readonly<{ invalidFileCount: number; validFileCount: number }>
): CheckResult<JsonValidationFinalData> {
  const data = Object.freeze({
    scannedFileCount,
    validFileCount: counts.validFileCount,
    invalidFileCount: counts.invalidFileCount,
    issueCount: counts.invalidFileCount + rejectedInputCount,
    rejectedInputCount
  });
  if (counts.invalidFileCount === 0) return Object.freeze({ data, status: "passed" });
  return Object.freeze({
    data,
    messages: Object.freeze([
      Object.freeze({
        code: "invalid-json-documents",
        level: "error" as const,
        message: `${counts.invalidFileCount} JSON document(s) are invalid; inspect this Check's Records for each path and reason.`
      })
    ]),
    status: "failed"
  });
}

function reportRejectedInputs(
  context: CheckExecutionContext<ResolvedJsonValidationOptions>,
  paths: readonly string[]
): void {
  for (const path of paths) {
    const data: JsonValidationInputRejectedRecordData = Object.freeze({
      blocking: false,
      kind: "input-rejected",
      path,
      reason: "unsupported-file-type"
    });
    context.records.report({ id: `/input-rejected/${path}` }, data);
  }
}

function appendRejectedInputMessage(
  result: CheckResult<JsonValidationFinalData>,
  rejectedInputCount: number
): CheckResult<JsonValidationFinalData> {
  if (rejectedInputCount === 0) return result;
  const message: CheckMessage = Object.freeze({
    code: "input-rejected",
    level: "warning",
    message: `${rejectedInputCount} selected jsonValidation input file(s) were rejected because only lower-case .json paths are supported; inspect this Check's Records and narrow files.include/exclude.`
  });
  return Object.freeze({
    ...result,
    messages: Object.freeze([...(result.messages ?? []), message])
  });
}

function unavailable(code: JsonValidationUnavailableCode): CheckResult<JsonValidationFinalData> {
  return Object.freeze({
    status: "unavailable",
    reason: { code },
    messages: Object.freeze([
      Object.freeze({ code, level: "error" as const, message: unavailableMessage(code) })
    ])
  });
}

function unavailableMessage(code: JsonValidationUnavailableCode): string {
  switch (code) {
    case "invalid-options":
      return "jsonValidation options are invalid; recreate the Check with jsonValidation(options) or restore its complete resolved options.";
    case "scan-input-unavailable":
      return "JSON validation could not collect its configured project files; check the project root, permissions, and selected file source.";
    case "document-unavailable":
      return "A selected JSON document could not be read safely; check that the file still exists, is readable, and was not replaced during the Run.";
    case "execution-cancelled":
      return "JSON validation was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate.";
  }
}

/** 一条 invalid JSON document supplemental Record 的 data。 */
export interface JsonValidationDocumentRecordData {
  readonly path: string;
  readonly reason: JsonValidationRecordReason;
}

/** 一条 files policy 已选中但不受 JSON validation 支持的输入 Finding。 */
export interface JsonValidationInputRejectedRecordData {
  readonly blocking: false;
  readonly kind: "input-rejected";
  readonly path: string;
  readonly reason: "unsupported-file-type";
}

/** JSON validation 发布的 document issue 或 input-rejection Record data。 */
export type JsonValidationRecordData =
  | JsonValidationDocumentRecordData
  | JsonValidationInputRejectedRecordData;

/** JSON document Record 的稳定问题原因。 */
export type JsonValidationRecordReason = JsonDocumentIssue;
