import { defineCheck } from "../../definition/custom-check.ts";
import {
  DEFAULT_CODE_AREAS,
  DEFAULT_PROJECT_FILE_SELECTION
} from "../../project-files/configuration.ts";
import { FUNCTION_METRICS_CHECK_DEFINITION, executeFunctionMetrics } from "./execution.ts";
import type { FunctionMetricsOptions } from "./options.ts";
/** 以 lizard 计算 function 级指标的完整 default Check。 */
export const functionMetrics = defineCheck<"function-metrics", FunctionMetricsOptions>({
  ...FUNCTION_METRICS_CHECK_DEFINITION,
  execution: executeFunctionMetrics,
  options: {
    codeAreas: DEFAULT_CODE_AREAS,
    files: DEFAULT_PROJECT_FILE_SELECTION,
    scanner: { args: [], availabilityArgs: ["--version"], executable: "lizard" },
    codeLines: {
      absoluteFloor: 50,
      lowComplexityAllowance: { codeLineFloor: 150, maxCyclomaticComplexityExclusive: 5 }
    },
    cyclomaticComplexity: { absoluteFloor: 10 },
    parameterCount: { absoluteFloor: 5 }
  }
});
