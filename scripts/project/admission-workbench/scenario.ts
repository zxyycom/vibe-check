import type { AdmissionGraphInput, SchedulerGraphSnapshot } from "@zxyycom/vibe-check";

export type ContentionPreset = "zero" | "weak" | "strong";
export type PolicyRegistryId = "learned" | "static";

export interface Profile {
  readonly id: string;
  readonly multiplierSamples: readonly number[];
  readonly nominalWorkMs: number;
  readonly resourceClaims: readonly ResourceUnits[];
}

export interface ResourceUnits {
  readonly resourceId: string;
  readonly units: number;
}

export interface Scenario {
  readonly assumptionIds: readonly string[];
  readonly contention: ContentionPreset;
  readonly graph: AdmissionGraphInput;
  readonly mappingIdentity?: string;
  readonly outcomes?: Readonly<Record<string, "satisfied" | "unsatisfied">>;
  readonly policyIds: readonly PolicyRegistryId[];
  readonly profiles: readonly Profile[];
  readonly scenarioId: string;
  readonly scenarioVersion: 1;
  readonly taskProfiles: Readonly<Record<string, string>>;
}

/** Validates and detaches the repository-private scenario contract, excluding graph legality. */
export function validateScenario(value: unknown): Scenario {
  const scenario = exactRecord(value, "scenario", [
    "assumptionIds",
    "contention",
    "graph",
    "mappingIdentity?",
    "outcomes?",
    "policyIds",
    "profiles",
    "scenarioId",
    "scenarioVersion",
    "taskProfiles"
  ]);
  if (scenario.scenarioVersion !== 1 || !isStableId(scenario.scenarioId)) {
    throw new TypeError("invalid scenario identity");
  }
  if (
    scenario.contention !== "zero" &&
    scenario.contention !== "weak" &&
    scenario.contention !== "strong"
  ) {
    throw new TypeError("invalid contention preset");
  }
  const graph = validateGraphShape(scenario.graph);
  const profiles = validateProfiles(scenario.profiles);
  const taskProfiles = stringRecord(scenario.taskProfiles, "scenario.taskProfiles");
  validateTaskProfiles(graph.graph.tasks, profiles, taskProfiles);
  const outcomes = optionalOutcomes(scenario.outcomes, graph.graph.tasks);
  const policyIds = policyRegistryIds(scenario.policyIds);
  const assumptionIds = stableIdArray(scenario.assumptionIds, "scenario.assumptionIds", false);
  if (scenario.mappingIdentity !== undefined && !isStableId(scenario.mappingIdentity)) {
    throw new TypeError("scenario.mappingIdentity must be a non-empty stable string");
  }
  return freezeScenario({
    assumptionIds,
    contention: scenario.contention,
    graph,
    ...(scenario.mappingIdentity === undefined
      ? {}
      : { mappingIdentity: scenario.mappingIdentity }),
    ...(outcomes === undefined ? {} : { outcomes }),
    policyIds,
    profiles: [...profiles.values()],
    scenarioId: scenario.scenarioId,
    scenarioVersion: 1,
    taskProfiles
  });
}

function validateGraphShape(value: unknown): AdmissionGraphInput {
  const input = exactRecord(value, "scenario.graph", ["graph", "maxParallel"]);
  const graphRecord = exactRecord(input.graph, "scenario.graph.graph", [
    "resourceCapacities",
    "scopes",
    "tasks"
  ]);
  if (typeof input.maxParallel !== "number")
    throw new TypeError("scenario.graph.maxParallel must be a number");
  return freezeScenario({
    graph: {
      resourceCapacities: resourceArray(graphRecord.resourceCapacities, "resourceCapacities"),
      scopes: scopeArray(graphRecord.scopes),
      tasks: taskArray(graphRecord.tasks)
    },
    maxParallel: input.maxParallel
  });
}

function taskArray(value: unknown): SchedulerGraphSnapshot["tasks"] {
  if (!Array.isArray(value)) throw new TypeError("scenario graph tasks must be an array");
  return value.map((candidate, index) => {
    const entry = exactRecord(candidate, `scenario graph tasks[${index}]`, [
      "admissionPriority",
      "dependsOn",
      "mutex",
      "observes",
      "resourceClaims",
      "scopeId",
      "taskId"
    ]);
    if (typeof entry.admissionPriority !== "number")
      throw new TypeError("task priority must be a number");
    if (entry.scopeId !== null && typeof entry.scopeId !== "string")
      throw new TypeError("task scopeId must be string or null");
    if (!isStableId(entry.taskId)) throw new TypeError("taskId must be a non-empty string");
    return {
      admissionPriority: entry.admissionPriority,
      dependsOn: stableIdArray(entry.dependsOn, "task.dependsOn"),
      mutex: stableIdArray(entry.mutex, "task.mutex"),
      observes: stableIdArray(entry.observes, "task.observes"),
      resourceClaims: resourceArray(entry.resourceClaims, "task.resourceClaims"),
      scopeId: entry.scopeId,
      taskId: entry.taskId
    };
  });
}

function scopeArray(value: unknown): SchedulerGraphSnapshot["scopes"] {
  if (!Array.isArray(value)) throw new TypeError("scenario graph scopes must be an array");
  return value.map((candidate, index) => {
    const entry = exactRecord(candidate, `scenario graph scopes[${index}]`, [
      "activationTaskIds",
      "id",
      "maxParallel",
      "terminalTaskId"
    ]);
    if (
      !isStableId(entry.id) ||
      !isStableId(entry.terminalTaskId) ||
      typeof entry.maxParallel !== "number"
    ) {
      throw new TypeError("invalid scenario scope");
    }
    return {
      activationTaskIds: stableIdArray(entry.activationTaskIds, "scope.activationTaskIds"),
      id: entry.id,
      maxParallel: entry.maxParallel,
      terminalTaskId: entry.terminalTaskId
    };
  });
}

function resourceArray(value: unknown, label: string): readonly ResourceUnits[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  return value.map((candidate, index) => {
    const entry = exactRecord(candidate, `${label}[${index}]`, ["resourceId", "units"]);
    if (!isStableId(entry.resourceId) || typeof entry.units !== "number")
      throw new TypeError(`invalid ${label}`);
    return { resourceId: entry.resourceId, units: entry.units };
  });
}

function validateProfiles(value: unknown): ReadonlyMap<string, Profile> {
  if (!Array.isArray(value)) throw new TypeError("scenario.profiles must be an array");
  const profiles = new Map<string, Profile>();
  for (const [index, candidate] of value.entries()) {
    const entry = exactRecord(candidate, `scenario.profiles[${index}]`, [
      "id",
      "multiplierSamples",
      "nominalWorkMs",
      "resourceClaims"
    ]);
    if (!isStableId(entry.id) || !isPositiveFinite(entry.nominalWorkMs))
      throw new TypeError("invalid profile");
    if (!Array.isArray(entry.multiplierSamples) || entry.multiplierSamples.length === 0) {
      throw new TypeError(`invalid profile samples for ${entry.id}`);
    }
    const multiplierSamples: number[] = [];
    for (const sample of entry.multiplierSamples) {
      if (!isPositiveFinite(sample)) throw new TypeError(`invalid profile samples for ${entry.id}`);
      multiplierSamples.push(sample);
    }
    if (profiles.has(entry.id)) throw new TypeError(`duplicate profile ${entry.id}`);
    profiles.set(entry.id, {
      id: entry.id,
      multiplierSamples,
      nominalWorkMs: entry.nominalWorkMs,
      resourceClaims: resourceArray(entry.resourceClaims, `profile ${entry.id} resourceClaims`)
    });
  }
  return profiles;
}

function validateTaskProfiles(
  tasks: SchedulerGraphSnapshot["tasks"],
  profiles: ReadonlyMap<string, Profile>,
  assignments: Readonly<Record<string, string>>
): void {
  const taskIds = new Set(tasks.map(({ taskId }) => taskId));
  for (const taskId of Object.keys(assignments)) {
    if (!taskIds.has(taskId)) throw new TypeError(`profile assigned to unknown task ${taskId}`);
  }
  for (const graphTask of tasks) {
    const profileId = assignments[graphTask.taskId];
    const assigned = profileId === undefined ? undefined : profiles.get(profileId);
    if (assigned === undefined) throw new TypeError(`missing profile for ${graphTask.taskId}`);
    if (JSON.stringify(assigned.resourceClaims) !== JSON.stringify(graphTask.resourceClaims)) {
      throw new TypeError(`claims mismatch for ${graphTask.taskId}`);
    }
  }
}

function optionalOutcomes(
  value: unknown,
  tasks: SchedulerGraphSnapshot["tasks"]
): Readonly<Record<string, "satisfied" | "unsatisfied">> | undefined {
  if (value === undefined) return undefined;
  const source = exactStringKeyedRecord(value, "scenario.outcomes");
  const outcomes: Record<string, "satisfied" | "unsatisfied"> = {};
  const taskIds = new Set(tasks.map(({ taskId }) => taskId));
  for (const [taskId, outcome] of Object.entries(source)) {
    if (!taskIds.has(taskId)) throw new TypeError(`outcome assigned to unknown task ${taskId}`);
    if (outcome !== "satisfied" && outcome !== "unsatisfied")
      throw new TypeError(`invalid outcome for ${taskId}`);
    outcomes[taskId] = outcome;
  }
  return Object.freeze(outcomes);
}

function policyRegistryIds(value: unknown): readonly PolicyRegistryId[] {
  const ids = stableIdArray(value, "scenario.policyIds", false);
  const policyIds: PolicyRegistryId[] = [];
  for (const id of ids)
    if (id === "static" || id === "learned") policyIds.push(id);
    else throw new TypeError(`unknown policy ${id}`);
  return Object.freeze(policyIds);
}

function stringRecord(value: unknown, label: string): Readonly<Record<string, string>> {
  const record = exactStringKeyedRecord(value, label);
  const strings: Record<string, string> = {};
  for (const [key, item] of Object.entries(record)) {
    if (!isStableId(key) || !isStableId(item))
      throw new TypeError(`${label} must map stable strings`);
    strings[key] = item;
  }
  return Object.freeze(strings);
}

function exactStringKeyedRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (!isPlainRecord(value)) throw new TypeError(`${label} must be a plain object`);
  if (Reflect.ownKeys(value).some((key) => typeof key !== "string"))
    throw new TypeError(`${label} must have string keys`);
  return value;
}

function stableIdArray(value: unknown, label: string, allowsEmpty = true): readonly string[] {
  if (!Array.isArray(value) || (!allowsEmpty && value.length === 0)) {
    throw new TypeError(`${label} must contain stable strings`);
  }
  const strings: string[] = [];
  for (const item of value) {
    if (!isStableId(item)) throw new TypeError(`${label} must contain stable strings`);
    strings.push(item);
  }
  if (new Set(strings).size !== strings.length)
    throw new TypeError(`${label} must not contain duplicates`);
  return Object.freeze(strings);
}

function exactRecord(
  value: unknown,
  label: string,
  keySpecification: readonly string[]
): Readonly<Record<string, unknown>> {
  if (!isPlainRecord(value)) throw new TypeError(`${label} must be a plain object`);
  const required = keySpecification.filter((key) => !key.endsWith("?"));
  const allowed = keySpecification.map((key) => key.replace(/\?$/, ""));
  const keys = Reflect.ownKeys(value);
  if (
    keys.some((key) => typeof key !== "string" || !allowed.includes(key)) ||
    required.some((key) => !keys.includes(key))
  ) {
    throw new TypeError(`${label} has an invalid field set`);
  }
  return value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Reflect.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isStableId(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 31 || codePoint === 127)) return false;
  }
  return true;
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function freezeScenario<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeScenario(child);
    Object.freeze(value);
  }
  return value;
}
