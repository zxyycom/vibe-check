import { defineCheck } from "../../definition/custom-check.ts";
import {
  DEFAULT_CODE_AREAS,
  DEFAULT_PROJECT_FILE_SELECTION
} from "../../project-files/configuration.ts";
import { DEFAULT_JSCPD_COMMAND } from "./jscpd/default-command.ts";
import { DUPLICATE_DETECTION_CHECK_DEFINITION, executeDuplicateDetection } from "./execution.ts";
import type { DuplicateDetectionOptions } from "./options.ts";
/** 检测项目范围内重复代码的完整 default Check。 */
export const duplicateDetection = defineCheck<"duplicate-detection", DuplicateDetectionOptions>({
  ...DUPLICATE_DETECTION_CHECK_DEFINITION,
  execution: executeDuplicateDetection,
  options: {
    codeAreas: DEFAULT_CODE_AREAS,
    files: DEFAULT_PROJECT_FILE_SELECTION,
    scanner: { ...DEFAULT_JSCPD_COMMAND, maxConcurrency: 4 },
    defaultMinimumTokens: 75,
    minimumTokensByCodeArea: {}
  }
});
