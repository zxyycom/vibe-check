import type { FunctionScannerDependency } from "../measurement/scanners/dependencies.ts";
import { scanWithLizard } from "../measurement/scanners/lizard/scanner.ts";
import { checkLizard } from "../measurement/scanners/tool-availability/lizard.ts";
import { acceptScopedMeasurements } from "../measurement/scoped-measurement.ts";
import type { FunctionMetric } from "../configuration/metric-contract.ts";
import type { FunctionMetricsExactInputSet } from "./function-metrics.ts";

export type FunctionMeasurementResult = Readonly<
  | { kind: "complete"; metrics: readonly FunctionMetric[] }
  | { kind: "execution-failed" }
  | { kind: "invalid-result" }
  | { kind: "unavailable" }
>;

export async function measureFunctionMetrics(
  input: FunctionMetricsExactInputSet,
  dependency: FunctionScannerDependency
): Promise<FunctionMeasurementResult> {
  if (input.approvedExactPaths.length === 0) {
    return Object.freeze({ kind: "complete", metrics: Object.freeze([]) });
  }
  const availability = await checkLizard(input.rootDir, dependency);
  if (!availability.available) {
    return Object.freeze({ kind: "unavailable" });
  }
  return runFunctionScanner(input, dependency);
}

function runFunctionScanner(
  input: FunctionMetricsExactInputSet,
  dependency: FunctionScannerDependency
): FunctionMeasurementResult {
  let result: ReturnType<typeof scanWithLizard>;
  try {
    result = scanWithLizard({
      cwd: input.rootDir,
      dependency,
      files: input.approvedExactPaths
    });
  } catch {
    return Object.freeze({ kind: "execution-failed" });
  }
  if (!result.ok) {
    return Object.freeze({
      kind: result.reason === "execution" ? "execution-failed" : "invalid-result"
    });
  }
  const accepted = acceptScopedMeasurements(result.measurements, input.approvedExactPaths);
  return accepted.ok
    ? Object.freeze({ kind: "complete", metrics: Object.freeze([...accepted.payloads]) })
    : Object.freeze({ kind: "invalid-result" });
}
