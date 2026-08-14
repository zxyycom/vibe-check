import { isNonArrayRecord, isStringArray } from "./foundation/src/type-guards.ts";
import {
  WARNING_POLICIES,
  type ResolvedQualityConfig
} from "./quality-core/src/model/schema.ts";

export type ProjectQualityConfiguration = ResolvedQualityConfig;

export const NEUTRAL_QUALITY_CONFIGURATION: ProjectQualityConfiguration = deepFreeze({
  checks: {
    duplication: {
      defaultMinimumTokens: 75,
      fragments: { changedDelta: 1 },
      minimumTokensByCodeArea: {}
    },
    files: {
      codeLines: {
        absoluteFloor: 300,
        changedDelta: 80,
        lowDecisionTokenAllowance: {
          codeLineFloor: 500,
          maxDecisionTokens: 10
        }
      }
    },
    functions: {
      codeLines: {
        absoluteFloor: 50,
        changedDelta: 20,
        lowComplexityAllowance: {
          codeLineFloor: 150,
          maxCyclomaticComplexityExclusive: 5
        }
      },
      cyclomaticComplexity: { absoluteFloor: 10, changedDelta: 5 },
      parameterCount: { absoluteFloor: 5, changedDelta: 2 }
    }
  },
  codeAreas: {
    project: {
      description: "This project",
      excludeGlobs: [],
      globs: ["**/*"],
      warningPolicy: "moderate"
    }
  },
  excludeDirs: [
    ".git",
    ".vibe-check",
    ".cache",
    ".venv",
    "artifacts",
    "build",
    "dist",
    "node_modules",
    "target",
    "vendor"
  ],
  generatedFiles: ["**/generated/**", "**/*.generated.*"],
  include: ["**/*"],
  report: {
    footerGeneratedBy: "Vibe Check",
    footerNotice: "Review findings for this project.",
    nonBlockingNotice: "This project scan is observational unless a gate is explicitly enabled.",
    showWatchlist: true,
    timeZone: "UTC",
    title: "This project quality report",
    topN: 20,
    watchlistMax: 50
  }
});

export function parseQualityConfiguration(value: unknown): ProjectQualityConfiguration | undefined {
  const root = exactKeys(value, [
    "checks",
    "codeAreas",
    "excludeDirs",
    "generatedFiles",
    "include",
    "report"
  ]);
  if (root === undefined || !validRootFields(root)) return undefined;
  const minimumTokenAreas = exactKeys(
    exactKeys(root.checks, ["duplication", "files", "functions"])?.duplication,
    ["defaultMinimumTokens", "fragments", "minimumTokensByCodeArea"]
  )?.minimumTokensByCodeArea;
  const codeAreas = root.codeAreas as Readonly<Record<string, unknown>>;
  if (!isNonArrayRecord(minimumTokenAreas)
    || Object.keys(minimumTokenAreas).some((area) => !Object.hasOwn(codeAreas, area))) {
    return undefined;
  }
  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: (root.report as Readonly<Record<string, unknown>>).timeZone as string
    }).format(0);
    return deepFreeze(structuredClone(root)) as unknown as ProjectQualityConfiguration;
  } catch {
    return undefined;
  }
}

function validChecks(value: unknown): boolean {
  const checks = exactKeys(value, ["duplication", "files", "functions"]);
  return checks !== undefined && validDuplicationChecks(checks.duplication)
    && validFileChecks(checks.files) && validFunctionChecks(checks.functions);
}

function validDuplicationChecks(value: unknown): boolean {
  const duplication = exactKeys(
    value,
    ["defaultMinimumTokens", "fragments", "minimumTokensByCodeArea"]
  );
  const fragments = exactKeys(duplication?.fragments, ["changedDelta"]);
  return duplication !== undefined && fragments !== undefined
    && numericValues(duplication.minimumTokensByCodeArea)
    && finiteNumber(duplication.defaultMinimumTokens)
    && finiteNumber(fragments.changedDelta);
}

function validFileChecks(value: unknown): boolean {
  const files = exactKeys(value, ["codeLines"]);
  const fileLines = exactKeys(
    files?.codeLines,
    ["absoluteFloor", "changedDelta", "lowDecisionTokenAllowance"]
  );
  const decisionAllowance = exactKeys(
    fileLines?.lowDecisionTokenAllowance,
    ["codeLineFloor", "maxDecisionTokens"]
  );
  return threshold(fileLines) && numericRecord(decisionAllowance);
}

function validFunctionChecks(value: unknown): boolean {
  const functions = exactKeys(
    value,
    ["codeLines", "cyclomaticComplexity", "parameterCount"]
  );
  const functionLines = exactKeys(
    functions?.codeLines,
    ["absoluteFloor", "changedDelta", "lowComplexityAllowance"]
  );
  const complexityAllowance = exactKeys(
    functionLines?.lowComplexityAllowance,
    ["codeLineFloor", "maxCyclomaticComplexityExclusive"]
  );
  return threshold(functionLines) && numericRecord(complexityAllowance)
    && threshold(exactKeys(functions?.cyclomaticComplexity, ["absoluteFloor", "changedDelta"]))
    && threshold(exactKeys(functions?.parameterCount, ["absoluteFloor", "changedDelta"]));
}

function validRootFields(root: Readonly<Record<string, unknown>>): boolean {
  return isStringArray(root.excludeDirs) && isStringArray(root.generatedFiles)
    && isStringArray(root.include) && validChecks(root.checks)
    && validCodeAreas(root.codeAreas) && validReport(root.report);
}

function validCodeAreas(value: unknown): boolean {
  if (!isNonArrayRecord(value)) return false;
  return Object.values(value).every((candidate) => {
    const area = exactKeys(candidate, ["description", "excludeGlobs", "globs", "warningPolicy"]);
    return typeof area?.description === "string" && isStringArray(area.excludeGlobs)
      && isStringArray(area.globs) && typeof area.warningPolicy === "string"
      && WARNING_POLICIES.includes(area.warningPolicy as never);
  });
}

function validReport(value: unknown): boolean {
  const report = exactKeys(value, [
    "footerGeneratedBy",
    "footerNotice",
    "nonBlockingNotice",
    "showWatchlist",
    "timeZone",
    "title",
    "topN",
    "watchlistMax"
  ]);
  return typeof report?.footerGeneratedBy === "string"
    && typeof report.footerNotice === "string"
    && typeof report.nonBlockingNotice === "string"
    && typeof report.showWatchlist === "boolean"
    && typeof report.timeZone === "string"
    && typeof report.title === "string"
    && finiteNumber(report.topN)
    && finiteNumber(report.watchlistMax);
}

function threshold(value: Readonly<Record<string, unknown>> | undefined): boolean {
  return finiteNumber(value?.absoluteFloor) && finiteNumber(value?.changedDelta);
}

function numericRecord(value: Readonly<Record<string, unknown>> | undefined): boolean {
  return value !== undefined && Object.values(value).every(finiteNumber);
}

function numericValues(value: unknown): boolean {
  return isNonArrayRecord(value) && Object.values(value).every(finiteNumber);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function exactKeys(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  return isNonArrayRecord(value) && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key))
    ? value
    : undefined;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}
