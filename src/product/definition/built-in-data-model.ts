import type { CheckDefinition } from "./check-definition.ts";
import type {
  BuiltInCheckReplacement,
  DuplicateDetectionOptionsReplacement,
  FileMetricsOptionsReplacement,
  FunctionMetricsOptionsReplacement
} from "./adjustment-patches.ts";

export interface DuplicateDetectionOptions {
  readonly defaultMinimumTokens: number;
  readonly fragments: Readonly<{ readonly changedDelta: number }>;
  readonly minimumTokensByCodeArea: Readonly<Record<string, number>>;
}

export interface FileMetricsOptions {
  readonly codeLines: Readonly<{
    readonly absoluteFloor: number;
    readonly changedDelta: number;
    readonly lowDecisionTokenAllowance: Readonly<{
      readonly codeLineFloor: number;
      readonly maxDecisionTokens: number;
    }>;
  }>;
}

export interface FunctionMetricsOptions {
  readonly codeLines: Readonly<{
    readonly absoluteFloor: number;
    readonly changedDelta: number;
    readonly lowComplexityAllowance: Readonly<{
      readonly codeLineFloor: number;
      readonly maxCyclomaticComplexityExclusive: number;
    }>;
  }>;
  readonly cyclomaticComplexity: Readonly<{
    readonly absoluteFloor: number;
    readonly changedDelta: number;
  }>;
  readonly parameterCount: Readonly<{
    readonly absoluteFloor: number;
    readonly changedDelta: number;
  }>;
}

export type BuiltInCheckId = "duplicate-detection" | "file-metrics" | "function-metrics";

export interface BuiltInCheckOptionsById {
  readonly "duplicate-detection": DuplicateDetectionOptions;
  readonly "file-metrics": FileMetricsOptions;
  readonly "function-metrics": FunctionMetricsOptions;
}

export interface BuiltInCheckReplacementById {
  readonly "duplicate-detection": BuiltInCheckReplacement<DuplicateDetectionOptionsReplacement>;
  readonly "file-metrics": BuiltInCheckReplacement<FileMetricsOptionsReplacement>;
  readonly "function-metrics": BuiltInCheckReplacement<FunctionMetricsOptionsReplacement>;
}

export interface BuiltInCheck<Id extends BuiltInCheckId> extends CheckDefinition {
  readonly kind: "built-in";
  readonly checkId: Id;
  readonly options: Readonly<BuiltInCheckOptionsById[Id]>;
  readonly dependsOn?: string | readonly string[];
  readonly maxParallel?: number;
  readonly mutex?: string | readonly string[];
}

export type BuiltInCheckById = {
  readonly "duplicate-detection": BuiltInCheck<"duplicate-detection">;
  readonly "file-metrics": BuiltInCheck<"file-metrics">;
  readonly "function-metrics": BuiltInCheck<"function-metrics">;
};

export type DuplicateDetectionCheck = BuiltInCheckById["duplicate-detection"];
export type FileMetricsCheck = BuiltInCheckById["file-metrics"];
export type FunctionMetricsCheck = BuiltInCheckById["function-metrics"];

export type AnyBuiltInCheck = BuiltInCheckById[BuiltInCheckId];
export type BuiltInCheckOptions = BuiltInCheckOptionsById[BuiltInCheckId];

export type BuiltInCheckData = {
  readonly [Id in BuiltInCheckId]: Readonly<{
    readonly kind: "built-in";
    readonly checkId: Id;
    readonly options: BuiltInCheckOptionsById[Id];
  }>;
}[BuiltInCheckId];

export type BuiltInCheckConstruction = {
  readonly [Id in BuiltInCheckId]: Readonly<{
    readonly checkId: Id;
    readonly options: BuiltInCheckOptionsById[Id];
    readonly dependsOn?: string | readonly string[];
    readonly maxParallel?: number;
    readonly mutex?: string | readonly string[];
  }>;
}[BuiltInCheckId];
