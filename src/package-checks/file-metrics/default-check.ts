import { defineCheck } from "../../check/check.ts";
import {
  DEFAULT_CODE_AREAS,
  DEFAULT_PROJECT_FILE_SELECTION
} from "../project-files/configuration.ts";
import { FILE_METRICS_CHECK_DEFINITION, executeFileMetrics } from "./execution.ts";
import type { FileMetricsOptions } from "./options.ts";
import { validFileMetricsOptions } from "./options-validation.ts";
/** 以 scc 计算文件级 code-line 指标的完整 default Check。 */
export const fileMetrics = defineCheck<"file-metrics", FileMetricsOptions>({
  ...FILE_METRICS_CHECK_DEFINITION,
  execution: executeFileMetrics,
  preflight: (options) =>
    validFileMetricsOptions(options)
      ? { status: "success", preparedOptions: options }
      : { status: "failure", action: "block", reason: { code: "invalid-options" } },
  options: {
    codeAreas: DEFAULT_CODE_AREAS,
    files: DEFAULT_PROJECT_FILE_SELECTION,
    scanner: { args: [], availabilityArgs: ["--version"], executable: "scc" },
    codeLines: {
      absoluteFloor: 300,
      lowDecisionTokenAllowance: { codeLineFloor: 500, maxDecisionTokens: 10 }
    }
  }
});
