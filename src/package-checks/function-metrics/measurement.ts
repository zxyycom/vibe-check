import type { FunctionMetricsScannerOptions } from "./options.ts";
import { scanWithLizard } from "./lizard/scanner.ts";
import { checkLizard } from "./lizard/availability.ts";
import { acceptExactInputMeasurements } from "../project-files/exact-input-measurement.ts";
import type { FunctionMetric } from "./measurement-model.ts";
import type { FunctionMetricsExactInputSet } from "./execution.ts";

export type FunctionMeasurementResult = Readonly<
  | { kind: "complete"; metrics: readonly FunctionMetric[] }
  | { kind: "execution-failed" }
  | { kind: "invalid-result" }
  | { kind: "unavailable" }
>;

export async function measureFunctionMetrics(
  input: FunctionMetricsExactInputSet,
  dependency: FunctionMetricsScannerOptions
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
  dependency: FunctionMetricsScannerOptions
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
  const accepted = acceptExactInputMeasurements(result.measurements, input.approvedExactPaths);
  return accepted.ok
    ? Object.freeze({ kind: "complete", metrics: Object.freeze([...accepted.payloads]) })
    : Object.freeze({ kind: "invalid-result" });
}
