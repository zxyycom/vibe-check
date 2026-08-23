import type { ProjectQualityConfiguration } from "./quality.ts";
import type { CanonicalJsonObject, CanonicalJsonValue } from "../foundation/canonical-json.ts";

export type CheckReason = Readonly<{ readonly code: string }>;

export type CheckNotApplicableReason = CheckReason;
export type CheckDeclaredUnavailableReason = CheckReason;

export type CheckUnavailableReason = Readonly<{
  readonly code: string;
  readonly checkIds?: readonly string[];
}>;

export type CheckMessageLevel = "info" | "warning" | "error";

export interface CheckMessage {
  readonly level: CheckMessageLevel;
  readonly code: string;
  readonly message: string;
}

export interface CheckResultMessages {
  readonly messages?: readonly CheckMessage[];
}

export type CheckVisibility = "always" | "attention";

export type CheckResult<FinalData extends object = object> = Readonly<
  (
    | { readonly status: "passed"; readonly data: FinalData }
    | { readonly status: "failed"; readonly data: FinalData }
    | { readonly status: "not-applicable"; readonly reason?: CheckNotApplicableReason }
    | { readonly status: "unavailable"; readonly reason: CheckDeclaredUnavailableReason }
  ) &
    CheckResultMessages
>;

export type CheckOutcome = Readonly<
  | { readonly status: "passed"; readonly data: CanonicalJsonObject }
  | { readonly status: "failed"; readonly data: CanonicalJsonObject }
  | { readonly status: "not-applicable"; readonly reason?: CheckNotApplicableReason }
  | { readonly status: "unavailable"; readonly reason: CheckUnavailableReason }
>;

export type DeepReadonly<T> = T extends string | number | boolean | null
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : never;

interface RecordIdentityInput {
  readonly id: string;
}

interface CheckRecordReporter {
  report(identity: RecordIdentityInput, data: object): void;
}

export type DependencyReadError = Readonly<
  | {
      readonly code: "dependency-not-declared";
      readonly checkId: string;
    }
  | {
      readonly code: "upstream-data-unavailable";
      readonly checkId: string;
      readonly status: "not-applicable" | "unavailable";
    }
>;

export type DependencyReadResult = Readonly<
  | {
      readonly ok: true;
      readonly checkId: string;
      readonly status: "passed" | "failed";
      readonly data: CanonicalJsonObject;
    }
  | {
      readonly ok: false;
      readonly error: DependencyReadError;
    }
>;

export interface CheckDependencies {
  get(checkId: string): DependencyReadResult;
}

export interface CheckProjectContext {
  readonly root: string;
  readonly changedFiles: readonly string[];
  readonly flags: readonly string[];
  readonly files: Readonly<{
    readonly codeAreas: ProjectQualityConfiguration["codeAreas"];
    readonly excludeDirs: ProjectQualityConfiguration["excludeDirs"];
    readonly generatedFiles: ProjectQualityConfiguration["generatedFiles"];
    readonly include: ProjectQualityConfiguration["include"];
  }>;
  readonly cache: Readonly<{
    readonly directory: string;
    readonly enabled: boolean;
    reportActivity(activity: "failed" | "read" | "write"): void;
  }>;
}

export interface CheckExecutionContext<Options extends object> {
  readonly dependencies: CheckDependencies;
  readonly options: DeepReadonly<Options>;
  readonly project: CheckProjectContext;
  readonly records: CheckRecordReporter;
  readonly signal: AbortSignal;
}

export type CheckExecution<Options extends object = object> = (
  this: void,
  context: CheckExecutionContext<Options>
) => CheckResult | Promise<CheckResult>;

const INHERITED_CHECK_COLLECTION: unique symbol = Symbol("vibe-check.inherited-check-collection");

export type InheritCheckCollectionInput<T> = Readonly<
  | { readonly add: readonly T[]; readonly remove?: readonly T[] }
  | { readonly add?: readonly T[]; readonly remove: readonly T[] }
>;

/**
 * The marker is intentionally not authorable as a plain object. Definition
 * validation recognizes only values created through `inherit`.
 */
export type InheritedCheckCollection<T> = InheritCheckCollectionInput<T> &
  Readonly<{
    readonly [INHERITED_CHECK_COLLECTION]: true;
  }>;

export type InheritableCheckCollection<T> = readonly T[] | InheritedCheckCollection<T>;

const inheritedCollections = new WeakSet();

type InheritedCollectionEntry = "data" | "invalid" | "marker";

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
  snapshot[key] = descriptor.value;
  return "data";
}

function isDataDescriptor(
  descriptor: PropertyDescriptor | undefined
): descriptor is PropertyDescriptor {
  return descriptor !== undefined && descriptor.get === undefined && descriptor.set === undefined;
}

export interface Check<Options extends object = object> {
  readonly checkId: string;
  readonly displayName: string;
  readonly options?: Options;
  execution?(
    this: void,
    context: CheckExecutionContext<Options>
  ): CheckResult | Promise<CheckResult>;
  readonly checks?: readonly Check[];
  readonly dependsOn?: InheritableCheckCollection<string>;
  readonly maxParallel?: number;
  readonly mutex?: InheritableCheckCollection<string>;
  readonly visibility?: CheckVisibility;
}

export type EmptyCheckOptions = Readonly<Record<never, never>>;

/**
 * Prevents a broad parser annotation from erasing PromiseLike. A canonical
 * `then` field may hold JSON data, but never the callable that makes a value thenable.
 */
type NonThenableData = Readonly<{ readonly then?: CanonicalJsonValue }>;

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

/** Improves literal inference only; validation remains at the Definition boundary. */
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
