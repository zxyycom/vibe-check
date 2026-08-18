import type {
  DuplicateDetectionOptions,
  FileMetricsOptions,
  FunctionMetricsOptions
} from "./built-ins.ts";
import {
  WARNING_POLICIES,
  type CodeAreaDefinition,
  type CodeAreaWarningPolicy,
  type ResolvedQualityConfig
} from "../quality-core/model/schema.ts";
import {
  snapshotClosedArray,
  snapshotClosedRecord
} from "../quality-core/check-record/plain-record-values.ts";

export type ProjectQualityConfiguration = Readonly<Omit<ResolvedQualityConfig, "checks">>;

export const NEUTRAL_QUALITY_CONFIGURATION: ProjectQualityConfiguration = deepFreeze({
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

export function resolveQualityConfiguration(
  input: Readonly<{
    project: ProjectQualityConfiguration;
    checks: Readonly<{
      duplication: DuplicateDetectionOptions;
      files: FileMetricsOptions;
      functions: FunctionMetricsOptions;
    }>;
  }>
): ResolvedQualityConfig {
  return deepFreeze({
    ...input.project,
    checks: input.checks
  });
}

export function parseQualityConfiguration(value: unknown): ProjectQualityConfiguration | undefined {
  const root = exactKeys(value, [
    "codeAreas",
    "excludeDirs",
    "generatedFiles",
    "include",
    "report"
  ]);
  if (root === undefined) return undefined;
  const codeAreas = parseCodeAreas(root.codeAreas);
  const excludeDirs = parseStringArray(root.excludeDirs);
  const generatedFiles = parseStringArray(root.generatedFiles);
  const include = parseStringArray(root.include);
  const report = parseReport(root.report);
  if (
    codeAreas === undefined ||
    excludeDirs === undefined ||
    generatedFiles === undefined ||
    include === undefined ||
    report === undefined ||
    !isValidTimeZone(report.timeZone)
  ) {
    return undefined;
  }
  return deepFreeze({ codeAreas, excludeDirs, generatedFiles, include, report });
}

function parseCodeAreas(value: unknown): ProjectQualityConfiguration["codeAreas"] | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  const areas: Record<string, CodeAreaDefinition> = {};
  for (const [name, candidate] of Object.entries(data)) {
    const area = exactKeys(candidate, ["description", "excludeGlobs", "globs", "warningPolicy"]);
    const excludeGlobs = area === undefined ? undefined : parseStringArray(area.excludeGlobs);
    const globs = area === undefined ? undefined : parseStringArray(area.globs);
    if (
      area === undefined ||
      excludeGlobs === undefined ||
      globs === undefined ||
      typeof area.description !== "string" ||
      !isWarningPolicy(area.warningPolicy)
    ) {
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
  if (
    report === undefined ||
    typeof report.footerGeneratedBy !== "string" ||
    typeof report.footerNotice !== "string" ||
    typeof report.nonBlockingNotice !== "string" ||
    typeof report.showWatchlist !== "boolean" ||
    typeof report.timeZone !== "string" ||
    typeof report.title !== "string" ||
    !finiteNumber(report.topN) ||
    !finiteNumber(report.watchlistMax)
  ) {
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

function parseStringArray(value: unknown): readonly string[] | undefined {
  const items = snapshotClosedArray(value);
  return items !== undefined && items.every((item) => typeof item === "string")
    ? Object.freeze([...items])
    : undefined;
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

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function exactKeys(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const data = snapshotClosedRecord(value);
  return data !== undefined &&
    Object.keys(data).length === keys.length &&
    keys.every((key) => Object.hasOwn(data, key))
    ? data
    : undefined;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}
