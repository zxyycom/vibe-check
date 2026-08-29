#!/usr/bin/env bun

import { run } from "./project-run.ts";

type QualityScanResult = Readonly<
  | { readonly kind: "configuration" }
  | {
      readonly kind: "cancelled" | "completed" | "execution" | "output" | "planning";
      readonly outputs: Readonly<{
        readonly diagnosticLogging: Readonly<{ readonly file: string | null }>;
      }>;
    }
>;

interface QualityScanSteps {
  readonly run: () => Promise<QualityScanResult>;
  readonly writeLine: (line: string) => void;
}

const defaultScanSteps: QualityScanSteps = Object.freeze({
  run,
  writeLine: (line: string): void => console.log(line)
});

/** Maps the bound Project Run result to the existing scan-only process contract. */
export async function runScan(steps: QualityScanSteps = defaultScanSteps): Promise<number> {
  const result = await steps.run();
  if (result.kind !== "configuration") {
    const file = result.outputs.diagnosticLogging.file;
    if (file !== null) steps.writeLine(`repository quality diagnostic log: ${file}`);
  }
  if (result.kind === "completed") return 0;
  return result.kind === "configuration" ? 3 : 2;
}

if (import.meta.main) {
  process.exitCode = await runScan();
}
