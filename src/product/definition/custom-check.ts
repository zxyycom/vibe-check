import type { RecordTypeDefinition } from "./check-definition.ts";
import type { ProjectQualityConfiguration } from "./quality.ts";

export type { RecordTypeDefinition } from "./check-definition.ts";

export type CheckReason = Readonly<{ readonly code: string }>;

export type CheckNotApplicableReason = CheckReason;
export type CheckDeclaredUnavailableReason = CheckReason;

export type CheckUnavailableReason = Readonly<{
  readonly code: string;
  readonly checkIds?: readonly string[];
}>;

export type CheckResult = Readonly<
  | { readonly status: "completed"; readonly verdict: "passed" | "failed" }
  | { readonly status: "not-applicable"; readonly reason?: CheckNotApplicableReason }
  | { readonly status: "unavailable"; readonly reason: CheckDeclaredUnavailableReason }
>;

export type CheckOutcome = Readonly<
  | { readonly status: "completed"; readonly verdict: "passed" | "failed" }
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

export type RecordLevel = "info" | "warning" | "error";
export type RecordFieldValue = boolean | number | string;

/** A Check-owned candidate; Product assigns its Check and Record identities. */
export interface QualityRecordCandidate {
  readonly recordTypeId: string;
  readonly level: RecordLevel;
  readonly semanticSubject: string;
  readonly message: string;
  readonly fields: Readonly<Record<string, RecordFieldValue>>;
  readonly location: Readonly<{
    readonly path: string;
    readonly line: number;
    readonly column: number;
  }> | null;
}

export interface CheckReferenceCandidate {
  readonly referenceName: string;
  readonly status: "complete" | "incomplete" | "unavailable";
  readonly relations: readonly Readonly<{
    readonly record: Pick<QualityRecordCandidate, "recordTypeId" | "semanticSubject" | "fields">;
    readonly relationId: string;
  }>[];
}

export interface CheckRecordReporter {
  report(candidate: QualityRecordCandidate): void;
  reportReference(candidate: CheckReferenceCandidate): void;
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
  readonly comparison: Readonly<{
    readonly referenceName: string;
    readonly revision: string;
    readonly root: string;
  }> | null;
  readonly cache: Readonly<{
    readonly directory: string;
    readonly enabled: boolean;
    reportActivity(activity: "failed" | "read" | "write"): void;
  }>;
}

export interface CheckExecutionContext<Options extends object> {
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
  readonly recordTypes?: readonly RecordTypeDefinition[];
  readonly options?: Options;
  execution?(
    this: void,
    context: CheckExecutionContext<Options>
  ): CheckResult | Promise<CheckResult>;
  readonly checks?: readonly Check[];
  readonly dependsOn?: InheritableCheckCollection<string>;
  readonly maxParallel?: number;
  readonly mutex?: InheritableCheckCollection<string>;
}

export type EmptyCheckOptions = Readonly<Record<never, never>>;

export type CheckWithOptions<Id extends string, Options extends object> = Omit<
  Check<Options>,
  "checkId" | "options"
> &
  Readonly<{
    readonly checkId: Id;
    readonly options: Options;
  }>;

export type CheckWithoutOptions<Id extends string> = Omit<
  Check<EmptyCheckOptions>,
  "checkId" | "options"
> &
  Readonly<{
    readonly checkId: Id;
    readonly options?: never;
  }>;

/** Improves literal inference only; validation remains at the Definition boundary. */
export function defineCheck<const Id extends string, Options extends object>(
  value: CheckWithOptions<Id, Options>
): CheckWithOptions<Id, Options>;
export function defineCheck<const Id extends string>(
  value: CheckWithoutOptions<Id>
): CheckWithoutOptions<Id>;
export function defineCheck(value: Check): Check {
  return value;
}
