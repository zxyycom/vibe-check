import {
  DUPLICATE_DETECTION_CHECK_DEFINITION,
  executeDuplicateDetection
} from "../quality-core/check-record/builtins/duplicate-detection.ts";
import { DEFAULT_JSCPD_COMMAND } from "../quality-core/measurement/scanners/jscpd/default-command.ts";
import {
  FILE_METRICS_CHECK_DEFINITION,
  executeFileMetrics
} from "../quality-core/check-record/builtins/file-metrics.ts";
import {
  FUNCTION_METRICS_CHECK_DEFINITION,
  executeFunctionMetrics
} from "../quality-core/check-record/builtins/function-metrics.ts";
import {
  snapshotClosedArray,
  snapshotClosedRecord
} from "../quality-core/check-record/plain-record-values.ts";
import { defineCheck } from "./custom-check.ts";

/** The complete external command configuration a scanner adapter consumes. */
export interface ScannerCommandOptions {
  readonly args: readonly string[];
  readonly availabilityArgs: readonly string[];
  readonly executable: string;
}

export interface DuplicateDetectionOptions {
  readonly scanner: ScannerCommandOptions &
    Readonly<{
      readonly maxConcurrency: number;
    }>;
  readonly defaultMinimumTokens: number;
  readonly minimumTokensByCodeArea: Readonly<Record<string, number>>;
}

export interface FileMetricsOptions {
  readonly scanner: ScannerCommandOptions;
  readonly codeLines: Readonly<{
    readonly absoluteFloor: number;
    readonly lowDecisionTokenAllowance: Readonly<{
      readonly codeLineFloor: number;
      readonly maxDecisionTokens: number;
    }>;
  }>;
}

export interface FunctionMetricsOptions {
  readonly scanner: ScannerCommandOptions;
  readonly codeLines: Readonly<{
    readonly absoluteFloor: number;
    readonly lowComplexityAllowance: Readonly<{
      readonly codeLineFloor: number;
      readonly maxCyclomaticComplexityExclusive: number;
    }>;
  }>;
  readonly cyclomaticComplexity: Readonly<{
    readonly absoluteFloor: number;
  }>;
  readonly parameterCount: Readonly<{
    readonly absoluteFloor: number;
  }>;
}

export const duplicateDetection = defineCheck<"duplicate-detection", DuplicateDetectionOptions>({
  ...DUPLICATE_DETECTION_CHECK_DEFINITION,
  execution: executeDuplicateDetection,
  options: {
    scanner: {
      ...DEFAULT_JSCPD_COMMAND,
      maxConcurrency: 4
    },
    defaultMinimumTokens: 75,
    minimumTokensByCodeArea: {}
  }
});

export const fileMetrics = defineCheck<"file-metrics", FileMetricsOptions>({
  ...FILE_METRICS_CHECK_DEFINITION,
  execution: executeFileMetrics,
  options: {
    scanner: {
      args: [],
      availabilityArgs: ["--version"],
      executable: "scc"
    },
    codeLines: {
      absoluteFloor: 300,
      lowDecisionTokenAllowance: {
        codeLineFloor: 500,
        maxDecisionTokens: 10
      }
    }
  }
});

export const functionMetrics = defineCheck<"function-metrics", FunctionMetricsOptions>({
  ...FUNCTION_METRICS_CHECK_DEFINITION,
  execution: executeFunctionMetrics,
  options: {
    scanner: {
      args: [],
      availabilityArgs: ["--version"],
      executable: "lizard"
    },
    codeLines: {
      absoluteFloor: 50,
      lowComplexityAllowance: {
        codeLineFloor: 150,
        maxCyclomaticComplexityExclusive: 5
      }
    },
    cyclomaticComplexity: { absoluteFloor: 10 },
    parameterCount: { absoluteFloor: 5 }
  }
});

/**
 * Validates complete options for Product defaults after ordinary object
 * composition. It deliberately does not materialize omitted nested values.
 */
export function validateDefaultCheckOptions(checkId: string, options: object): boolean {
  if (checkId === "duplicate-detection") return validDuplicateDetectionOptions(options);
  if (checkId === "file-metrics") return validFileMetricsOptions(options);
  if (checkId === "function-metrics") return validFunctionMetricsOptions(options);
  return true;
}

export function defaultCheckOptionCodeAreasAreKnown(
  checkId: string,
  options: object,
  codeAreas: Readonly<Record<string, unknown>>
): boolean {
  if (checkId !== "duplicate-detection") return true;
  const data = snapshotClosedRecord(options);
  const thresholds =
    data === undefined ? undefined : snapshotClosedRecord(data.minimumTokensByCodeArea);
  return (
    thresholds !== undefined &&
    Object.keys(thresholds).every((area) => Object.hasOwn(codeAreas, area))
  );
}

function validDuplicateDetectionOptions(value: object): boolean {
  const options = exactRecord(value, [
    "scanner",
    "defaultMinimumTokens",
    "minimumTokensByCodeArea"
  ]);
  return (
    options !== undefined &&
    validDuplicationScanner(options.scanner) &&
    finiteNumber(options.defaultMinimumTokens) &&
    validNumberRecord(options.minimumTokensByCodeArea)
  );
}

function validFileMetricsOptions(value: object): boolean {
  const options = exactRecord(value, ["scanner", "codeLines"]);
  return (
    options !== undefined &&
    validScanner(options.scanner) &&
    validExactNumberRecord(options.codeLines, ["absoluteFloor"], {
      lowDecisionTokenAllowance: ["codeLineFloor", "maxDecisionTokens"]
    })
  );
}

function validFunctionMetricsOptions(value: object): boolean {
  const options = exactRecord(value, [
    "scanner",
    "codeLines",
    "cyclomaticComplexity",
    "parameterCount"
  ]);
  return (
    options !== undefined &&
    validScanner(options.scanner) &&
    validExactNumberRecord(options.codeLines, ["absoluteFloor"], {
      lowComplexityAllowance: ["codeLineFloor", "maxCyclomaticComplexityExclusive"]
    }) &&
    validExactNumberRecord(options.cyclomaticComplexity, ["absoluteFloor"]) &&
    validExactNumberRecord(options.parameterCount, ["absoluteFloor"])
  );
}

function validDuplicationScanner(value: unknown): boolean {
  const scanner = exactRecord(value, ["args", "availabilityArgs", "executable", "maxConcurrency"]);
  return (
    scanner !== undefined &&
    validStringArray(scanner.args) &&
    validStringArray(scanner.availabilityArgs) &&
    nonEmptyString(scanner.executable) &&
    positiveSafeInteger(scanner.maxConcurrency)
  );
}

function validScanner(value: unknown): boolean {
  const scanner = exactRecord(value, ["args", "availabilityArgs", "executable"]);
  return (
    scanner !== undefined &&
    validStringArray(scanner.args) &&
    validStringArray(scanner.availabilityArgs) &&
    nonEmptyString(scanner.executable)
  );
}

function validExactNumberRecord(
  value: unknown,
  numericKeys: readonly string[],
  nested: Readonly<Record<string, readonly string[]>> = {}
): boolean {
  const expectedKeys = [...numericKeys, ...Object.keys(nested)];
  const record = exactRecord(value, expectedKeys);
  return (
    record !== undefined &&
    numericKeys.every((key) => finiteNumber(record[key])) &&
    Object.entries(nested).every(([key, nestedKeys]) =>
      validExactNumberRecord(record[key], nestedKeys)
    )
  );
}

function validNumberRecord(value: unknown): boolean {
  const record = snapshotClosedRecord(value);
  return record !== undefined && Object.values(record).every(finiteNumber);
}

function validStringArray(value: unknown): boolean {
  const items = snapshotClosedArray(value);
  return items !== undefined && items.every((item) => typeof item === "string");
}

function exactRecord(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const record = snapshotClosedRecord(value);
  return record !== undefined &&
    Object.keys(record).length === keys.length &&
    keys.every((key) => Object.hasOwn(record, key))
    ? record
    : undefined;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
