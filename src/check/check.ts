import type { CanonicalJsonObject, CanonicalJsonValue } from "../data-boundary/canonical-json.ts";
import type { InheritableCheckCollection } from "./inherited-collection.ts";

export {
  inherit,
  isInheritedCheckCollection,
  snapshotInheritedCheckCollection
} from "./inherited-collection.ts";
export type {
  InheritCheckCollectionInput,
  InheritableCheckCollection,
  InheritedCheckCollection
} from "./inherited-collection.ts";

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
        /** 此 Check 的主要终态事实。 */
        readonly data: FinalData;
      }
    | {
        /** Check 已产生失败的 final data。 */
        readonly status: "failed";
        /** 此 Check 的主要终态事实。 */
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
      /** 已与原对象脱离的上游依赖终态数据。 */
      readonly data: CanonicalJsonObject;
    }
  | {
      /** dependency data 不可读取。 */
      readonly ok: false;
      /** 失败的授权或 upstream-data reason。 */
      readonly error: DependencyReadError;
    }
>;

/** 当前 Check 的一个已规范化直接 dependency 及其完整终态事实。 */
export type DependencyObservation = Readonly<{
  /** 已规范化、稳定排序的 direct dependency ID。 */
  readonly checkId: string;
  /** Core 已结算并冻结的四态 outcome。 */
  readonly outcome: CheckOutcome;
}>;

/** 当前 Check 的已规范化直接 dependencies 的 data reader。 */
export interface CheckDependencies {
  /**
   * 读取一个直接 dependency 的 canonical final data。
   *
   * @returns 已声明且为 `passed`/`failed` 的 dependency 返回其 data；未声明或没有 final data 时返回
   * `ok: false`，不会授权 transitive dependency。
   */
  get(checkId: string): DependencyReadResult;

  /**
   * 枚举当前 Check 的全部已规范化 direct dependencies。
   *
   * @returns 按有效 dependency ID 稳定排序、深度冻结的 `{ checkId, outcome }` observations；只含当前
   * Check 显式或继承得到的 direct dependencies，不暴露 scheduler 历史、transitive 或未声明 Check。
   */
  list(): readonly DependencyObservation[];
}

/** callback 可读取的、由 Product 规范化的项目上下文。 */
export interface CheckProjectContext {
  /** 本次 Run 使用的绝对项目根目录。 */
  readonly root: string;
  /** 已去重、排序的 caller-supplied flags。 */
  readonly flags: readonly string[];
}

/**
 * Check callback 收到的 Product-owned execution context。
 *
 * @typeParam Options - 此 Check preflight 后传给 execution 的 options shape。
 */
export interface CheckExecutionContext<Options extends object> {
  /** 读取当前 Check 的已声明 direct dependencies。 */
  readonly dependencies: CheckDependencies;
  /** 深度只读、canonical 的 invocation-local prepared Check options。 */
  readonly options: DeepReadonly<Options>;
  /** 已规范化的项目根与 flags。 */
  readonly project: CheckProjectContext;
  /** 写入 supplemental Records 的 reporter。 */
  readonly records: CheckRecordReporter;
  /** 本次 invocation 的 cancellation signal。 */
  readonly signal: AbortSignal;
}

/**
 * 一个 Check 的 callback signature。
 *
 * @typeParam Options - callback 从 context 读取的 prepared options shape。
 * @returns terminal Check result 或其 Promise。
 */
export type CheckExecution<Options extends object = object> = (
  this: void,
  context: CheckExecutionContext<Options>
) => CheckResult | Promise<CheckResult>;

/**
 * 在 Check execution 前，可选地为本次 invocation 准备 options。
 *
 * @remarks `signal` 与同一次 callback execution 使用同一个 cancellation signal；实现应在可等待工作中
 * 协作退出，而不是留下悬挂 work。bivariant callback 保持具体 options Check 可进入普通递归 Check
 * collection；Product 仍只会用该 Check 自己的 authored options 调用它。精确结果见
 * {@link CheckPreflightResult}。
 */
export type CheckPreflight<
  AuthoredOptions extends object = object,
  PreparedOptions extends object = AuthoredOptions
> = {
  bivarianceHack(
    this: void,
    options: DeepReadonly<AuthoredOptions>,
    signal: AbortSignal
  ): CheckPreflightResult<PreparedOptions> | Promise<CheckPreflightResult<PreparedOptions>>;
}["bivarianceHack"];

/**
 * Check-owned preflight 的判别结果。
 *
 * `failure/block` 不允许 fallback，直接以 owning reason 结算为 unavailable；`failure/continue` 必须给出
 * fallback 并继续 execution。两种进入 execution 的值都只属于本次 invocation，Product canonicalize/freeze
 * 后传递，不会改写 Definition 中 authored options。两个 failure 分支都必须给出 reason；continue reason
 * 是 Check-owned diagnostic identity，当前不会单独 materialize 为 outcome，调用方通过 messages 与后续
 * outcome 观察结果；block 物理上不含 fallback 字段。
 */
export type CheckPreflightResult<PreparedOptions extends object = object> = Readonly<
  | {
      readonly status: "success";
      readonly preparedOptions: PreparedOptions;
      readonly messages?: readonly CheckMessage[];
    }
  | {
      readonly status: "failure";
      readonly action: "block";
      readonly reason: CheckDeclaredUnavailableReason;
      readonly messages?: readonly CheckMessage[];
    }
  | {
      readonly status: "failure";
      readonly action: "continue";
      readonly fallback: PreparedOptions;
      readonly reason: CheckReason;
      readonly messages?: readonly CheckMessage[];
    }
>;

/**
 * 普通递归 Check authoring value 的共享字段。
 *
 * @typeParam AuthoredOptions - Definition 中的 declarative options shape。
 * @typeParam PreparedOptions - preflight 后 callback 接收的 invocation-local options shape。
 * @remarks 该值可以同时有 `execution` 和 `checks`；只有 executable node 产生 final Check fact。
 */
interface CheckBase<AuthoredOptions extends object, PreparedOptions extends object> {
  /** 在 Definition 内唯一的 stable Check ID。 */
  readonly checkId: string;
  /** 人读 progress 与 output 使用的非空名称。 */
  readonly displayName: string;
  /** Check-owned declarative options；默认 Check 的嵌套 branch 以普通对象组合替换。 */
  readonly options?: AuthoredOptions;
  /** 可执行节点的 callback；省略时此节点只承载递归 children。 */
  execution?(
    this: void,
    context: CheckExecutionContext<PreparedOptions>
  ): CheckResult | Promise<CheckResult>;
  /** 继承 scheduling context 的 child Checks，不会单独形成 container result。 */
  readonly checks?: readonly Check[];
  /** 直接 prerequisite Check IDs，或对父 dependency collection 的显式 edit。 */
  readonly dependsOn?: InheritableCheckCollection<string>;
  /** 此 Check 及其 descendants 的最大并行预算。 */
  readonly maxParallel?: number;
  /** 同一 ready admission 层级中的静态优先级；省略时继承并最终规范化为 `0`。 */
  readonly admissionPriority?: number;
  /** 共享资源名称，或对父 mutex collection 的显式 edit。 */
  readonly mutex?: InheritableCheckCollection<string>;
  /** 已结算 Check 的人读可见性；可执行节点默认 `always`。 */
  readonly visibility?: CheckVisibility;
}

/**
 * 判断两个 options shape 是否互相可赋值；互相可赋值时 execution 不需要 preparation 转换。
 */
type HasSameOptionsShape<AuthoredOptions extends object, PreparedOptions extends object> = [
  AuthoredOptions
] extends [PreparedOptions]
  ? [PreparedOptions] extends [AuthoredOptions]
    ? true
    : false
  : false;

/** Prepared shape 不同时，preflight 是建立安全转换的必填边界。 */
type CheckPreflightField<AuthoredOptions extends object, PreparedOptions extends object> =
  HasSameOptionsShape<AuthoredOptions, PreparedOptions> extends true
    ? Readonly<{ readonly preflight?: CheckPreflight<AuthoredOptions, PreparedOptions> }>
    : Readonly<{ readonly preflight: CheckPreflight<AuthoredOptions, PreparedOptions> }>;

/**
 * Project Definition 中的普通递归 Check authoring value。
 *
 * @typeParam AuthoredOptions - Definition 中的 declarative options shape。
 * @typeParam PreparedOptions - preflight 后 callback 接收的 invocation-local options shape。
 * @remarks Definition 只闭合 authored JSON options；preflight 在同一 Run 的所有 execution 前作为全局
 * barrier 执行。`PreparedOptions` 与 `AuthoredOptions` 不同时必须提供 preflight；同形时可以省略。它不进入
 * declarative fingerprint 或 machine output。
 */
export type Check<
  AuthoredOptions extends object = object,
  PreparedOptions extends object = AuthoredOptions
> = CheckBase<AuthoredOptions, PreparedOptions> &
  CheckPreflightField<AuthoredOptions, PreparedOptions>;

export type EmptyCheckOptions = Readonly<Record<never, never>>;

/**
 * 防止宽泛的 parser 标注擦除 `PromiseLike`。canonical `then` field 可以保存 JSON data，
 * 但不能保存使该值成为 thenable 的 callable。
 */
type NonThenableData = Readonly<{ readonly then?: CanonicalJsonValue }>;

/**
 * 将 canonical dependency data 还原为 provider final-data shape 的同步 parser。
 *
 * @typeParam FinalData - provider 在 `passed`/`failed` result 中声明的 final-data shape。
 * @remarks Product 不调用此 parser；provider 负责不受信任或跨版本 data 的业务验证。
 */
export type CheckDataParser<FinalData extends object = object> = (
  this: void,
  data: CanonicalJsonObject
) => FinalData & NonThenableData;

type CheckAuthoringBase<
  Id extends string,
  AuthoredOptions extends object,
  PreparedOptions extends object
> = Omit<CheckBase<AuthoredOptions, PreparedOptions>, "checkId" | "execution" | "options"> &
  CheckPreflightField<AuthoredOptions, PreparedOptions> &
  Readonly<{ readonly checkId: Id }>;

interface OrdinaryCheckFields<PreparedOptions extends object> {
  execution?(
    this: void,
    context: CheckExecutionContext<PreparedOptions>
  ): CheckResult | Promise<CheckResult>;
  readonly parseData?: never;
}

export type CheckWithOptions<
  Id extends string,
  AuthoredOptions extends object,
  PreparedOptions extends object = AuthoredOptions
> = CheckAuthoringBase<Id, AuthoredOptions, PreparedOptions> &
  OrdinaryCheckFields<PreparedOptions> &
  Readonly<{
    readonly options: AuthoredOptions;
  }>;

export type CheckWithoutOptions<Id extends string> = CheckAuthoringBase<
  Id,
  EmptyCheckOptions,
  EmptyCheckOptions
> &
  OrdinaryCheckFields<EmptyCheckOptions> &
  Readonly<{
    readonly options?: never;
  }>;

interface TypedCheckFields<PreparedOptions extends object, Parser extends CheckDataParser> {
  /**
   * 将 canonical runtime data 还原为 provider data。
   *
   * 启发式边界：同版本且受信任的 provider 若由测试保证 data shape，可仅将它实现为
   * identity/type anchor。这不验证 JavaScript 或基于 cast 的 producer、历史或跨版本 artifact，
   * 也不验证不受信任输入。
   */
  readonly parseData: Parser;

  execution(
    this: void,
    context: CheckExecutionContext<PreparedOptions>
  ): CheckResult<NoInfer<ReturnType<Parser>>> | Promise<CheckResult<NoInfer<ReturnType<Parser>>>>;
}

export type TypedCheckWithOptions<
  Id extends string,
  AuthoredOptions extends object,
  Parser extends CheckDataParser,
  PreparedOptions extends object = AuthoredOptions
> = CheckAuthoringBase<Id, AuthoredOptions, PreparedOptions> &
  TypedCheckFields<PreparedOptions, Parser> &
  Readonly<{
    readonly options: AuthoredOptions;
  }>;

export type TypedCheckWithoutOptions<
  Id extends string,
  Parser extends CheckDataParser
> = CheckAuthoringBase<Id, EmptyCheckOptions, EmptyCheckOptions> &
  TypedCheckFields<EmptyCheckOptions, Parser> &
  Readonly<{
    readonly options?: never;
  }>;

/**
 * 定义一个 Check，同时保留 literal `checkId`、options 与 typed-provider parser 的 inference。
 *
 * @remarks 此函数负责 authoring inference；{@link run} 负责 Project Definition validation。
 * @example 定义带 options、Records 与 messages 的自定义 Check
 * ```ts
 * function hasValidLicensePolicyOptions(options: object): boolean {
 *   const denied: unknown = Reflect.get(options, "denied");
 *   return (
 *     Object.keys(options).length === 1 &&
 *     Object.hasOwn(options, "denied") &&
 *     Array.isArray(denied) &&
 *     denied.every((license) => typeof license === "string")
 *   );
 * }
 *
 * const licensePolicy = defineCheck({
 *   checkId: "license-policy",
 *   displayName: "License policy",
 *   options: { denied: ["GPL-3.0-only"] },
 *   preflight(options) {
 *     return hasValidLicensePolicyOptions(options)
 *       ? { status: "success", preparedOptions: options }
 *       : { status: "failure", action: "block", reason: { code: "invalid-options" } };
 *   },
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
export function defineCheck<
  const Id extends string,
  AuthoredOptions extends object,
  PreparedOptions extends object = AuthoredOptions
>(
  value: CheckWithOptions<Id, AuthoredOptions, PreparedOptions>
): CheckWithOptions<Id, AuthoredOptions, PreparedOptions>;
export function defineCheck<const Id extends string>(
  value: CheckWithoutOptions<Id>
): CheckWithoutOptions<Id>;
export function defineCheck<
  const Id extends string,
  AuthoredOptions extends object,
  const Parser extends CheckDataParser,
  PreparedOptions extends object = AuthoredOptions
>(
  value: TypedCheckWithOptions<Id, AuthoredOptions, Parser, PreparedOptions>
): TypedCheckWithOptions<Id, AuthoredOptions, Parser, PreparedOptions>;
export function defineCheck<const Id extends string, const Parser extends CheckDataParser>(
  value: TypedCheckWithoutOptions<Id, Parser>
): TypedCheckWithoutOptions<Id, Parser>;
export function defineCheck(value: Check): Check {
  return value;
}
