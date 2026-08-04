import type {
  AcceptedWarningConfig,
  CodeAreaDefinition,
  ResolvedQualityConfig
} from "./quality-core/src/model/schema.ts";
import type { SemanticProjectConfigV1 } from "./config-schema.ts";

export interface QualityConfigCliOverrides {
  readonly artifactDir?: string;
  readonly topN?: number;
}

export function resolveQualityConfig(
  document: SemanticProjectConfigV1,
  overrides: QualityConfigCliOverrides = {}
): ResolvedQualityConfig {
  return deepFreeze({
    acceptedWarnings: document.acceptedWarnings.map(mapAcceptedWarning),
    artifactDir: overrides.artifactDir ?? document.artifactDir,
    cacheDir: document.cacheDir,
    checks: mapChecks(document.checks),
    codeAreas: Object.fromEntries(
      Object.entries(document.codeAreas).map(([name, definition]) => [
        name,
        mapCodeArea(definition)
      ])
    ),
    excludeDirs: [...document.excludeDirs],
    generatedFiles: [...document.generatedFiles],
    include: [...document.include],
    report: mapReport(document.report, overrides),
    version: document.version
  } satisfies ResolvedQualityConfig);
}

function mapChecks(
  checks: SemanticProjectConfigV1["checks"]
): ResolvedQualityConfig["checks"] {
  return {
    duplication: {
      defaultMinimumTokens: checks.duplication.defaultMinimumTokens,
      fragments: {
        changedDelta: checks.duplication.fragments.changedDelta
      },
      minimumTokensByCodeArea: {
        ...checks.duplication.minimumTokensByCodeArea
      }
    },
    files: {
      codeLines: {
        absoluteFloor: checks.files.codeLines.absoluteFloor,
        changedDelta: checks.files.codeLines.changedDelta,
        lowDecisionTokenAllowance: {
          codeLineFloor: checks.files.codeLines.lowDecisionTokenAllowance.codeLineFloor,
          maxDecisionTokens:
            checks.files.codeLines.lowDecisionTokenAllowance.maxDecisionTokens
        }
      }
    },
    functions: mapFunctionChecks(checks.functions)
  };
}

function mapFunctionChecks(
  checks: SemanticProjectConfigV1["checks"]["functions"]
): ResolvedQualityConfig["checks"]["functions"] {
  return {
    codeLines: {
      absoluteFloor: checks.codeLines.absoluteFloor,
      changedDelta: checks.codeLines.changedDelta,
      lowComplexityAllowance: {
        codeLineFloor: checks.codeLines.lowComplexityAllowance.codeLineFloor,
        maxCyclomaticComplexityExclusive:
          checks.codeLines.lowComplexityAllowance
            .maxCyclomaticComplexityExclusive
      }
    },
    cyclomaticComplexity: {
      absoluteFloor: checks.cyclomaticComplexity.absoluteFloor,
      changedDelta: checks.cyclomaticComplexity.changedDelta
    },
    parameterCount: {
      absoluteFloor: checks.parameterCount.absoluteFloor,
      changedDelta: checks.parameterCount.changedDelta
    }
  };
}

function mapReport(
  report: SemanticProjectConfigV1["report"],
  overrides: QualityConfigCliOverrides
): ResolvedQualityConfig["report"] {
  return {
    footerGeneratedBy: report.footerGeneratedBy,
    footerNotice: report.footerNotice,
    nonBlockingNotice: report.nonBlockingNotice,
    showWatchlist: report.showWatchlist,
    timeZone: report.timeZone,
    title: report.title,
    topN: overrides.topN ?? report.topN,
    watchlistMax: report.watchlistMax
  };
}

function mapAcceptedWarning(
  warning: SemanticProjectConfigV1["acceptedWarnings"][number]
): AcceptedWarningConfig {
  return {
    checkId: warning.checkId,
    ...(warning.codeArea === undefined ? {} : { codeArea: warning.codeArea }),
    ...(warning.messageIncludes === undefined
      ? {}
      : { messageIncludes: [...warning.messageIncludes] }),
    ...(warning.metric === undefined ? {} : { metric: warning.metric }),
    ...(warning.path === undefined ? {} : { path: warning.path }),
    reason: warning.reason,
    ...(warning.suggestionIncludes === undefined
      ? {}
      : { suggestionIncludes: [...warning.suggestionIncludes] }),
    ...(warning.value === undefined ? {} : { value: warning.value })
  };
}

function mapCodeArea(
  definition: SemanticProjectConfigV1["codeAreas"][string]
): CodeAreaDefinition {
  return {
    description: definition.description,
    excludeGlobs: [...definition.excludeGlobs],
    globs: [...definition.globs],
    warningPolicy: definition.warningPolicy
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}
