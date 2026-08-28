import { acceptExactInputMeasurements } from "../project-files/exact-input-measurement.ts";
import type { FileMetric, FileMetricsExactInputSet } from "./measurement-model.ts";
import type { ResolvedFileMetricsScannerOptions } from "./options.ts";
import { checkScc } from "./scc/availability.ts";
import { scanWithScc } from "./scc/scanner.ts";

export type FileMeasurementResult = Readonly<
  | { kind: "complete"; metrics: readonly FileMetric[] }
  | { kind: "execution-failed" }
  | { kind: "invalid-result" }
  | { kind: "unavailable" }
>;

export async function measureFileMetrics(
  exactInputs: FileMetricsExactInputSet,
  scanner: ResolvedFileMetricsScannerOptions
): Promise<FileMeasurementResult> {
  if (exactInputs.approvedExactPaths.length === 0) {
    return Object.freeze({ kind: "complete", metrics: Object.freeze([]) });
  }
  const scannerAvailability = await checkScc(exactInputs.rootDir, scanner);
  if (!scannerAvailability.available) {
    return Object.freeze({ kind: "unavailable" });
  }
  return runFileScanner(exactInputs, scanner);
}

function runFileScanner(
  exactInputs: FileMetricsExactInputSet,
  scanner: ResolvedFileMetricsScannerOptions
): FileMeasurementResult {
  const scanResult = scanWithScc({
    cwd: exactInputs.rootDir,
    scanner,
    includePaths: exactInputs.approvedExactPaths
  });
  if (!scanResult.ok) {
    return Object.freeze({
      kind: scanResult.reason === "execution" ? "execution-failed" : "invalid-result"
    });
  }
  const acceptedMeasurements = acceptExactInputMeasurements(
    scanResult.measurements,
    exactInputs.approvedExactPaths
  );
  return acceptedMeasurements.ok
    ? Object.freeze({
        kind: "complete",
        metrics: Object.freeze([...acceptedMeasurements.payloads])
      })
    : Object.freeze({ kind: "invalid-result" });
}
