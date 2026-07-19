import type {
  CodeAreaFingerprint,
  QualityConfig,
  QualityMetrics,
  ToolAvailability
} from "../../model/schema.ts";

export type ScanContext = {
  cacheRootDir: string;
  changedFiles: string[];
  config: QualityConfig;
  fingerprints: Record<string, CodeAreaFingerprint>;
  metrics: QualityMetrics;
  rawDir: string;
  root: string;
  toolResults: ToolAvailability[];
};
