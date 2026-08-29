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

interface QualityScanDependencies {
  readonly run: () => Promise<QualityScanResult>;
  readonly writeLine: (line: string) => void;
}

const defaultQualityScanDependencies: QualityScanDependencies = Object.freeze({
  run,
  writeLine: (line: string): void => console.log(line)
});

/** Maps the bound Project Run result to the existing scan-only process contract. */
export async function runScan(
  dependencies: QualityScanDependencies = defaultQualityScanDependencies
): Promise<number> {
  const result = await dependencies.run();
  if (result.kind !== "configuration") {
    const file = result.outputs.diagnosticLogging.file;
    if (file !== null) dependencies.writeLine(`repository quality diagnostic log: ${file}`);
  }
  if (result.kind === "completed") return 0;
  return result.kind === "configuration" ? 3 : 2;
}

if (import.meta.main) {
  process.exitCode = await runScan();
}
