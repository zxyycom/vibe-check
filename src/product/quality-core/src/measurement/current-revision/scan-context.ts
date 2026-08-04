import type {
  CodeAreaFingerprint,
  ResolvedQualityConfig,
  QualityMetrics,
  ToolAvailability
} from "../../model/schema.ts";
import type { ScannerDependencySnapshot } from "../../../../scanner-dependencies.ts";

export type ScanContext = {
  cacheRootDir: string;
  changedFiles: string[];
  config: ResolvedQualityConfig;
  dependencies: ScannerDependencySnapshot;
  fingerprints: Record<string, CodeAreaFingerprint>;
  metrics: QualityMetrics;
  rawDir: string;
  root: string;
  toolResults: ToolAvailability[];
};
