import { acceptExactInputMeasurements } from "../project-files/exact-input-measurement.ts";
import { checkLizard } from "./lizard/availability.ts";
import { scanWithLizard } from "./lizard/scanner.ts";
import type { FunctionMetric, FunctionMetricsExactInputSet } from "./measurement-model.ts";
import type { ResolvedFunctionMetricsScannerOptions } from "./options.ts";

export type FunctionMeasurementResult = Readonly<
  | { kind: "cancelled" }
  | { kind: "complete"; metrics: readonly FunctionMetric[] }
  | { kind: "execution-failed" }
  | { kind: "invalid-result" }
  | { kind: "unavailable" }
>;

interface FunctionMeasurementInput {
  readonly dependency: ResolvedFunctionMetricsScannerOptions;
  readonly input: FunctionMetricsExactInputSet;
  readonly signal: AbortSignal;
}

export async function measureFunctionMetrics({
  dependency,
  input,
  signal
}: FunctionMeasurementInput): Promise<FunctionMeasurementResult> {
  if (signal.aborted) return Object.freeze({ kind: "cancelled" });
  if (input.approvedExactPaths.length === 0) {
    return Object.freeze({ kind: "complete", metrics: Object.freeze([]) });
  }
  const availability = await checkLizard(input.rootDir, dependency);
  if (signal.aborted) return Object.freeze({ kind: "cancelled" });
  if (!availability.available) {
    return Object.freeze({ kind: "unavailable" });
  }
  const measurement = runFunctionScanner(input, dependency);
  return signal.aborted ? Object.freeze({ kind: "cancelled" }) : measurement;
}

function runFunctionScanner(
  input: FunctionMetricsExactInputSet,
  dependency: ResolvedFunctionMetricsScannerOptions
): FunctionMeasurementResult {
  const result = scanWithLizard({
    cwd: input.rootDir,
    dependency,
    files: input.approvedExactPaths
  });
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
