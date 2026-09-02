import {
  isInheritedCheckCollection,
  snapshotInheritedCheckCollection,
  type InheritedCheckCollection
} from "../../check/check.ts";
import { parseUniqueIdentifiers } from "./collection-authoring.ts";

export type ParsedCheckCollection = Readonly<
  | { readonly kind: "exact"; readonly values: readonly string[] }
  | {
      readonly kind: "inherit";
      readonly add: readonly string[];
      readonly remove: readonly string[];
    }
>;

export type ParsedCheckScheduling = Readonly<{
  readonly admissionPriority: number | undefined;
  readonly dependsOn: ParsedCheckCollection | undefined;
  readonly maxParallel: number | undefined;
  readonly mutex: ParsedCheckCollection | undefined;
  readonly observes: ParsedCheckCollection | undefined;
}>;

/** Parses the closed relation, priority, and capacity fields for one authored Check. */
export function parseCheckScheduling(
  data: Readonly<Record<string, unknown>>
): ParsedCheckScheduling | undefined {
  const dependsOn = parseCollection(data, "dependsOn");
  const mutex = parseCollection(data, "mutex");
  const observes = parseCollection(data, "observes");
  const admissionPriority = parseAdmissionPriority(data.admissionPriority);
  const maxParallel = parseMaxParallel(data.maxParallel);
  if (dependsOn === null || mutex === null || observes === null) return undefined;
  if (admissionPriority === null || maxParallel === null) return undefined;
  return resolvedScheduling({ admissionPriority, dependsOn, maxParallel, mutex, observes });
}

function resolvedScheduling(
  scheduling: Readonly<{
    readonly admissionPriority: number | undefined;
    readonly dependsOn: ParsedCheckCollection | undefined;
    readonly maxParallel: number | undefined;
    readonly mutex: ParsedCheckCollection | undefined;
    readonly observes: ParsedCheckCollection | undefined;
  }>
): ParsedCheckScheduling {
  return Object.freeze({
    admissionPriority: scheduling.admissionPriority,
    dependsOn: scheduling.dependsOn ?? undefined,
    maxParallel: scheduling.maxParallel,
    mutex: scheduling.mutex ?? undefined,
    observes: scheduling.observes ?? undefined
  });
}

function parseAdmissionPriority(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function parseMaxParallel(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function parseCollection(
  data: Readonly<Record<string, unknown>>,
  field: "dependsOn" | "mutex" | "observes"
): ParsedCheckCollection | null | undefined {
  if (!Object.hasOwn(data, field)) return undefined;
  const value = data[field];
  if (isInheritedCheckCollection(value)) return parseInheritedCollection(value);
  const values = parseUniqueIdentifiers(value);
  return values === undefined ? null : Object.freeze({ kind: "exact", values });
}

function parseInheritedCollection(
  value: InheritedCheckCollection<unknown>
): ParsedCheckCollection | null {
  const data = snapshotInheritedCheckCollection(value);
  if (data === undefined || !hasExactInheritedKeys(data)) return null;
  const add = data.add === undefined ? Object.freeze([]) : parseUniqueIdentifiers(data.add);
  const remove =
    data.remove === undefined ? Object.freeze([]) : parseUniqueIdentifiers(data.remove);
  if (add === undefined || remove === undefined) return null;
  return Object.freeze({ kind: "inherit", add, remove });
}

function hasExactInheritedKeys(data: Readonly<Record<string, unknown>>): boolean {
  const keys = Object.keys(data);
  return keys.length > 0 && keys.every((key) => key === "add" || key === "remove");
}
