import { isNonArrayRecord, isStringArray } from "./foundation/src/type-guards.ts";
import {
  WARNING_POLICIES,
  type CodeAreaDefinition,
  type CodeAreaWarningPolicy,
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
  if (root === undefined) return undefined;
  const checks = parseChecks(root.checks);
  const codeAreas = parseCodeAreas(root.codeAreas);
  const excludeDirs = parseStringArray(root.excludeDirs);
  const generatedFiles = parseStringArray(root.generatedFiles);
  const include = parseStringArray(root.include);
  const report = parseReport(root.report);
  if (checks === undefined || codeAreas === undefined || excludeDirs === undefined
    || generatedFiles === undefined || include === undefined || report === undefined
    || !minimumTokenAreasAreKnown(checks, codeAreas) || !isValidTimeZone(report.timeZone)) {
    return undefined;
  }
  return deepFreeze({ checks, codeAreas, excludeDirs, generatedFiles, include, report });
}

function parseChecks(value: unknown): ProjectQualityConfiguration["checks"] | undefined {
  const checks = exactKeys(value, ["duplication", "files", "functions"]);
  if (checks === undefined) return undefined;
  const duplication = parseDuplicationChecks(checks.duplication);
  const files = parseFileChecks(checks.files);
  const functions = parseFunctionChecks(checks.functions);
  return duplication === undefined || files === undefined || functions === undefined
    ? undefined
    : Object.freeze({ duplication, files, functions });
}

function parseDuplicationChecks(
  value: unknown
): ProjectQualityConfiguration["checks"]["duplication"] | undefined {
  const duplication = exactKeys(
    value,
    ["defaultMinimumTokens", "fragments", "minimumTokensByCodeArea"]
  );
  const fragments = exactKeys(duplication?.fragments, ["changedDelta"]);
  const minimumTokensByCodeArea = duplication === undefined
    ? undefined
    : parseNumberRecord(duplication.minimumTokensByCodeArea);
  if (duplication === undefined || fragments === undefined || minimumTokensByCodeArea === undefined
    || !finiteNumber(duplication.defaultMinimumTokens) || !finiteNumber(fragments.changedDelta)) {
    return undefined;
  }
  return Object.freeze({
    defaultMinimumTokens: duplication.defaultMinimumTokens,
    fragments: Object.freeze({ changedDelta: fragments.changedDelta }),
    minimumTokensByCodeArea
  });
}

function parseFileChecks(
  value: unknown
): ProjectQualityConfiguration["checks"]["files"] | undefined {
  const files = exactKeys(value, ["codeLines"]);
  const codeLines = exactKeys(
    files?.codeLines,
    ["absoluteFloor", "changedDelta", "lowDecisionTokenAllowance"]
  );
  const allowance = exactKeys(
    codeLines?.lowDecisionTokenAllowance,
    ["codeLineFloor", "maxDecisionTokens"]
  );
  if (codeLines === undefined || allowance === undefined || !threshold(codeLines)
    || !finiteNumber(allowance.codeLineFloor) || !finiteNumber(allowance.maxDecisionTokens)) {
    return undefined;
  }
  return Object.freeze({
    codeLines: Object.freeze({
      absoluteFloor: codeLines.absoluteFloor,
      changedDelta: codeLines.changedDelta,
      lowDecisionTokenAllowance: Object.freeze({
        codeLineFloor: allowance.codeLineFloor,
        maxDecisionTokens: allowance.maxDecisionTokens
      })
    })
  });
}

function parseFunctionChecks(
  value: unknown
): ProjectQualityConfiguration["checks"]["functions"] | undefined {
  const functions = exactKeys(value, ["codeLines", "cyclomaticComplexity", "parameterCount"]);
  const codeLines = exactKeys(
    functions?.codeLines,
    ["absoluteFloor", "changedDelta", "lowComplexityAllowance"]
  );
  const allowance = exactKeys(
    codeLines?.lowComplexityAllowance,
    ["codeLineFloor", "maxCyclomaticComplexityExclusive"]
  );
  const cyclomaticComplexity = exactKeys(
    functions?.cyclomaticComplexity,
    ["absoluteFloor", "changedDelta"]
  );
  const parameterCount = exactKeys(functions?.parameterCount, ["absoluteFloor", "changedDelta"]);
  if (codeLines === undefined || allowance === undefined || cyclomaticComplexity === undefined
    || parameterCount === undefined || !threshold(codeLines) || !threshold(cyclomaticComplexity)
    || !threshold(parameterCount) || !finiteNumber(allowance.codeLineFloor)
    || !finiteNumber(allowance.maxCyclomaticComplexityExclusive)) {
    return undefined;
  }
  return Object.freeze({
    codeLines: Object.freeze({
      absoluteFloor: codeLines.absoluteFloor,
      changedDelta: codeLines.changedDelta,
      lowComplexityAllowance: Object.freeze({
        codeLineFloor: allowance.codeLineFloor,
        maxCyclomaticComplexityExclusive: allowance.maxCyclomaticComplexityExclusive
      })
    }),
    cyclomaticComplexity: Object.freeze({
      absoluteFloor: cyclomaticComplexity.absoluteFloor,
      changedDelta: cyclomaticComplexity.changedDelta
    }),
    parameterCount: Object.freeze({
      absoluteFloor: parameterCount.absoluteFloor,
      changedDelta: parameterCount.changedDelta
    })
  });
}

function parseCodeAreas(value: unknown): ProjectQualityConfiguration["codeAreas"] | undefined {
  if (!isNonArrayRecord(value)) return undefined;
  const areas: Record<string, CodeAreaDefinition> = {};
  for (const [name, candidate] of Object.entries(value)) {
    const area = exactKeys(candidate, ["description", "excludeGlobs", "globs", "warningPolicy"]);
    const excludeGlobs = area === undefined ? undefined : parseStringArray(area.excludeGlobs);
    const globs = area === undefined ? undefined : parseStringArray(area.globs);
    if (area === undefined || excludeGlobs === undefined || globs === undefined
      || typeof area.description !== "string" || !isWarningPolicy(area.warningPolicy)) {
      return undefined;
    }
    areas[name] = Object.freeze({
      description: area.description,
      excludeGlobs,
      globs,
      warningPolicy: area.warningPolicy
    });
  }
  return Object.freeze(areas);
}

function parseReport(value: unknown): ProjectQualityConfiguration["report"] | undefined {
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
  if (report === undefined || typeof report.footerGeneratedBy !== "string"
    || typeof report.footerNotice !== "string" || typeof report.nonBlockingNotice !== "string"
    || typeof report.showWatchlist !== "boolean" || typeof report.timeZone !== "string"
    || typeof report.title !== "string" || !finiteNumber(report.topN)
    || !finiteNumber(report.watchlistMax)) {
    return undefined;
  }
  return Object.freeze({
    footerGeneratedBy: report.footerGeneratedBy,
    footerNotice: report.footerNotice,
    nonBlockingNotice: report.nonBlockingNotice,
    showWatchlist: report.showWatchlist,
    timeZone: report.timeZone,
    title: report.title,
    topN: report.topN,
    watchlistMax: report.watchlistMax
  });
}

function minimumTokenAreasAreKnown(
  checks: ProjectQualityConfiguration["checks"],
  codeAreas: ProjectQualityConfiguration["codeAreas"]
): boolean {
  return Object.keys(checks.duplication.minimumTokensByCodeArea)
    .every((area) => Object.hasOwn(codeAreas, area));
}

function parseNumberRecord(value: unknown): Readonly<Record<string, number>> | undefined {
  if (!isNonArrayRecord(value)) return undefined;
  const record: Record<string, number> = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (!finiteNumber(candidate)) return undefined;
    record[key] = candidate;
  }
  return Object.freeze(record);
}

function parseStringArray(value: unknown): readonly string[] | undefined {
  return isStringArray(value) ? Object.freeze([...value]) : undefined;
}

function isWarningPolicy(value: unknown): value is CodeAreaWarningPolicy {
  return typeof value === "string" && WARNING_POLICIES.some((policy) => policy === value);
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

function threshold(
  value: Readonly<Record<string, unknown>>
): value is Readonly<Record<string, unknown>> & Readonly<{
  readonly absoluteFloor: number;
  readonly changedDelta: number;
}> {
  return finiteNumber(value.absoluteFloor) && finiteNumber(value.changedDelta);
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
