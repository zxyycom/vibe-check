import { snapshotClosedPolicyRecord } from "../../data-boundary/closed-values.ts";
import { isNonEmptyString, isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import { isNormalizedProjectRelativePath } from "../host-environment/path.ts";
import type { FunctionMetricsFindingIdentity, FunctionMetricsFindingMetric } from "./options.ts";

export function resolveFunctionMetricsFindingIdentity(
  value: unknown
): FunctionMetricsFindingIdentity | undefined {
  const identity = snapshotClosedPolicyRecord(value, {
    required: ["functionName", "metric", "path", "startLine"]
  });
  if (
    identity === undefined ||
    !isNonEmptyString(identity.functionName) ||
    !isFunctionMetricsFindingMetric(identity.metric) ||
    !isNormalizedProjectRelativePath(identity.path) ||
    !isPositiveSafeInteger(identity.startLine)
  ) {
    return undefined;
  }
  return Object.freeze({
    functionName: identity.functionName,
    metric: identity.metric,
    path: identity.path,
    startLine: identity.startLine
  });
}

function isFunctionMetricsFindingMetric(value: unknown): value is FunctionMetricsFindingMetric {
  return (
    value === "cyclomatic-complexity" ||
    value === "function-code-density" ||
    value === "nesting-depth" ||
    value === "parameter-count"
  );
}
