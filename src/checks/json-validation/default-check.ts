import { defineCheck } from "../../definition/custom-check.ts";
import { DEFAULT_PROJECT_FILE_SELECTION } from "../../project-files/configuration.ts";
import { JSON_VALIDATION_CHECK_DEFINITION, executeJsonValidation } from "./json-validation.ts";
import type { JsonValidationOptions } from "./options.ts";
import { validJsonValidationOptions } from "./options-validation.ts";
/** 严格验证本 Check 文件选择中小写 `.json` 文件的完整 default Check。 */
export const jsonValidation = defineCheck<"json-validation", JsonValidationOptions>({
  ...JSON_VALIDATION_CHECK_DEFINITION,
  execution: executeJsonValidation,
  preflight: (options) =>
    validJsonValidationOptions(options)
      ? { status: "success", preparedOptions: options }
      : { status: "failure", action: "block", reason: { code: "invalid-options" } },
  options: { files: DEFAULT_PROJECT_FILE_SELECTION, maximumBytes: 1_048_576 }
});
