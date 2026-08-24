import type { FileScannerDependency } from "../measurement/scanners/dependencies.ts";
import { scanWithScc } from "../measurement/scanners/scc/scanner.ts";
import { checkScc } from "../measurement/scanners/tool-availability/scc.ts";
import { acceptScopedMeasurements } from "../measurement/scoped-measurement.ts";
import type { FileMetric } from "../configuration/metric-contract.ts";
import type { FileMetricsExactInputSet } from "./file-metrics.ts";

export type FileMeasurementResult = Readonly<
  | { kind: "complete"; metrics: readonly FileMetric[] }
  | { kind: "execution-failed" }
  | { kind: "invalid-result" }
  | { kind: "unavailable" }
>;

export async function measureFileMetrics(
  input: FileMetricsExactInputSet,
  dependency: FileScannerDependency
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
  dependency: FileScannerDependency
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
  const accepted = acceptScopedMeasurements(result.measurements, input.approvedExactPaths);
  return accepted.ok
    ? Object.freeze({ kind: "complete", metrics: Object.freeze([...accepted.payloads]) })
    : Object.freeze({ kind: "invalid-result" });
}
