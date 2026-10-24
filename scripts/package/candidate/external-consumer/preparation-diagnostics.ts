import type { SpawnSyncReturns } from "node:child_process";
import { writeSync } from "node:fs";

type PreparationStage = "fixture" | "install" | "types-fixture" | "entry-resolution" | "identity";

const diagnosticPrefix = "external-consumer-setup ";
const diagnosticByteLimit = 8 * 1024;
const inspectedOutputCharacterLimit = 8 * 1024;
const truncatedLine = `${diagnosticPrefix}{"event":"diagnostics-truncated"}\n`;

/** Writes bounded, safe preparation facts to the provider's existing stderr transcript. */
export class ExternalConsumerPreparationDiagnostics {
  private readonly startedAtMs = performance.now();
  private writtenBytes = 0;
  private truncated = false;
  private readonly writeLine: (line: string) => void;

  public constructor(
    writeLine: (line: string) => void = (line) => {
      writeSync(2, line);
    }
  ) {
    this.writeLine = writeLine;
  }

  /** Flushes a start marker before blocking work so timeout evidence identifies the pending stage. */
  public measure<T>(stage: PreparationStage, operation: () => T): T {
    const startedAtMs = performance.now();
    this.emit({ event: "stage-started", stage, elapsedMs: this.elapsedMs() });
    let status: "completed" | "failed" = "failed";
    try {
      const result = operation();
      status = "completed";
      return result;
    } finally {
      this.emit({
        event: "stage-finished",
        stage,
        status,
        durationMs: Math.round((performance.now() - startedAtMs) * 1000) / 1000
      });
    }
  }

  /** Summarizes only recognized Bun output at exit; these are not live progress timestamps. */
  public installationResult(result: SpawnSyncReturns<string>): void {
    this.emit({
      event: "install-result",
      elapsedMs: this.elapsedMs(),
      exitCode: result.status,
      signalled: result.signal !== null,
      commandError: result.error !== undefined,
      stdout: summarizeInstallationOutput(result.stdout),
      stderr: summarizeInstallationOutput(result.stderr)
    });
  }

  private elapsedMs(): number {
    return Math.round((performance.now() - this.startedAtMs) * 1000) / 1000;
  }

  private emit(event: Readonly<Record<string, unknown>>): void {
    if (this.truncated) return;
    const line = `${diagnosticPrefix}${JSON.stringify(event)}\n`;
    const bytes = Buffer.byteLength(line);
    if (this.writtenBytes + bytes + Buffer.byteLength(truncatedLine) > diagnosticByteLimit) {
      this.writeLine(truncatedLine);
      this.truncated = true;
      return;
    }
    this.writeLine(line);
    this.writtenBytes += bytes;
  }
}

function summarizeInstallationOutput(output: string | null) {
  const text = output ?? "";
  const prefix = text.slice(0, inspectedOutputCharacterLimit);
  const inspectionTruncated = text.length > inspectedOutputCharacterLimit;
  const inspected = inspectionTruncated ? prefix.slice(0, prefix.lastIndexOf("\n") + 1) : prefix;
  let resolvingDependencies = false;
  let resolvedDownloadedExtractedCount: number | null = null;
  let installedPackageCount: number | null = null;
  for (const line of inspected.split(/\r?\n/u)) {
    if (line === "Resolving dependencies") resolvingDependencies = true;
    const resolved = /^Resolved, downloaded and extracted \[(\d{1,9})\]$/u.exec(line);
    if (resolved !== null) resolvedDownloadedExtractedCount = Number(resolved[1]);
    const installed = /^(\d{1,9}) packages? installed \[\d+(?:\.\d+)?(?:ms|s)\]$/u.exec(line);
    if (installed !== null) installedPackageCount = Number(installed[1]);
  }
  return {
    bytes: Buffer.byteLength(text),
    inspectionTruncated,
    resolvingDependencies,
    resolvedDownloadedExtractedCount,
    installedPackageCount
  };
}
