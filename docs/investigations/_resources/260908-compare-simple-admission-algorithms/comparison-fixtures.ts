import { readFile } from "node:fs/promises";

import { FIXTURES } from "../../../../scripts/project/admission-workbench/fixture-registry.ts";
import {
  validateScenario,
  type Scenario,
} from "../../../../scripts/project/admission-workbench/scenario.ts";

export const LEGACY_COLD_FIXTURE_IDS = Object.freeze([
  "empty",
  "single",
  "chain",
  "two-shared-claims",
  "wide-tie",
  "backfill",
  "scoped-capacity",
  "weighted-mutex-multi-resource",
  "profile-variation",
  "long-tail-critical",
  "unsatisfied-observes",
  "gate-shape-v1",
  "learned-heuristic-weighted-shared-dependency-regression",
]);

const POLICY_IDS = Object.freeze(["static", "learned"] as const);

type TaskSpec = Readonly<{
  readonly id: string;
  readonly duration: number;
  readonly dependsOn?: readonly string[];
  readonly claims?: readonly Readonly<{
    readonly resourceId: string;
    readonly units: number;
  }>[];
  readonly scopeId?: string | null;
}>;

function independentScenario(
  scenarioId: string,
  tasks: readonly TaskSpec[],
  maxParallel: number,
): Scenario {
  const profiles = tasks.map(({ duration, id, claims = [] }) =>
    Object.freeze({
      id: `profile-${id}`,
      nominalWorkMs: duration,
      multiplierSamples: Object.freeze([1]),
      resourceClaims: claims,
    }),
  );
  return validateScenario({
    assumptionIds: ["simple-admission-algorithm-fixture-v1"],
    contention: "zero",
    graph: {
      graph: {
        resourceCapacities: [],
        scopes: [],
        tasks: tasks.map(
          ({ claims = [], dependsOn = [], id, scopeId = null }) =>
            Object.freeze({
              admissionPriority: 0,
              dependsOn,
              mutex: [],
              observes: [],
              resourceClaims: claims,
              scopeId,
              taskId: id,
            }),
        ),
      },
      maxParallel,
    },
    policyIds: POLICY_IDS,
    profiles,
    scenarioId,
    scenarioVersion: 1,
    taskProfiles: Object.fromEntries(
      tasks.map(({ id }) => [id, `profile-${id}`]),
    ),
  });
}

function resourceScenario(): Scenario {
  const lane = Object.freeze([{ resourceId: "lane", units: 1 }]);
  const tasks: readonly TaskSpec[] = [
    { id: "unlock", duration: 1, claims: lane },
    { id: "tail", duration: 12, dependsOn: ["unlock"] },
    { id: "long-lane", duration: 8, claims: lane },
    { id: "other", duration: 5 },
  ];
  const base = independentScenario("weighted-resource-choice", tasks, 2);
  return validateScenario({
    ...base,
    graph: {
      ...base.graph,
      graph: { ...base.graph.graph, resourceCapacities: lane },
    },
  });
}

function scopeScenario(): Scenario {
  const tasks: readonly TaskSpec[] = [
    { id: "scope-open", duration: 1, scopeId: "serial" },
    {
      id: "scope-work",
      duration: 9,
      dependsOn: ["scope-open"],
      scopeId: "serial",
    },
    {
      id: "scope-close",
      duration: 1,
      dependsOn: ["scope-open", "scope-work"],
      scopeId: "serial",
    },
    { id: "unscoped-long", duration: 6 },
    { id: "unscoped-short", duration: 2 },
  ];
  const base = independentScenario("constrained-scope-choice", tasks, 2);
  return validateScenario({
    ...base,
    graph: {
      ...base.graph,
      graph: {
        ...base.graph.graph,
        scopes: [
          {
            activationTaskIds: ["scope-open"],
            id: "serial",
            maxParallel: 1,
            terminalTaskId: "scope-close",
          },
        ],
      },
    },
  });
}

export const NEW_SCENARIOS: Readonly<Record<string, Scenario>> = Object.freeze({
  "packing-33222": independentScenario(
    "packing-33222",
    [
      { id: "p3a", duration: 3 },
      { id: "p3b", duration: 3 },
      { id: "p2a", duration: 2 },
      { id: "p2b", duration: 2 },
      { id: "p2c", duration: 2 },
    ],
    2,
  ),
  "packing-5432": independentScenario(
    "packing-5432",
    [
      { id: "p5", duration: 5 },
      { id: "p4", duration: 4 },
      { id: "p3", duration: 3 },
      { id: "p2", duration: 2 },
    ],
    2,
  ),
  "unlock-long-tail": independentScenario(
    "unlock-long-tail",
    [
      { id: "unlock", duration: 1 },
      { id: "tail", duration: 12, dependsOn: ["unlock"] },
      { id: "long", duration: 8 },
      { id: "short", duration: 2 },
    ],
    2,
  ),
  "weighted-resource-choice": resourceScenario(),
  "constrained-scope-choice": scopeScenario(),
});

export async function comparisonScenarios(): Promise<
  Readonly<Record<string, Scenario>>
> {
  const regression = validateScenario(
    JSON.parse(
      await readFile(
        "scripts/project/admission-workbench/learned-heuristic-weighted-shared-dependency-regression.json",
        "utf8",
      ),
    ),
  );
  return Object.freeze({
    ...Object.fromEntries(
      LEGACY_COLD_FIXTURE_IDS.map((id) => [id, legacyFixture(id, regression)]),
    ),
    ...NEW_SCENARIOS,
    "regression-id-permutation-a": permuteRegression(
      regression,
      "regression-id-permutation-a",
      new Map([
        ["a-root", "z-root"],
        ["a-tail", "z-tail"],
        ["b-root", "a-root"],
        ["b-tail", "a-tail"],
        ["b2", "a2"],
        ["b3", "a3"],
        ["b4", "a4"],
        ["b5", "a5"],
        ["c-fill", "m-fill"],
      ]),
    ),
    "regression-id-permutation-b": permuteRegression(
      regression,
      "regression-id-permutation-b",
      new Map([
        ["a-root", "m-root"],
        ["a-tail", "m-tail"],
        ["b-root", "z-root"],
        ["b-tail", "z-tail"],
        ["b2", "z2"],
        ["b3", "z3"],
        ["b4", "z4"],
        ["b5", "z5"],
        ["c-fill", "a-fill"],
      ]),
    ),
  });
}

function legacyFixture(id: string, regression: Scenario): Scenario {
  return id === "learned-heuristic-weighted-shared-dependency-regression"
    ? regression
    : required(FIXTURES[id], id);
}

function permuteRegression(
  source: Scenario,
  scenarioId: string,
  names: ReadonlyMap<string, string>,
): Scenario {
  const rename = (id: string) =>
    required(names.get(id), `missing name for ${id}`);
  const graph = source.graph.graph;
  const taskProfiles: Record<string, string> = {};
  for (const [taskId, profileId] of Object.entries(source.taskProfiles))
    taskProfiles[rename(taskId)] = profileId;
  return validateScenario({
    ...source,
    assumptionIds: [...source.assumptionIds, "id-permutation-v1"],
    graph: {
      ...source.graph,
      graph: {
        ...graph,
        tasks: graph.tasks.map((task) => ({
          ...task,
          taskId: rename(task.taskId),
          dependsOn: task.dependsOn.map(rename),
          observes: task.observes.map(rename),
        })),
      },
    },
    scenarioId,
    taskProfiles,
  });
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
