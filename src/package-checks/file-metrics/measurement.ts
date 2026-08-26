import type { FileMetricsScannerOptions } from "./options.ts";
import { scanWithScc } from "./scc/scanner.ts";
import { checkScc } from "./scc/availability.ts";
import { acceptExactInputMeasurements } from "../project-files/exact-input-measurement.ts";
import type { FileMetric } from "./measurement-model.ts";
import type { FileMetricsExactInputSet } from "./execution.ts";

export type FileMeasurementResult = Readonly<
  | { kind: "complete"; metrics: readonly FileMetric[] }
  | { kind: "execution-failed" }
  | { kind: "invalid-result" }
  | { kind: "unavailable" }
>;

export async function measureFileMetrics(
  input: FileMetricsExactInputSet,
  dependency: FileMetricsScannerOptions
): Promise<FileMeasurementResult> {
  if (input.approvedExactPaths.length === 0) {
    return Object.freeze({ kind: "complete", metrics: Object.freeze([]) });
  }
  const availability = await checkScc(input.rootDir, dependency);
  if (!availability.available) {
    return Object.freeze({ kind: "unavailable" });
  }
  return runFileScanner(input, dependency);
}

function runFileScanner(
  input: FileMetricsExactInputSet,
  dependency: FileMetricsScannerOptions
): FileMeasurementResult {
  let result: ReturnType<typeof scanWithScc>;
  try {
    result = scanWithScc({
      cwd: input.rootDir,
      dependency,
      includePaths: input.approvedExactPaths,
      excludeDirs: []
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
