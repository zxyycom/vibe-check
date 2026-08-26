import { defineCheck } from "../../check/check.ts";
import {
  DEFAULT_CODE_AREAS,
  DEFAULT_PROJECT_FILE_SELECTION
} from "../project-files/configuration.ts";
import { DEFAULT_JSCPD_COMMAND } from "./jscpd/default-command.ts";
import { DUPLICATE_DETECTION_CHECK_DEFINITION, executeDuplicateDetection } from "./execution.ts";
import type { DuplicateDetectionOptions } from "./options.ts";
import { validDuplicateDetectionOptions } from "./options-validation.ts";
/** 检测项目范围内重复代码的完整 default Check。 */
export const duplicateDetection = defineCheck<"duplicate-detection", DuplicateDetectionOptions>({
  ...DUPLICATE_DETECTION_CHECK_DEFINITION,
  execution: executeDuplicateDetection,
  preflight: (options) =>
    validDuplicateDetectionOptions(options)
      ? { status: "success", preparedOptions: options }
      : { status: "failure", action: "block", reason: { code: "invalid-options" } },
  options: {
    cache: { directory: ".cache/vibe-check", enabled: true },
    codeAreas: DEFAULT_CODE_AREAS,
    files: DEFAULT_PROJECT_FILE_SELECTION,
    scanner: { ...DEFAULT_JSCPD_COMMAND, maxConcurrency: 4 },
    defaultMinimumTokens: 75,
    minimumTokensByCodeArea: {}
  }
});
