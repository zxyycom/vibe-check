import type { BuiltInCheckId } from "./built-ins.ts";
import {
  appendScheduling,
  parseDescriptorReplacement,
  parseMaxParallel,
  parseSchedulingAppend,
  parseSchedulingValue,
  validatedBuiltInOptions,
  type BuiltInCheckReplacement,
  type BuiltInCheckSchedulingAppend
} from "./adjustment-patches.ts";
import type { CheckDefinition } from "../quality-core/check-record/model.ts";
import {
  snapshotClosedArray,
  snapshotClosedRecord
} from "../quality-core/check-record/plain-record-values.ts";
import { validateCheckDefinition } from "../quality-core/check-record/validation.ts";

export type {
  BuiltInCheckReplacement,
  BuiltInCheckSchedulingAppend,
  DuplicateDetectionOptionsReplacement,
  FileMetricsOptionsReplacement,
  FunctionMetricsOptionsReplacement
} from "./adjustment-patches.ts";

export interface BuiltInCheck<Id extends string, Options, OptionsReplacement> extends CheckDefinition {
  readonly kind: "built-in";
  readonly checkId: Id;
  readonly options: Readonly<Options>;
  readonly dependsOn?: string | readonly string[];
  readonly maxParallel?: number;
  readonly mutex?: string | readonly string[];
  readonly replace: (
    this: BuiltInCheck<Id, Options, OptionsReplacement>,
    replacement: BuiltInCheckReplacement<OptionsReplacement>
  ) => BuiltInCheck<Id, Options, OptionsReplacement>;
  readonly append: (
    this: BuiltInCheck<Id, Options, OptionsReplacement>,
    scheduling: BuiltInCheckSchedulingAppend
  ) => BuiltInCheck<Id, Options, OptionsReplacement>;
}

type BuiltInCheckData<Id extends string, Options> = CheckDefinition & Readonly<{
  readonly kind: "built-in";
  readonly checkId: Id;
  readonly options: Readonly<Options>;
  readonly dependsOn?: string | readonly string[];
  readonly maxParallel?: number;
  readonly mutex?: string | readonly string[];
}>;

export interface DescriptorInput<Id extends string, Options, OptionsReplacement> {
  readonly definition: CheckDefinition & Readonly<{ readonly checkId: Id }>;
  readonly options: Options;
  readonly parseOptionsReplacement: (value: unknown) => OptionsReplacement;
  readonly replaceOptions: (
    current: Readonly<Options>,
    replacement: OptionsReplacement
  ) => Options;
}

const descriptorData = new WeakMap<object, BuiltInCheckData<string, unknown>>();
const descriptorInputs = new Map<string, DescriptorInput<string, unknown, unknown>>();

export function createBuiltInDescriptor<Id extends string, Options, OptionsReplacement>(
  input: DescriptorInput<Id, Options, OptionsReplacement>,
  source: Partial<BuiltInCheckData<Id, Options>> = {}
): BuiltInCheck<Id, Options, OptionsReplacement> {
  descriptorInputs.set(input.definition.checkId, input as DescriptorInput<string, unknown, unknown>);
  const data = freezeBuiltInData({
    ...input.definition,
    kind: "built-in" as const,
    options: source.options ?? input.options,
    ...(source.dependsOn === undefined ? {} : { dependsOn: source.dependsOn }),
    ...(source.maxParallel === undefined ? {} : { maxParallel: source.maxParallel }),
    ...(source.mutex === undefined ? {} : { mutex: source.mutex })
  }) as BuiltInCheckData<Id, Options>;
  const descriptor = { ...data } as BuiltInCheck<Id, Options, OptionsReplacement>;
  Object.defineProperties(descriptor, {
    replace: {
      enumerable: true,
      value: descriptorReplace as BuiltInCheck<Id, Options, OptionsReplacement>["replace"]
    },
    append: {
      enumerable: true,
      value: descriptorAppend as BuiltInCheck<Id, Options, OptionsReplacement>["append"]
    }
  });
  const frozen = freezeBuiltInData(descriptor);
  descriptorData.set(frozen, data as BuiltInCheckData<string, unknown>);
  return frozen;
}

/** Removes Product-issued descriptor conveniences before the closed Project Definition boundary. */
export function materializeBuiltInDescriptor(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  return descriptorData.get(value) ?? snapshotProductDescriptorData(value) ?? value;
}

export function freezeBuiltInData<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) freezeBuiltInData(nested);
  return Object.freeze(value);
}

function descriptorReplace(this: unknown, replacement: unknown): unknown {
  const source = descriptorSource(this);
  const parsed = parseDescriptorReplacement(replacement, source.input.parseOptionsReplacement);
  const replacementData: Partial<BuiltInCheckData<string, unknown>> = {
    ...source.data,
    ...(parsed.options === undefined
      ? {}
      : { options: source.input.replaceOptions(source.data.options, parsed.options) as Readonly<unknown> }),
    ...(parsed.dependsOn === undefined ? {} : { dependsOn: parsed.dependsOn }),
    ...(parsed.maxParallel === undefined ? {} : { maxParallel: parsed.maxParallel }),
    ...(parsed.mutex === undefined ? {} : { mutex: parsed.mutex })
  };
  return createBuiltInDescriptor(source.input, replacementData);
}

function descriptorAppend(this: unknown, scheduling: unknown): unknown {
  const source = descriptorSource(this);
  const parsed = parseSchedulingAppend(scheduling);
  return createBuiltInDescriptor(source.input, {
    ...source.data,
    ...(parsed.dependsOn === undefined
      ? {}
      : { dependsOn: appendScheduling(source.data.dependsOn, parsed.dependsOn) }),
    ...(parsed.mutex === undefined
      ? {}
      : { mutex: appendScheduling(source.data.mutex, parsed.mutex) })
  });
}

function descriptorSource(value: unknown): Readonly<{
  readonly data: BuiltInCheckData<string, unknown>;
  readonly input: DescriptorInput<string, unknown, unknown>;
}> {
  const raw = materializeBuiltInDescriptor(value);
  const data = snapshotClosedRecord(raw);
  if (data === undefined || !hasExactKeys(data, [
    "kind", "checkId", "displayName", "recordTypes", "options"
  ], ["dependsOn", "maxParallel", "mutex"]) || data.kind !== "built-in" || typeof data.checkId !== "string") {
    return invalidAdjustment();
  }
  const input = descriptorInputs.get(data.checkId);
  if (input === undefined || !hasCanonicalMetadata(data, input.definition)) return invalidAdjustment();
  const options = validatedBuiltInOptions(data.checkId as BuiltInCheckId, data.options);
  return {
    input,
    data: {
      ...input.definition,
      kind: "built-in",
      options: options as Readonly<unknown>,
      ...(Object.hasOwn(data, "dependsOn") ? { dependsOn: parseSchedulingValue(data.dependsOn, "dependsOn") } : {}),
      ...(Object.hasOwn(data, "maxParallel") ? { maxParallel: parseMaxParallel(data.maxParallel) } : {}),
      ...(Object.hasOwn(data, "mutex") ? { mutex: parseSchedulingValue(data.mutex, "mutex") } : {})
    }
  };
}

function hasCanonicalMetadata(
  data: Readonly<Record<string, unknown>>,
  definition: CheckDefinition
): boolean {
  const candidate = validateCheckDefinition({
    checkId: data.checkId,
    displayName: data.displayName,
    recordTypes: data.recordTypes
  });
  const canonical = validateCheckDefinition(definition);
  return candidate.ok && canonical.ok
    && candidate.value.checkId === canonical.value.checkId
    && candidate.value.displayName === canonical.value.displayName
    && stableJson(candidate.value.recordTypes) === stableJson(canonical.value.recordTypes);
}

function stableJson(value: unknown): string {
  const array = snapshotClosedArray(value);
  if (array !== undefined) return stableArrayJson(array);
  const data = snapshotClosedRecord(value);
  if (data !== undefined) return stableRecordJson(data);
  return JSON.stringify(value);
}

function stableArrayJson(values: readonly unknown[]): string {
  return `[${values.map(stableJson).join(",")}]`;
}

function stableRecordJson(data: Readonly<Record<string, unknown>>): string {
  return `{${Object.keys(data).sort().map((key) => stableRecordEntryJson(key, data[key])).join(",")}}`;
}

function stableRecordEntryJson(key: string, value: unknown): string {
  return `${JSON.stringify(key)}:${stableJson(value)}`;
}

function snapshotProductDescriptorData(value: object): Readonly<Record<string, unknown>> | undefined {
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null
      || keys.some((key) => typeof key !== "string")) return undefined;
    const namedKeys = keys as string[];
    if (namedKeys.some((key) => {
      const descriptor = descriptors[key]!;
      return descriptor.get !== undefined || descriptor.set !== undefined || descriptor.enumerable !== true;
    }) || descriptors.replace?.value !== descriptorReplace || descriptors.append?.value !== descriptorAppend) {
      return undefined;
    }
    const data = Object.freeze(Object.fromEntries(namedKeys
      .filter((key) => key !== "replace" && key !== "append")
      .map((key) => [key, descriptors[key]!.value as unknown])));
    return snapshotClosedRecord(data) === undefined ? undefined : data;
  } catch {
    return undefined;
  }
}

function hasExactKeys(
  data: Readonly<Record<string, unknown>>,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[]
): boolean {
  const keys = Object.keys(data);
  return requiredKeys.every((key) => keys.includes(key))
    && keys.every((key) => requiredKeys.includes(key) || optionalKeys.includes(key));
}

function invalidAdjustment(): never {
  throw new TypeError("Invalid built-in descriptor adjustment");
}
