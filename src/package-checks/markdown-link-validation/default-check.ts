import { defineCheck } from "../../check/check.ts";
import { DEFAULT_PROJECT_FILE_SELECTION } from "../project-files/configuration.ts";
import {
  MARKDOWN_LINK_VALIDATION_CHECK_DEFINITION,
  executeMarkdownLinkValidation
} from "./execution.ts";
import type { MarkdownLinkValidationOptions } from "./options.ts";
import { validMarkdownLinkValidationOptions } from "./options-validation.ts";
/** 校验离线本地 Markdown 引用完整性的完整 default Check。 */
export const markdownLinkValidation = defineCheck<
  "markdown-link-validation",
  MarkdownLinkValidationOptions
>({
  ...MARKDOWN_LINK_VALIDATION_CHECK_DEFINITION,
  execution: executeMarkdownLinkValidation,
  preflight: (options) =>
    validMarkdownLinkValidationOptions(options)
      ? { status: "success", preparedOptions: options }
      : { status: "failure", action: "block", reason: { code: "invalid-options" } },
  options: {
    files: DEFAULT_PROJECT_FILE_SELECTION,
    requireExistingTargets: true,
    validateSameDocumentAnchors: true,
    validateCrossDocumentAnchors: true,
    rootExternalTargetMode: "report",
    requireNonEmptyDirectories: false,
    limits: { maxMarkdownBytes: 1_048_576, maxOccurrences: 10_000, maxTargetReads: 1_000 }
  }
});
