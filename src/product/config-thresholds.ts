import {
  exactObject,
  finiteNumber,
  nullableStringRecord,
  numberRecord
} from "./config-validation.ts";
import type {
  QualityConfig,
  QualityThreshold
} from "./quality-core/src/model/schema.ts";

export function parseLizardConfig(input: unknown): QualityConfig["lizard"] {
  const lizard = exactObject(
    input,
    "config.lizard",
    ["cyclomaticComplexity", "functionCodeDensity", "parameterCount"]
  );
  const functionDensity = exactObject(
    lizard.functionCodeDensity,
    "config.lizard.functionCodeDensity",
    ["absoluteFloor", "changedDelta", "lowComplexityAllowance"]
  );
  const allowance = exactObject(
    functionDensity.lowComplexityAllowance,
    "config.lizard.functionCodeDensity.lowComplexityAllowance",
    ["codeLineFloor", "maxCyclomaticComplexityExclusive"]
  );

  return {
    cyclomaticComplexity: parseQualityThreshold(
      lizard.cyclomaticComplexity,
      "config.lizard.cyclomaticComplexity"
    ),
    functionCodeDensity: {
      absoluteFloor: finiteNumber(
        functionDensity.absoluteFloor,
        "config.lizard.functionCodeDensity.absoluteFloor"
      ),
      changedDelta: finiteNumber(
        functionDensity.changedDelta,
        "config.lizard.functionCodeDensity.changedDelta"
      ),
      lowComplexityAllowance: {
        codeLineFloor: finiteNumber(
          allowance.codeLineFloor,
          "config.lizard.functionCodeDensity.lowComplexityAllowance.codeLineFloor"
        ),
        maxCyclomaticComplexityExclusive: finiteNumber(
          allowance.maxCyclomaticComplexityExclusive,
          "config.lizard.functionCodeDensity.lowComplexityAllowance.maxCyclomaticComplexityExclusive"
        )
      }
    },
    parameterCount: parseQualityThreshold(
      lizard.parameterCount,
      "config.lizard.parameterCount"
    )
  };
}

export function parseSccConfig(input: unknown): QualityConfig["scc"] {
  const scc = exactObject(input, "config.scc", ["fileCodeLines"]);
  const fileCodeLines = exactObject(
    scc.fileCodeLines,
    "config.scc.fileCodeLines",
    ["absoluteFloor", "changedDelta", "lowDecisionTokenAllowance"]
  );
  const allowance = exactObject(
    fileCodeLines.lowDecisionTokenAllowance,
    "config.scc.fileCodeLines.lowDecisionTokenAllowance",
    ["codeLineFloor", "maxDecisionTokens"]
  );

  return {
    fileCodeLines: {
      absoluteFloor: finiteNumber(
        fileCodeLines.absoluteFloor,
        "config.scc.fileCodeLines.absoluteFloor"
      ),
      changedDelta: finiteNumber(
        fileCodeLines.changedDelta,
        "config.scc.fileCodeLines.changedDelta"
      ),
      lowDecisionTokenAllowance: {
        codeLineFloor: finiteNumber(
          allowance.codeLineFloor,
          "config.scc.fileCodeLines.lowDecisionTokenAllowance.codeLineFloor"
        ),
        maxDecisionTokens: finiteNumber(
          allowance.maxDecisionTokens,
          "config.scc.fileCodeLines.lowDecisionTokenAllowance.maxDecisionTokens"
        )
      }
    }
  };
}

export function parseJscpdConfig(input: unknown): QualityConfig["jscpd"] {
  const jscpd = exactObject(
    input,
    "config.jscpd",
    [
      "defaultMinimumTokens",
      "duplicateFragments",
      "formatByCodeArea",
      "maxParallelTasks",
      "minimumTokens"
    ]
  );
  const duplicateFragments = exactObject(
    jscpd.duplicateFragments,
    "config.jscpd.duplicateFragments",
    ["changedDelta"]
  );

  return {
    defaultMinimumTokens: finiteNumber(
      jscpd.defaultMinimumTokens,
      "config.jscpd.defaultMinimumTokens"
    ),
    duplicateFragments: {
      changedDelta: finiteNumber(
        duplicateFragments.changedDelta,
        "config.jscpd.duplicateFragments.changedDelta"
      )
    },
    formatByCodeArea: nullableStringRecord(
      jscpd.formatByCodeArea,
      "config.jscpd.formatByCodeArea"
    ),
    maxParallelTasks: finiteNumber(
      jscpd.maxParallelTasks,
      "config.jscpd.maxParallelTasks"
    ),
    minimumTokens: numberRecord(jscpd.minimumTokens, "config.jscpd.minimumTokens")
  };
}

function parseQualityThreshold(input: unknown, path: string): QualityThreshold {
  const threshold = exactObject(input, path, ["absoluteFloor", "changedDelta"]);
  return {
    absoluteFloor: finiteNumber(threshold.absoluteFloor, `${path}.absoluteFloor`),
    changedDelta: finiteNumber(threshold.changedDelta, `${path}.changedDelta`)
  };
}
