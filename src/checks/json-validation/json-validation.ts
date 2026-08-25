import { resolve } from "node:path";

import type { JsonValidationOptions } from "../../definition/default-checks.ts";
import type { CheckExecutionContext, CheckResult } from "../../definition/custom-check.ts";
import { collectScanFiles } from "../input/files.ts";
import { readStrictJsonDocument } from "./strict-document.ts";

export const JSON_VALIDATION_CHECK_DEFINITION = {
  checkId: "json-validation",
  displayName: "JSON validation"
} as const;

/** Validates the exact JSON subset of the current global scan scope. */
export function executeJsonValidation(
  context: CheckExecutionContext<JsonValidationOptions>
): CheckResult {
  if (context.signal.aborted) return unavailable("execution-cancelled");

  let paths: string[];
  try {
    paths = collectScanFiles(context.project.root, context.project.files).filter((path) =>
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

function unavailable(code: string): CheckResult {
  return Object.freeze({ status: "unavailable", reason: { code } });
}
