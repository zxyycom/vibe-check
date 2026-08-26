import { defineCheck } from "../../check/check.ts";
import { DEFAULT_PROJECT_FILE_SELECTION } from "../project-files/configuration.ts";
import {
  JSON_SCHEMA_VALIDATION_CHECK_DEFINITION,
  executeJsonSchemaValidation
} from "./json-schema-validation.ts";
import type { JsonSchemaValidationOptions } from "./options.ts";
import { validJsonSchemaValidationOptions } from "./options-validation.ts";
/** 以显式 schema registry/binding 验证本 Check 选中 JSON instances 的完整 default Check。 */
export const jsonSchemaValidation = defineCheck<
  "json-schema-validation",
  JsonSchemaValidationOptions
>({
  ...JSON_SCHEMA_VALIDATION_CHECK_DEFINITION,
  execution: executeJsonSchemaValidation,
  preflight: (options) =>
    validJsonSchemaValidationOptions(options)
      ? { status: "success", preparedOptions: options }
      : { status: "failure", action: "block", reason: { code: "invalid-options" } },
  options: {
    files: DEFAULT_PROJECT_FILE_SELECTION,
    maximumBytes: 1_048_576,
    schemaIdentity: { mode: "require-match" },
    referenceResolution: { mode: "offline" },
    schemas: [],
    bindings: []
  }
});
