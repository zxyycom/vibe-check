import { validJsonValidationOptions } from "./options-validation.ts";
import { resolve } from "node:path";

import type { JsonValidationOptions } from "./options.ts";
import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { collectProjectFiles } from "../project-files/collection.ts";
import { readStrictJsonDocument } from "../json-document/strict-document.ts";

export const JSON_VALIDATION_CHECK_DEFINITION = {
  checkId: "json-validation",
  displayName: "JSON validation"
} as const;

interface JsonValidationFinalData {
  readonly scannedFileCount: number;
  readonly validFileCount: number;
  readonly invalidFileCount: number;
  readonly issueCount: number;
}

type JsonValidationUnavailableCode =
  | "invalid-options"
  | "document-unavailable"
  | "execution-cancelled"
  | "scan-input-unavailable";

/** Validates the lower-case JSON subset selected by this Check's options. */
export function executeJsonValidation(
  context: CheckExecutionContext<JsonValidationOptions>
): CheckResult<JsonValidationFinalData> {
  if (!validJsonValidationOptions(context.options)) return unavailable("invalid-options");
  if (context.signal.aborted) return unavailable("execution-cancelled");

  let paths: string[];
  try {
    paths = collectProjectFiles(context.project.root, context.options.files).filter((path) =>
      path.endsWith(".json")
    );
  } catch {
    return unavailable("scan-input-unavailable");
  }
  if (context.signal.aborted) return unavailable("execution-cancelled");
  if (paths.length === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }

  let invalidFileCount = 0;
  let validFileCount = 0;
  for (const path of paths) {
    if (context.signal.aborted) return unavailable("execution-cancelled");
    const document = readStrictJsonDocument({
      filePath: resolve(context.project.root, path),
      maximumBytes: context.options.maximumBytes
    });
    if (context.signal.aborted) return unavailable("execution-cancelled");
    if (document.kind === "unavailable") return unavailable("document-unavailable");
    if (document.kind === "valid") {
      validFileCount += 1;
      continue;
    }

    invalidFileCount += 1;
    context.records.report({ id: path }, { path, reason: document.reason });
  }

  const data = Object.freeze({
    scannedFileCount: paths.length,
    validFileCount,
    invalidFileCount,
    issueCount: invalidFileCount
  });
  return Object.freeze({ status: invalidFileCount === 0 ? "passed" : "failed", data });
}

function unavailable(code: JsonValidationUnavailableCode): CheckResult<JsonValidationFinalData> {
  return Object.freeze({ status: "unavailable", reason: { code } });
}
