import type { ScannerCommandOptions } from "../definition/built-ins.ts";

/** Private adapter view of the scanner command owned by file-metrics options. */
export type FileScannerDependency = ScannerCommandOptions;

/** Private adapter view of the scanner command owned by function-metrics options. */
export type FunctionScannerDependency = ScannerCommandOptions;

/** Private adapter view of the scanner command owned by duplicate-detection options. */
export type DuplicationScannerDependency = ScannerCommandOptions &
  Readonly<{
    readonly maxConcurrency: number;
  }>;
