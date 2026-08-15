import type { CheckDefinition } from "./model.ts";
import { snapshotClosedArray, snapshotClosedRecord } from "./plain-record-values.ts";

function exactData(
  value: unknown,
  expectedKeys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  const keys = Object.keys(data);
  return keys.length === expectedKeys.length && keys.every((key) => expectedKeys.includes(key))
    ? data
    : undefined;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function resolveRequiredChecks(
  value: unknown,
  checkId: string,
  knownCheckIds: ReadonlySet<string>
): readonly string[] | undefined {
  const items = snapshotClosedArray(value);
  if (items === undefined) return undefined;
  const required: string[] = [];
  const seen = new Set<string>();
  for (const dependency of items) {
    if (typeof dependency !== "string" || dependency === checkId
      || !knownCheckIds.has(dependency) || seen.has(dependency)) return undefined;
    seen.add(dependency);
    required.push(dependency);
  }
  required.sort(compareText);
  return Object.freeze(required);
}

function resolveScheduleEntry(
  candidate: unknown,
  knownCheckIds: ReadonlySet<string>
): readonly [string, readonly string[]] | undefined {
  const data = exactData(candidate, ["checkId", "requiresChecks"]);
  if (typeof data?.checkId !== "string" || !knownCheckIds.has(data.checkId)) return undefined;
  const required = resolveRequiredChecks(data.requiresChecks, data.checkId, knownCheckIds);
  return required === undefined ? undefined : [data.checkId, required];
}

function resolveMutexNames(value: unknown): readonly string[] | undefined {
  const items = snapshotClosedArray(value);
  if (items === undefined) return undefined;
  const mutexes: string[] = [];
  const seen = new Set<string>();
  for (const mutex of items) {
    if (typeof mutex !== "string" || mutex.length === 0 || seen.has(mutex)) return undefined;
    seen.add(mutex);
    mutexes.push(mutex);
  }
  return Object.freeze(mutexes);
}

function resolveMutexEntry(
  candidate: unknown,
  knownCheckIds: ReadonlySet<string>
): readonly [string, readonly string[]] | undefined {
  const data = exactData(candidate, ["checkId", "mutex"]);
  if (typeof data?.checkId !== "string" || !knownCheckIds.has(data.checkId)) return undefined;
  const mutexes = resolveMutexNames(data.mutex);
  return mutexes === undefined ? undefined : [data.checkId, mutexes];
}

function hasScheduleCycle(schedules: ReadonlyMap<string, readonly string[]>): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (checkId: string): boolean => {
    if (visiting.has(checkId)) return true;
    if (visited.has(checkId)) return false;
    visiting.add(checkId);
    for (const dependency of schedules.get(checkId) ?? []) {
      if (visit(dependency)) return true;
    }
    visiting.delete(checkId);
    visited.add(checkId);
    return false;
  };
  return [...schedules.keys()].some(visit);
}

export function resolveCheckSchedules(
  value: unknown,
  definitions: readonly CheckDefinition[]
): ReadonlyMap<string, readonly string[]> | undefined {
  const candidates = snapshotClosedArray(value);
  if (candidates === undefined) return undefined;
  const knownCheckIds = new Set(definitions.map((definition) => definition.checkId));
  const schedules = new Map<string, readonly string[]>();
  for (const candidate of candidates) {
    const entry = resolveScheduleEntry(candidate, knownCheckIds);
    if (entry === undefined || schedules.has(entry[0])) return undefined;
    schedules.set(...entry);
  }
  return schedules.size === definitions.length && !hasScheduleCycle(schedules)
    ? schedules
    : undefined;
}

export function resolveCheckMutexes(
  value: unknown,
  definitions: readonly CheckDefinition[]
): ReadonlyMap<string, readonly string[]> | undefined {
  if (value === undefined) {
    return new Map(definitions.map(({ checkId }) => [checkId, Object.freeze([])] as const));
  }
  const candidates = snapshotClosedArray(value);
  if (candidates === undefined) return undefined;
  const knownCheckIds = new Set(definitions.map((definition) => definition.checkId));
  const mutexes = new Map<string, readonly string[]>();
  for (const candidate of candidates) {
    const entry = resolveMutexEntry(candidate, knownCheckIds);
    if (entry === undefined || mutexes.has(entry[0])) return undefined;
    mutexes.set(...entry);
  }
  return mutexes.size === definitions.length ? mutexes : undefined;
}

function resolveInitialSelection(
  value: unknown,
  knownCheckIds: ReadonlySet<string>
): Set<string> | undefined {
  const checkIds = snapshotClosedArray(value);
  if (checkIds === undefined) return undefined;
  const selected = new Set<string>();
  for (const checkId of checkIds) {
    if (typeof checkId !== "string" || !knownCheckIds.has(checkId) || selected.has(checkId)) {
      return undefined;
    }
    selected.add(checkId);
  }
  return selected;
}

function includeRequiredChecks(
  selectedCheckIds: Set<string>,
  schedules: ReadonlyMap<string, readonly string[]>
): void {
  const pending = [...selectedCheckIds];
  while (pending.length > 0) {
    const checkId = pending.pop()!;
    for (const dependency of schedules.get(checkId) ?? []) {
      if (selectedCheckIds.has(dependency)) continue;
      selectedCheckIds.add(dependency);
      pending.push(dependency);
    }
  }
}

export function resolveCheckSelection(
  value: unknown,
  definitions: readonly CheckDefinition[],
  schedules: ReadonlyMap<string, readonly string[]>
): ReadonlySet<string> | undefined {
  const knownCheckIds = new Set(definitions.map((definition) => definition.checkId));
  const selectedCheckIds = resolveInitialSelection(value, knownCheckIds);
  if (selectedCheckIds === undefined) return undefined;
  includeRequiredChecks(selectedCheckIds, schedules);
  return selectedCheckIds;
}
