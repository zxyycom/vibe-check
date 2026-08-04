import type { ResolvedQualityConfig } from "../../model/schema.ts";
import type { AreaWarningPolicy } from "./warning-model.ts";

export function metricAreaWarningPolicy(config: ResolvedQualityConfig, codeArea: string): AreaWarningPolicy | null {
  const areaConfig = config.codeAreas[codeArea];
  if (!areaConfig) return null;
  if (areaConfig.warningPolicy === "exclude-warnings") return null;

  const isWatchlistOnly = areaConfig.warningPolicy === "watchlist-only";
  return {
    isWatchlistOnly,
    level: isWatchlistOnly ? "info" : "warning"
  };
}

export function duplicateAreaWarningPolicy(uniqueAreas: string[], config: ResolvedQualityConfig): AreaWarningPolicy | null {
  if (uniqueAreas.length > 0 && uniqueAreas.every((area) => codeAreaHasPolicy(config, area, "exclude-warnings"))) {
    return null;
  }

  const isWatchlistOnly = uniqueAreas.length > 0
    && uniqueAreas.every((area) => codeAreaHasPolicy(config, area, "watchlist-only"));

  return {
    isWatchlistOnly,
    level: isWatchlistOnly ? "info" : "warning"
  };
}

function codeAreaHasPolicy(config: ResolvedQualityConfig, codeArea: string, warningPolicy: string): boolean {
  const areaConfig = config.codeAreas[codeArea];
  return Boolean(areaConfig && areaConfig.warningPolicy === warningPolicy);
}
