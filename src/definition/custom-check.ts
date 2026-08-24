import type { ProjectQualityConfiguration } from "./quality-configuration.ts";
import type { CanonicalJsonObject, CanonicalJsonValue } from "../foundation/canonical-json.ts";

/** Check 无法给出 final data 时返回的受控 reason code。 */
export type CheckReason = Readonly<{
  /** 由 owning Check 定义、供调用方诊断的稳定 code。 */
  readonly code: string;
}>;

/** `not-applicable` Check result 的可选 reason。 */
export type CheckNotApplicableReason = CheckReason;
/** author callback 明确返回 `unavailable` 时必须提供的 reason。 */
export type CheckDeclaredUnavailableReason = CheckReason;

/** `unavailable` Check outcome 的 reason；可列出导致当前 Check 不可用的上游 Check。 */
export type CheckUnavailableReason = Readonly<{
  /** 由当前 Check 或 Product 边界给出的受控原因。 */
  readonly code: string;
  /** 仅在上游关系有助于定位时给出的相关 Check IDs。 */
  readonly checkIds?: readonly string[];
}>;

/** 终端 Check message 的 presentation severity。 */
export type CheckMessageLevel = "info" | "warning" | "error";

/** 由 Check author 附加到 terminal result 的补充消息。 */
export interface CheckMessage {
  /** 人读 presentation 使用的 severity。 */
  readonly level: CheckMessageLevel;
  /** owning Check namespace 内的稳定 message code。 */
  readonly code: string;
  /** 非空消息正文；Product 保留 author 提供的字符串。 */
  readonly message: string;
}

/** 可附加到每个 {@link CheckResult} branch 的有序 terminal messages。 */
export interface CheckResultMessages {
  /** 省略、`undefined` 或空数组都表示没有 supplemental messages。 */
  readonly messages?: readonly CheckMessage[];
}

/** 已结算 Check 在人读 progress 中的可见性。 */
export type CheckVisibility = "always" | "attention";

/**
 * Check callback 的 terminal result。
 *
 * @typeParam FinalData - `passed` 或 `failed` 时保留为 canonical final data 的业务对象。
 * @remarks `not-applicable` 与 `unavailable` 不携带 final data；普通 callback、Record 或取消失败由
 * Product 转换为 `unavailable`，而不是抛出为 Run 的成功结果。
 */
export type CheckResult<FinalData extends object = object> = Readonly<
  (
    | {
        /** Check 已产生通过的 final data。 */
        readonly status: "passed";
        /** Check-owned primary final fact。 */
        readonly data: FinalData;
      }
    | {
        /** Check 已产生失败的 final data。 */
        readonly status: "failed";
        /** Check-owned primary final fact。 */
        readonly data: FinalData;
      }
    | {
        /** Check 在当前 invocation 中不适用。 */
        readonly status: "not-applicable";
        /** 不适用的可选受控原因。 */
        readonly reason?: CheckNotApplicableReason;
      }
    | {
        /** Check 不能提供 terminal data。 */
        readonly status: "unavailable";
        /** 不可用的受控原因。 */
        readonly reason: CheckDeclaredUnavailableReason;
      }
  ) &
    CheckResultMessages
>;

/** 已 materialize 到 Core snapshot 的 Check terminal outcome。 */
export type CheckOutcome = Readonly<
  | {
      /** 已 materialize 的通过 outcome。 */
      readonly status: "passed";
      /** 已 canonicalize 的 primary final fact。 */
      readonly data: CanonicalJsonObject;
    }
  | {
      /** 已 materialize 的失败 outcome。 */
      readonly status: "failed";
      /** 已 canonicalize 的 primary final fact。 */
      readonly data: CanonicalJsonObject;
    }
  | {
      /** 已 materialize 的不适用 outcome。 */
      readonly status: "not-applicable";
      /** 不适用的可选受控原因。 */
      readonly reason?: CheckNotApplicableReason;
    }
  | {
      /** 已 materialize 的不可用 outcome。 */
      readonly status: "unavailable";
      /** 包含相关 upstream Check IDs 的受控原因。 */
      readonly reason: CheckUnavailableReason;
    }
>;

/** 将 callback options 转为不可变观察值的递归 utility type。 */
export type DeepReadonly<T> = T extends string | number | boolean | null
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : never;

/** callback 写入 supplemental Record 时的 Check-local identity。 */
interface RecordIdentityInput {
  /** 在当前 Check 内唯一的 Record ID。 */
  readonly id: string;
}

/** callback 写入 supplemental Records 的 Product-owned reporter。 */
interface CheckRecordReporter {
  /** 记录一个补充事实；它不决定 Check 的 terminal status。 */
  report(identity: RecordIdentityInput, data: object): void;
}

/** 读取已声明 dependency final data 时的失败原因。 */
export type DependencyReadError = Readonly<
  | {
      /** 当前 Check 未声明所请求的 dependency ID。 */
      readonly code: "dependency-not-declared";
      /** 被拒绝的 dependency ID。 */
      readonly checkId: string;
    }
  | {
      /** 已声明 upstream 没有可读取的 final data。 */
      readonly code: "upstream-data-unavailable";
      /** 没有 final data 的 direct dependency ID。 */
      readonly checkId: string;
      /** 阻止 readback 的 upstream terminal status。 */
      readonly status: "not-applicable" | "unavailable";
    }
>;

/** {@link CheckDependencies.get} 的受控 readback 结果。 */
export type DependencyReadResult = Readonly<
  | {
      /** 成功读取 direct dependency final data。 */
      readonly ok: true;
      /** 被读取的 direct dependency ID。 */
      readonly checkId: string;
      /** upstream 已结算为 `passed` 或 `failed` 的 status。 */
      readonly status: "passed" | "failed";
      /** detached canonical upstream final data。 */
      readonly data: CanonicalJsonObject;
    }
  | {
      /** dependency data 不可读取。 */
      readonly ok: false;
      /** 失败的授权或 upstream-data reason。 */
      readonly error: DependencyReadError;
    }
>;

/** 当前 Check 的已规范化直接 dependencies 的 data reader。 */
export interface CheckDependencies {
  /**
   * 读取一个直接 dependency 的 canonical final data。
   *
   * @returns 已声明且为 `passed`/`failed` 的 dependency 返回其 data；未声明或没有 final data 时返回
   * `ok: false`，不会授权 transitive dependency。
   */
  get(checkId: string): DependencyReadResult;
}

/** callback 可读取的、由 Product 规范化的项目上下文。 */
export interface CheckProjectContext {
  /** 本次 Run 使用的绝对项目根目录。 */
  readonly root: string;
  /** 本次调用提供的已变更文件路径。 */
  readonly changedFiles: readonly string[];
  /** 已去重、排序的 caller-supplied flags。 */
  readonly flags: readonly string[];
  /** callback 可观察的已规范化文件范围。 */
  readonly files: Readonly<{
    /** 定义 named code areas 的质量配置。 */
    readonly codeAreas: ProjectQualityConfiguration["codeAreas"];
    /** 默认排除的目录名。 */
    readonly excludeDirs: ProjectQualityConfiguration["excludeDirs"];
    /** 识别 generated files 的 glob 集合。 */
    readonly generatedFiles: ProjectQualityConfiguration["generatedFiles"];
    /** 允许进入项目范围的 glob 集合。 */
    readonly include: ProjectQualityConfiguration["include"];
  }>;
  /** callback 可观察并报告活动的 cache context。 */
  readonly cache: Readonly<{
    /** 本次 Run 的 cache 目录。 */
    readonly directory: string;
    /** cache effect 是否启用。 */
    readonly enabled: boolean;
    /** 向 Product 报告一次 cache 活动，不直接暴露 cache I/O API。 */
    reportActivity(activity: "failed" | "read" | "write"): void;
  }>;
}

/**
 * Check callback 收到的 Product-owned execution context。
 *
 * @typeParam Options - 此 Check `options` 的 authoring shape。
 */
export interface CheckExecutionContext<Options extends object> {
  /** 读取当前 Check 的已声明 direct dependencies。 */
  readonly dependencies: CheckDependencies;
  /** 深度只读的 validated Check options。 */
  readonly options: DeepReadonly<Options>;
  /** 已规范化的项目、文件范围与 cache context。 */
  readonly project: CheckProjectContext;
  /** 写入 supplemental Records 的 reporter。 */
  readonly records: CheckRecordReporter;
  /** 本次 invocation 的 cancellation signal。 */
  readonly signal: AbortSignal;
}

/**
 * 一个 Check 的 callback signature。
 *
 * @typeParam Options - callback 从 context 读取的 validated options shape。
 * @returns terminal Check result 或其 Promise。
 */
export type CheckExecution<Options extends object = object> = (
  this: void,
  context: CheckExecutionContext<Options>
) => CheckResult | Promise<CheckResult>;

const INHERITED_CHECK_COLLECTION: unique symbol = Symbol("vibe-check.inherited-check-collection");

/** 使用 {@link inherit} 对父 Check 的 string collection 做显式增删的输入。 */
export type InheritCheckCollectionInput<T> = Readonly<
  | { readonly add: readonly T[]; readonly remove?: readonly T[] }
  | { readonly add?: readonly T[]; readonly remove: readonly T[] }
>;

/**
 * 由 {@link inherit} 创建、带有不可伪造 marker 的 collection edit。
 *
 * @remarks Definition validation 不接受看起来相同的 plain object。
 */
export type InheritedCheckCollection<T> = InheritCheckCollectionInput<T> &
  Readonly<{
    readonly [INHERITED_CHECK_COLLECTION]: true;
  }>;

/**
 * 可以直接替换父 collection 的数组，或由 {@link inherit} 表示的显式 edit。
 *
 * @typeParam T - collection item 类型。
 */
export type InheritableCheckCollection<T> = readonly T[] | InheritedCheckCollection<T>;

const inheritedCollections = new WeakSet();

type InheritedCollectionEntry = "data" | "invalid" | "marker";

/**
 * 创建可用于 `dependsOn` 或 `mutex` 的受信任继承编辑。
 *
 * @typeParam T - 要添加或移除的 collection item 类型。
 * @param value - 至少提供 `add` 或 `remove` 的 edit；空数组可显式表示不添加或不移除。
 * @returns 只有此函数创建的值会被 Definition validation 识别为 inherited collection。
 */
export function inherit<T>(value: InheritCheckCollectionInput<T>): InheritedCheckCollection<T> {
  const result = { ...value, [INHERITED_CHECK_COLLECTION]: true as const };
  Object.defineProperty(result, INHERITED_CHECK_COLLECTION, { enumerable: false });
  inheritedCollections.add(result);
  return result;
}

export function isInheritedCheckCollection(
  value: unknown
): value is InheritedCheckCollection<unknown> {
  return typeof value === "object" && value !== null && inheritedCollections.has(value);
}

/** Copies the trusted marker while preserving the authoring data's closed shape. */
export function snapshotInheritedCheckCollection(
  value: InheritedCheckCollection<unknown>
): Readonly<Record<string, unknown>> | undefined {
  try {
    if (!hasPlainObjectPrototype(value)) return undefined;
    const snapshot: Record<string, unknown> = {};
    let hasMarker = false;
    for (const key of Reflect.ownKeys(value)) {
      const entry = snapshotInheritedCollectionEntry(
        snapshot,
        key,
        Object.getOwnPropertyDescriptor(value, key)
      );
      if (entry === "invalid") return undefined;
      if (entry === "marker") hasMarker = true;
    }
    return hasMarker ? Object.freeze(snapshot) : undefined;
  } catch {
    return undefined;
  }
}

function hasPlainObjectPrototype(value: object): boolean {
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function snapshotInheritedCollectionEntry(
  snapshot: Record<string, unknown>,
  key: PropertyKey,
  descriptor: PropertyDescriptor | undefined
): InheritedCollectionEntry {
  if (!isDataDescriptor(descriptor)) return "invalid";
  if (key === INHERITED_CHECK_COLLECTION) {
    return descriptor.enumerable || descriptor.value !== true ? "invalid" : "marker";
  }
  if (typeof key !== "string" || descriptor.enumerable !== true) return "invalid";
  Object.defineProperty(snapshot, key, {
    configurable: true,
    enumerable: true,
    value: descriptor.value,
    writable: true
  });
  return "data";
}

function isDataDescriptor(
  descriptor: PropertyDescriptor | undefined
): descriptor is PropertyDescriptor {
  return descriptor !== undefined && descriptor.get === undefined && descriptor.set === undefined;
}

/**
 * Project Definition 中的普通递归 Check authoring value。
 *
 * @typeParam Options - `options` 与 executable callback 共享的 validated option shape。
 * @remarks 该值可以同时有 `execution` 和 `checks`；只有 executable node 产生 final Check fact。
 */
export interface Check<Options extends object = object> {
  /** 在 Definition 内唯一的 stable Check ID。 */
  readonly checkId: string;
  /** 人读 progress 与 output 使用的非空名称。 */
  readonly displayName: string;
  /** Check-owned declarative options；默认 Check 的嵌套 branch 以普通对象组合替换。 */
  readonly options?: Options;
  /** 可执行节点的 callback；省略时此节点只承载递归 children。 */
  execution?(
    this: void,
    context: CheckExecutionContext<Options>
  ): CheckResult | Promise<CheckResult>;
  /** 继承 scheduling context 的 child Checks，不会单独形成 container result。 */
  readonly checks?: readonly Check[];
  /** 直接 prerequisite Check IDs，或对父 dependency collection 的显式 edit。 */
  readonly dependsOn?: InheritableCheckCollection<string>;
  /** 此 Check 及其 descendants 的最大并行预算。 */
  readonly maxParallel?: number;
  /** 共享资源名称，或对父 mutex collection 的显式 edit。 */
  readonly mutex?: InheritableCheckCollection<string>;
  /** 已结算 Check 的人读可见性；可执行节点默认 `always`。 */
  readonly visibility?: CheckVisibility;
}

export type EmptyCheckOptions = Readonly<Record<never, never>>;

/**
 * Prevents a broad parser annotation from erasing PromiseLike. A canonical
 * `then` field may hold JSON data, but never the callable that makes a value thenable.
 */
type NonThenableData = Readonly<{ readonly then?: CanonicalJsonValue }>;

/**
 * 将 canonical dependency data 还原为 provider-owned final-data shape 的同步 parser。
 *
 * @typeParam FinalData - provider 在 `passed`/`failed` result 中声明的 final-data shape。
 * @remarks Product 不调用此 parser。provider 负责不受信任或跨版本 data 的业务验证。
 */
export type CheckDataParser<FinalData extends object = object> = (
  this: void,
  data: CanonicalJsonObject
) => FinalData & NonThenableData;

type CheckAuthoringBase<Id extends string, Options extends object> = Omit<
  Check<Options>,
  "checkId" | "execution" | "options"
> &
  Readonly<{ readonly checkId: Id }>;

interface OrdinaryCheckFields<Options extends object> {
  execution?(
    this: void,
    context: CheckExecutionContext<Options>
  ): CheckResult | Promise<CheckResult>;
  readonly parseData?: never;
}

export type CheckWithOptions<Id extends string, Options extends object> = CheckAuthoringBase<
  Id,
  Options
> &
  OrdinaryCheckFields<Options> &
  Readonly<{
    readonly options: Options;
  }>;

export type CheckWithoutOptions<Id extends string> = CheckAuthoringBase<Id, EmptyCheckOptions> &
  OrdinaryCheckFields<EmptyCheckOptions> &
  Readonly<{
    readonly options?: never;
  }>;

interface TypedCheckFields<Options extends object, Parser extends CheckDataParser> {
  /**
   * Restores provider data from canonical runtime data.
   *
   * Heuristic: a same-version trusted provider may implement this only as an
   * identity/type anchor when provider tests guarantee the shape. That does
   * not validate JavaScript or cast-based producers, historical or
   * cross-version artifacts, or untrusted input.
   */
  readonly parseData: Parser;

  execution(
    this: void,
    context: CheckExecutionContext<Options>
  ): CheckResult<NoInfer<ReturnType<Parser>>> | Promise<CheckResult<NoInfer<ReturnType<Parser>>>>;
}

export type TypedCheckWithOptions<
  Id extends string,
  Options extends object,
  Parser extends CheckDataParser
> = CheckAuthoringBase<Id, Options> &
  TypedCheckFields<Options, Parser> &
  Readonly<{ readonly options: Options }>;

export type TypedCheckWithoutOptions<
  Id extends string,
  Parser extends CheckDataParser
> = CheckAuthoringBase<Id, EmptyCheckOptions> &
  TypedCheckFields<EmptyCheckOptions, Parser> &
  Readonly<{ readonly options?: never }>;

/**
 * 定义一个 Check，同时保留 literal `checkId`、options 与 typed-provider parser 的 inference。
 *
 * @remarks 此函数只改善 authoring 类型；Project Definition validation 仍在 {@link run} 的边界执行。
 * @example 定义带 options、Records 与 messages 的自定义 Check
 * ```ts
 * const licensePolicy = defineCheck({
 *   checkId: "license-policy",
 *   displayName: "License policy",
 *   options: { denied: ["GPL-3.0-only"] },
 *   visibility: "attention",
 *   execution({ options, records, signal }) {
 *     if (signal.aborted) return { status: "unavailable", reason: { code: "cancelled" } };
 *
 *     const deniedCount = options.denied.length;
 *     if (deniedCount > 0) {
 *       records.report({ id: "denied-license" }, { count: deniedCount });
 *       return {
 *         status: "failed",
 *         data: { deniedCount },
 *         messages: [{ level: "warning", code: "denied-license", message: "Denied licenses found." }]
 *       };
 *     }
 *     return { status: "passed", data: { deniedCount: 0 } };
 *   }
 * });
 * ```
 */
export function defineCheck<const Id extends string, Options extends object>(
  value: CheckWithOptions<Id, Options>
): CheckWithOptions<Id, Options>;
export function defineCheck<const Id extends string>(
  value: CheckWithoutOptions<Id>
): CheckWithoutOptions<Id>;
export function defineCheck<
  const Id extends string,
  Options extends object,
  const Parser extends CheckDataParser
>(value: TypedCheckWithOptions<Id, Options, Parser>): TypedCheckWithOptions<Id, Options, Parser>;
export function defineCheck<const Id extends string, const Parser extends CheckDataParser>(
  value: TypedCheckWithoutOptions<Id, Parser>
): TypedCheckWithoutOptions<Id, Parser>;
export function defineCheck(value: Check): Check {
  return value;
}
