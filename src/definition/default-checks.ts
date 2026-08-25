import {
  DUPLICATE_DETECTION_CHECK_DEFINITION,
  executeDuplicateDetection
} from "../checks/builtins/duplicate-detection.ts";
import {
  MAINTENANCE_REMINDERS_CHECK_ID,
  maintenanceReminders,
  validMaintenanceReminderOptions,
  type MaintenanceReminder,
  type MaintenanceReminderOptions
} from "../checks/builtins/maintenance-reminders.ts";
import { DEFAULT_JSCPD_COMMAND } from "../checks/measurement/scanners/jscpd/default-command.ts";
import {
  JSON_VALIDATION_CHECK_DEFINITION,
  executeJsonValidation
} from "../checks/json-validation/json-validation.ts";
import {
  JSON_SCHEMA_VALIDATION_CHECK_DEFINITION,
  executeJsonSchemaValidation
} from "../checks/json-schema-validation/json-schema-validation.ts";
import {
  FILE_METRICS_CHECK_DEFINITION,
  executeFileMetrics
} from "../checks/builtins/file-metrics.ts";
import {
  FUNCTION_METRICS_CHECK_DEFINITION,
  executeFunctionMetrics
} from "../checks/builtins/function-metrics.ts";
import {
  MARKDOWN_LINK_VALIDATION_CHECK_DEFINITION,
  executeMarkdownLinkValidation
} from "../checks/builtins/markdown-link-validation.ts";
import { snapshotClosedArray, snapshotClosedRecord } from "../foundation/closed-values.ts";
import { defineCheck } from "./custom-check.ts";

export { maintenanceReminders };
export type { MaintenanceReminder, MaintenanceReminderOptions };

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

type JsonSchemaIdentityMode =
  | "require-match"
  | "configuration-authoritative"
  | "document-authoritative";

interface JsonSchemaIdentity {
  readonly mode: JsonSchemaIdentityMode;
}

type JsonSchemaReferenceSource =
  | Readonly<{ readonly kind: "bundled"; readonly catalog: "json-schema-2020-12" }>
  | Readonly<{
      readonly kind: "https";
      readonly id: string;
      readonly origin: string;
      readonly pathPrefix: string;
    }>;

type JsonSchemaReferenceResolution =
  | Readonly<{ readonly mode: "offline" }>
  | Readonly<{
      readonly mode: "allowlisted";
      readonly sources: readonly JsonSchemaReferenceSource[];
    }>;

interface RegisteredJsonSchema {
  readonly id: string;
  readonly path: string;
}

interface JsonSchemaInstanceBinding {
  readonly id: string;
  readonly instancePath: string;
  readonly schemaId: string;
}

/** `jsonSchemaValidation` 的完整 Check-owned options。 */
export interface JsonSchemaValidationOptions {
  /** 每个 local schema/instance document 允许的最大 raw byte 数；必须是正安全整数。 */
  readonly maximumBytes: number;
  /** 整个 Check 共用的 schema root identity 规则；不得按 schema 混用。 */
  readonly schemaIdentity: JsonSchemaIdentity;
  /** 默认离线；额外 schema source 必须显式 allowlist。 */
  readonly referenceResolution: JsonSchemaReferenceResolution;
  /** 显式注册的 schema resources；ID 是 binding 和 public fact 使用的安全 authoring identity。 */
  readonly schemas: readonly RegisteredJsonSchema[];
  /** 明确把一个 scope-approved instance path 绑定到一个已声明 schema。 */
  readonly bindings: readonly JsonSchemaInstanceBinding[];
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

/** `markdownLinkValidation` 的完整离线本地 Markdown 链接校验 options。 */
export interface MarkdownLinkValidationOptions {
  /** `false` 时缺失的本地文件或目录不构成 finding。 */
  readonly requireExistingTargets: boolean;
  /** 是否检查 `#anchor` 对当前 Markdown 文档标题的引用。 */
  readonly validateSameDocumentAnchors: boolean;
  /** 是否检查直接指向的 Markdown 文件中的 `#anchor`。 */
  readonly validateCrossDocumentAnchors: boolean;
  /** root 外本机目标的授权模式；不授权网络请求。 */
  readonly rootExternalTargetMode: "ignore" | "report" | "validate";
  /** 是否将空目录目标视为 finding。 */
  readonly requireNonEmptyDirectories: boolean;
  /** 每次运行的 Markdown 内容、occurrence 和 direct target work 上限。 */
  readonly limits: Readonly<{
    /** 单个 Markdown source 或 anchor target 可读取的最大 UTF-8 byte 数。 */
    readonly maxMarkdownBytes: number;
    /** 所有 source 可处理的 Markdown semantic occurrence 上限。 */
    readonly maxOccurrences: number;
    /** 可进入 direct endpoint validation 的 occurrence 上限。 */
    readonly maxTargetReads: number;
  }>;
}

/** 严格验证当前 global scope 中小写 `.json` 文件的完整 default Check。 */
export const jsonValidation = defineCheck<"json-validation", JsonValidationOptions>({
  ...JSON_VALIDATION_CHECK_DEFINITION,
  execution: executeJsonValidation,
  options: { maximumBytes: 1_048_576 }
});

/** 以显式 schema registry/binding 验证 scope-approved JSON instances 的完整 default Check。 */
export const jsonSchemaValidation = defineCheck<
  "json-schema-validation",
  JsonSchemaValidationOptions
>({
  ...JSON_SCHEMA_VALIDATION_CHECK_DEFINITION,
  execution: executeJsonSchemaValidation,
  options: {
    maximumBytes: 1_048_576,
    schemaIdentity: { mode: "require-match" },
    referenceResolution: { mode: "offline" },
    schemas: [],
    bindings: []
  }
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

/** 校验离线本地 Markdown 引用完整性的完整 default Check。 */
export const markdownLinkValidation = defineCheck<
  "markdown-link-validation",
  MarkdownLinkValidationOptions
>({
  ...MARKDOWN_LINK_VALIDATION_CHECK_DEFINITION,
  execution: executeMarkdownLinkValidation,
  options: {
    requireExistingTargets: true,
    validateSameDocumentAnchors: true,
    validateCrossDocumentAnchors: true,
    rootExternalTargetMode: "report",
    requireNonEmptyDirectories: false,
    limits: {
      maxMarkdownBytes: 1_048_576,
      maxOccurrences: 10_000,
      maxTargetReads: 1_000
    }
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
  if (checkId === "json-schema-validation") return validJsonSchemaValidationOptions(options);
  if (checkId === "markdown-link-validation") return validMarkdownLinkValidationOptions(options);
  if (checkId === MAINTENANCE_REMINDERS_CHECK_ID) return validMaintenanceReminderOptions(options);
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

function validJsonSchemaValidationOptions(candidateOptions: object): boolean {
  const options = exactRecord(candidateOptions, [
    "maximumBytes",
    "schemaIdentity",
    "referenceResolution",
    "schemas",
    "bindings"
  ]);
  if (
    options === undefined ||
    !positiveSafeInteger(options.maximumBytes) ||
    !validJsonSchemaIdentity(options.schemaIdentity) ||
    !validJsonSchemaReferenceResolution(options.referenceResolution)
  ) {
    return false;
  }

  const schemas = snapshotClosedArray(options.schemas);
  const bindings = snapshotClosedArray(options.bindings);
  const declaredSchemaIds = schemas === undefined ? undefined : validatedSchemaRegistryIds(schemas);
  return (
    bindings !== undefined &&
    declaredSchemaIds !== undefined &&
    validJsonSchemaBindings(bindings, declaredSchemaIds)
  );
}

function validJsonSchemaIdentity(candidateIdentity: unknown): boolean {
  const identity = exactRecord(candidateIdentity, ["mode"]);
  return (
    identity !== undefined &&
    (identity.mode === "require-match" ||
      identity.mode === "configuration-authoritative" ||
      identity.mode === "document-authoritative")
  );
}

function validJsonSchemaReferenceResolution(candidateResolution: unknown): boolean {
  const referenceResolution = snapshotClosedRecord(candidateResolution);
  if (referenceResolution === undefined || typeof referenceResolution.mode !== "string") {
    return false;
  }
  if (referenceResolution.mode === "offline") {
    return exactRecord(referenceResolution, ["mode"]) !== undefined;
  }
  if (referenceResolution.mode !== "allowlisted") return false;

  const allowlisted = exactRecord(referenceResolution, ["mode", "sources"]);
  const sources = allowlisted === undefined ? undefined : snapshotClosedArray(allowlisted.sources);
  return sources !== undefined && sources.length > 0 && validJsonSchemaReferenceSources(sources);
}

function validJsonSchemaReferenceSources(sources: readonly unknown[]): boolean {
  const sourceIds = new Set<string>();
  const sourceLocations = new Set<string>();
  let bundledCatalogCount = 0;
  for (const sourceCandidate of sources) {
    const sourceRecord = snapshotClosedRecord(sourceCandidate);
    if (sourceRecord === undefined || typeof sourceRecord.kind !== "string") return false;
    if (sourceRecord.kind === "bundled") {
      const bundledSource = exactRecord(sourceRecord, ["kind", "catalog"]);
      if (bundledSource === undefined || bundledSource.catalog !== "json-schema-2020-12") {
        return false;
      }
      bundledCatalogCount += 1;
      if (bundledCatalogCount > 1) return false;
      continue;
    }
    if (sourceRecord.kind !== "https") return false;
    const httpsSource = exactRecord(sourceRecord, ["kind", "id", "origin", "pathPrefix"]);
    if (
      httpsSource === undefined ||
      !safeAbsoluteIdentifier(httpsSource.id) ||
      !safeHttpsOrigin(httpsSource.origin) ||
      !safePathPrefix(httpsSource.pathPrefix) ||
      sourceIds.has(httpsSource.id)
    ) {
      return false;
    }
    const sourceLocation = `${httpsSource.origin}\n${httpsSource.pathPrefix}`;
    if (sourceLocations.has(sourceLocation)) return false;
    sourceIds.add(httpsSource.id);
    sourceLocations.add(sourceLocation);
  }
  return true;
}

/** Returns declared IDs only after the whole schema registry satisfies its closed authoring invariant. */
function validatedSchemaRegistryIds(schemas: readonly unknown[]): ReadonlySet<string> | undefined {
  const declaredSchemaIds = new Set<string>();
  const schemaPaths = new Set<string>();
  for (const schemaCandidate of schemas) {
    const schemaRecord = exactRecord(schemaCandidate, ["id", "path"]);
    if (
      schemaRecord === undefined ||
      !safeAbsoluteIdentifier(schemaRecord.id) ||
      !normalizedProjectJsonPath(schemaRecord.path) ||
      declaredSchemaIds.has(schemaRecord.id) ||
      schemaPaths.has(schemaRecord.path)
    ) {
      return undefined;
    }
    declaredSchemaIds.add(schemaRecord.id);
    schemaPaths.add(schemaRecord.path);
  }
  return declaredSchemaIds;
}

function validJsonSchemaBindings(
  bindings: readonly unknown[],
  declaredSchemaIds: ReadonlySet<string>
): boolean {
  const bindingIds = new Set<string>();
  const bindingTargets = new Set<string>();
  for (const bindingCandidate of bindings) {
    const bindingRecord = exactRecord(bindingCandidate, ["id", "instancePath", "schemaId"]);
    if (
      bindingRecord === undefined ||
      !safeBindingId(bindingRecord.id) ||
      !normalizedProjectJsonPath(bindingRecord.instancePath) ||
      typeof bindingRecord.schemaId !== "string" ||
      !declaredSchemaIds.has(bindingRecord.schemaId) ||
      bindingIds.has(bindingRecord.id)
    ) {
      return false;
    }
    const bindingTarget = `${bindingRecord.instancePath}\n${bindingRecord.schemaId}`;
    if (bindingTargets.has(bindingTarget)) return false;
    bindingIds.add(bindingRecord.id);
    bindingTargets.add(bindingTarget);
  }
  return true;
}

function safeAbsoluteIdentifier(identifier: unknown): identifier is string {
  if (typeof identifier !== "string" || identifier.length === 0 || identifier.length > 256) {
    return false;
  }
  try {
    const url = new URL(identifier);
    if (url.protocol !== "https:" && url.protocol !== "urn:") return false;
    if (
      url.username.length > 0 ||
      url.password.length > 0 ||
      url.search.length > 0 ||
      url.hash.length > 0
    ) {
      return false;
    }
    return url.href === identifier;
  } catch {
    return false;
  }
}

function safeHttpsOrigin(origin: unknown): origin is string {
  if (typeof origin !== "string" || origin.length === 0 || origin.length > 200) return false;
  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      url.hostname.length > 0 &&
      url.username.length === 0 &&
      url.password.length === 0 &&
      url.search.length === 0 &&
      url.hash.length === 0 &&
      url.pathname === "/" &&
      url.origin === origin
    );
  } catch {
    return false;
  }
}

function safePathPrefix(pathPrefix: unknown): pathPrefix is string {
  if (
    typeof pathPrefix !== "string" ||
    pathPrefix.length === 0 ||
    pathPrefix.length > 256 ||
    !pathPrefix.startsWith("/") ||
    (pathPrefix !== "/" && !pathPrefix.endsWith("/")) ||
    pathPrefix.includes("\\") ||
    pathPrefix.includes("?") ||
    pathPrefix.includes("#") ||
    pathPrefix.includes("//")
  ) {
    return false;
  }
  const segments = pathPrefix.split("/");
  return segments.every(
    (segment, index) => index === 0 || segment === "" || (segment !== "." && segment !== "..")
  );
}

function normalizedProjectJsonPath(projectPath: unknown): projectPath is string {
  if (
    typeof projectPath !== "string" ||
    projectPath.length === 0 ||
    projectPath.length > 512 ||
    !projectPath.endsWith(".json") ||
    projectPath.startsWith("/") ||
    projectPath.includes("\\") ||
    projectPath.includes("\u0000")
  ) {
    return false;
  }
  return projectPath
    .split("/")
    .every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function safeBindingId(bindingId: unknown): bindingId is string {
  return typeof bindingId === "string" && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u.test(bindingId);
}

function validMarkdownLinkValidationOptions(value: object): boolean {
  const options = exactRecord(value, [
    "requireExistingTargets",
    "validateSameDocumentAnchors",
    "validateCrossDocumentAnchors",
    "rootExternalTargetMode",
    "requireNonEmptyDirectories",
    "limits"
  ]);
  return (
    options !== undefined &&
    typeof options.requireExistingTargets === "boolean" &&
    typeof options.validateSameDocumentAnchors === "boolean" &&
    typeof options.validateCrossDocumentAnchors === "boolean" &&
    (options.rootExternalTargetMode === "ignore" ||
      options.rootExternalTargetMode === "report" ||
      options.rootExternalTargetMode === "validate") &&
    typeof options.requireNonEmptyDirectories === "boolean" &&
    validMarkdownLinkLimits(options.limits)
  );
}

function validMarkdownLinkLimits(value: unknown): boolean {
  const limits = exactRecord(value, ["maxMarkdownBytes", "maxOccurrences", "maxTargetReads"]);
  return (
    limits !== undefined &&
    boundedPositiveSafeInteger(limits.maxMarkdownBytes, 16_777_216) &&
    boundedPositiveSafeInteger(limits.maxOccurrences, 100_000) &&
    boundedPositiveSafeInteger(limits.maxTargetReads, 10_000)
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

function boundedPositiveSafeInteger(value: unknown, maximum: number): value is number {
  return positiveSafeInteger(value) && value <= maximum;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
