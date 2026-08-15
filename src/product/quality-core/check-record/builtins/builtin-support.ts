import type { QualityRecordCandidate } from "../model.ts";

export type ReferenceStatus = "complete" | "incomplete" | "unavailable";
export type RelationId = "changed" | "regression";

/** Private Run-owned binding shape for Product-provided built-in Checks. */
export interface BuiltInCheckExecutionContext {
  readonly signal: AbortSignal;
  readonly results: Readonly<{
    report(candidate: QualityRecordCandidate): void;
  }>;
}

export type BuiltInCheckExecutionResult = Readonly<
  | { verdict: "passed" | "failed" }
  | { kind: "unavailable"; category: "dependency-unavailable" | "invalid-result" }
>;

export type BuiltInCheckBinding = (
  context: BuiltInCheckExecutionContext
) => BuiltInCheckExecutionResult | Promise<BuiltInCheckExecutionResult>;

export function isInChangedScope(
  filePath: string,
  changedFiles: readonly string[]
): boolean {
  return changedFiles.some((changedFile) => (
    filePath.includes(changedFile) || changedFile.includes(filePath)
  ));
}

export function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
