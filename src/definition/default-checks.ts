import {
  DUPLICATE_DETECTION_CHECK_DEFINITION,
  executeDuplicateDetection
} from "../checks/builtins/duplicate-detection.ts";
import { DEFAULT_JSCPD_COMMAND } from "../checks/measurement/scanners/jscpd/default-command.ts";
import {
  JSON_VALIDATION_CHECK_DEFINITION,
  executeJsonValidation
} from "../checks/json-validation/json-validation.ts";
import {
  FILE_METRICS_CHECK_DEFINITION,
  executeFileMetrics
} from "../checks/builtins/file-metrics.ts";
import {
  FUNCTION_METRICS_CHECK_DEFINITION,
  executeFunctionMetrics
} from "../checks/builtins/function-metrics.ts";
import { snapshotClosedArray, snapshotClosedRecord } from "../foundation/closed-values.ts";
import { defineCheck } from "./custom-check.ts";

/** default Check scanner adapter 所需的完整外部命令配置。 */
export interface ScannerCommandOptions {
  /** 传给 scanner 的主命令参数。 */
  readonly args: readonly string[];
  /** 用于确认 scanner 可用性的命令参数。 */
  readonly availabilityArgs: readonly string[];
  /** 要调用的 scanner executable 或 Product-owned default marker。 */
  readonly executable: string;
}

/** `duplicateDetection` 的完整 Check-owned options。 */
export interface DuplicateDetectionOptions {
  /** jscpd scanner 命令与其 backend 并发上限。 */
  readonly scanner: ScannerCommandOptions &
    Readonly<{
      readonly maxConcurrency: number;
    }>;
  /** 未被 code area 覆盖时使用的 duplicate token 最小值。 */
  readonly defaultMinimumTokens: number;
  /** 按 known code area 覆盖 duplicate token 最小值。 */
  readonly minimumTokensByCodeArea: Readonly<Record<string, number>>;
}

/** `fileMetrics` 的完整 Check-owned options。 */
export interface FileMetricsOptions {
  /** scc scanner 命令。 */
  readonly scanner: ScannerCommandOptions;
  /** 每个文件 code-line metric 的阈值和低 decision-token allowance。 */
  readonly codeLines: Readonly<{
    /** 超过此值时产生 file metric finding 的绝对阈值。 */
    readonly absoluteFloor: number;
    /** 小型低 decision-token 文件可使用的较高 code-line allowance。 */
    readonly lowDecisionTokenAllowance: Readonly<{
      /** 使用 allowance 所需达到的 code-line 数。 */
      readonly codeLineFloor: number;
      /** 使用 allowance 时允许的最大 decision-token 数。 */
      readonly maxDecisionTokens: number;
    }>;
  }>;
}

/** `jsonValidation` 的完整 Check-owned options。 */
export interface JsonValidationOptions {
  /** 单个 JSON document 允许的最大 raw byte 数；必须是正安全整数。 */
  readonly maximumBytes: number;
}

/** `functionMetrics` 的完整 Check-owned options。 */
export interface FunctionMetricsOptions {
  /** lizard scanner 命令。 */
  readonly scanner: ScannerCommandOptions;
  /** function code-line 阈值和低 complexity allowance。 */
  readonly codeLines: Readonly<{
    /** 超过此值时产生 function code-line finding 的绝对阈值。 */
    readonly absoluteFloor: number;
    /** 小型低 complexity function 可使用的较高 code-line allowance。 */
    readonly lowComplexityAllowance: Readonly<{
      /** 使用 allowance 所需达到的 code-line 数。 */
      readonly codeLineFloor: number;
      /** allowance 只适用于小于此 exclusive complexity 上限的 function。 */
      readonly maxCyclomaticComplexityExclusive: number;
    }>;
  }>;
  /** function cyclomatic complexity 的绝对阈值。 */
  readonly cyclomaticComplexity: Readonly<{
    /** 超过此值时产生 complexity finding。 */
    readonly absoluteFloor: number;
  }>;
  /** function parameter count 的绝对阈值。 */
  readonly parameterCount: Readonly<{
    /** 超过此值时产生 parameter-count finding。 */
    readonly absoluteFloor: number;
  }>;
}

/** 严格验证当前 global scope 中小写 `.json` 文件的完整 default Check。 */
export const jsonValidation = defineCheck<"json-validation", JsonValidationOptions>({
  ...JSON_VALIDATION_CHECK_DEFINITION,
  execution: executeJsonValidation,
  options: { maximumBytes: 1_048_576 }
});

/**
 * 检测项目范围内的重复代码的完整 default Check。
 *
 * @remarks 用普通对象组合替换其 `options` branch；Product 会校验完整 shape 和已知 code area，
 * 不从环境变量或 Run Controls 推断 scanner override。
 */
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

/** 以 scc 计算文件级 code-line 指标的完整 default Check。 */
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

/** 以 lizard 计算 function 级行数、complexity 与 parameter 指标的完整 default Check。 */
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
  if (checkId === "json-validation") return validJsonValidationOptions(options);
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

function validJsonValidationOptions(value: object): boolean {
  const options = exactRecord(value, ["maximumBytes"]);
  return options !== undefined && positiveSafeInteger(options.maximumBytes);
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
