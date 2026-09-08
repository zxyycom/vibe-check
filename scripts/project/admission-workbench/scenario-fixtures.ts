import { fixture, profile, task } from "./fixture-model.ts";
import { type Scenario, freezeScenario } from "./scenario.ts";

const INVESTIGATION_SOURCE_ID = "260908-calibrate-gate-duration-variation/proxy-outer-wall";
const SYNTHETIC_SOURCE_ID = "synthetic-work-assumption-v1";

/** Exact proxy medians and sample/median vectors frozen from the named investigation resource. */
export const INVESTIGATION_PROFILES = freezeScenario([
  profile(
    "typecheck-product-like",
    356.19944599999997,
    [1, 1.0796332878069668, 1.0580729005401093, 0.9596890024360117, 0.9759981210077459]
  ),
  profile(
    "typecheck-scripts-like",
    357.39817600000003,
    [0.9921561071425277, 1.1083471114301378, 1, 1.1743827758091299, 0.9904026650656436]
  ),
  profile(
    "lint-product-like",
    1158.922142,
    [0.9859457219689569, 0.9550093374607387, 1.4119588993062833, 1.1495091971415627, 1]
  ),
  profile(
    "lint-scripts-like",
    830.415966,
    [0.9641929668775179, 0.8821034854717618, 1.3393843152577343, 1, 1.129553002838098]
  )
]);

const defaultPolicyIds = freezeScenario(["static", "learned"] as const);
const bunRunnerClaim = freezeScenario([{ resourceId: "project-gate-bun-test-runners", units: 1 }]);
const repositoryScanClaim = freezeScenario([
  { resourceId: "project-gate-repository-scans", units: 1 }
]);

export const FIXTURES: Readonly<Record<string, Scenario>> = freezeScenario({
  empty: fixture({
    assumptionIds: [SYNTHETIC_SOURCE_ID],
    contention: "zero",
    graph: { graph: { resourceCapacities: [], scopes: [], tasks: [] }, maxParallel: 1 },
    policyIds: defaultPolicyIds,
    profiles: [],
    scenarioId: "empty",
    scenarioVersion: 1,
    taskProfiles: {}
  }),
  single: fixture({
    assumptionIds: [SYNTHETIC_SOURCE_ID],
    contention: "zero",
    graph: { graph: { resourceCapacities: [], scopes: [], tasks: [task("only")] }, maxParallel: 1 },
    policyIds: defaultPolicyIds,
    profiles: [profile("single-work", 25, [1])],
    scenarioId: "single",
    scenarioVersion: 1,
    taskProfiles: { only: "single-work" }
  }),
  chain: fixture({
    assumptionIds: [SYNTHETIC_SOURCE_ID],
    contention: "zero",
    graph: {
      graph: {
        resourceCapacities: [],
        scopes: [],
        tasks: [task("first"), task("second", { dependsOn: ["first"] })]
      },
      maxParallel: 1
    },
    policyIds: defaultPolicyIds,
    profiles: [profile("first", 100, [1]), profile("second", 50, [1])],
    scenarioId: "chain",
    scenarioVersion: 1,
    taskProfiles: { first: "first", second: "second" }
  }),
  "two-shared-claims": fixture({
    assumptionIds: [SYNTHETIC_SOURCE_ID, "synthetic-contention-alpha-strong"],
    contention: "strong",
    graph: {
      graph: {
        resourceCapacities: [{ resourceId: "cpu", units: 2 }],
        scopes: [],
        tasks: [
          task("A", { claims: [{ resourceId: "cpu", units: 1 }] }),
          task("B", { claims: [{ resourceId: "cpu", units: 1 }] })
        ]
      },
      maxParallel: 2
    },
    policyIds: defaultPolicyIds,
    profiles: [profile("shared-work", 100, [1], [{ resourceId: "cpu", units: 1 }])],
    scenarioId: "two-shared-claims",
    scenarioVersion: 1,
    taskProfiles: { A: "shared-work", B: "shared-work" }
  }),
  "wide-tie": fixture({
    assumptionIds: [SYNTHETIC_SOURCE_ID],
    contention: "zero",
    graph: {
      graph: { resourceCapacities: [], scopes: [], tasks: [task("C"), task("A"), task("B")] },
      maxParallel: 3
    },
    policyIds: defaultPolicyIds,
    profiles: [profile("equal", 20, [1])],
    scenarioId: "wide-tie",
    scenarioVersion: 1,
    taskProfiles: { A: "equal", B: "equal", C: "equal" }
  }),
  backfill: fixture({
    assumptionIds: [SYNTHETIC_SOURCE_ID],
    contention: "zero",
    graph: {
      graph: {
        resourceCapacities: [{ resourceId: "exclusive", units: 1 }],
        scopes: [],
        tasks: [
          task("A", { claims: [{ resourceId: "exclusive", units: 1 }] }),
          task("B", { claims: [{ resourceId: "exclusive", units: 1 }] }),
          task("C")
        ]
      },
      maxParallel: 2
    },
    policyIds: defaultPolicyIds,
    profiles: [
      profile("exclusive", 100, [1], [{ resourceId: "exclusive", units: 1 }]),
      profile("free", 25, [1])
    ],
    scenarioId: "backfill",
    scenarioVersion: 1,
    taskProfiles: { A: "exclusive", B: "exclusive", C: "free" }
  }),
  "scoped-capacity": fixture({
    assumptionIds: [SYNTHETIC_SOURCE_ID],
    contention: "zero",
    graph: {
      graph: {
        resourceCapacities: [],
        scopes: [
          {
            activationTaskIds: ["scope-open"],
            id: "serial-scope",
            maxParallel: 1,
            terminalTaskId: "scope-close"
          }
        ],
        tasks: [
          task("scope-close", { dependsOn: ["scope-open", "scope-work"], scopeId: "serial-scope" }),
          task("scope-open", { scopeId: "serial-scope" }),
          task("scope-work", { dependsOn: ["scope-open"], scopeId: "serial-scope" }),
          task("unscoped")
        ]
      },
      maxParallel: 2
    },
    policyIds: defaultPolicyIds,
    profiles: [profile("scope-step", 10, [1])],
    scenarioId: "scoped-capacity",
    scenarioVersion: 1,
    taskProfiles: {
      "scope-close": "scope-step",
      "scope-open": "scope-step",
      "scope-work": "scope-step",
      unscoped: "scope-step"
    }
  }),
  "weighted-mutex-multi-resource": fixture({
    assumptionIds: [SYNTHETIC_SOURCE_ID, "synthetic-contention-alpha-weak"],
    contention: "weak",
    graph: {
      graph: {
        resourceCapacities: [
          { resourceId: "cpu", units: 3 },
          { resourceId: "io", units: 2 }
        ],
        scopes: [],
        tasks: [
          task("A", {
            claims: [
              { resourceId: "cpu", units: 2 },
              { resourceId: "io", units: 1 }
            ],
            mutex: ["writer"]
          }),
          task("B", {
            claims: [
              { resourceId: "cpu", units: 1 },
              { resourceId: "io", units: 1 }
            ],
            mutex: ["writer"]
          }),
          task("C", { claims: [{ resourceId: "cpu", units: 1 }] })
        ]
      },
      maxParallel: 3
    },
    policyIds: defaultPolicyIds,
    profiles: [
      profile(
        "heavy",
        60,
        [1],
        [
          { resourceId: "cpu", units: 2 },
          { resourceId: "io", units: 1 }
        ]
      ),
      profile(
        "writer",
        30,
        [1],
        [
          { resourceId: "cpu", units: 1 },
          { resourceId: "io", units: 1 }
        ]
      ),
      profile("cpu-only", 30, [1], [{ resourceId: "cpu", units: 1 }])
    ],
    scenarioId: "weighted-mutex-multi-resource",
    scenarioVersion: 1,
    taskProfiles: { A: "heavy", B: "writer", C: "cpu-only" }
  }),
  "profile-variation": fixture({
    assumptionIds: [INVESTIGATION_SOURCE_ID, "proxy-not-full-gate-baseline"],
    contention: "zero",
    graph: {
      graph: {
        resourceCapacities: [],
        scopes: [],
        tasks: [
          task("lint-product"),
          task("lint-scripts"),
          task("typecheck-product"),
          task("typecheck-scripts")
        ]
      },
      maxParallel: 2
    },
    policyIds: defaultPolicyIds,
    profiles: INVESTIGATION_PROFILES,
    scenarioId: "profile-variation",
    scenarioVersion: 1,
    taskProfiles: {
      "lint-product": "lint-product-like",
      "lint-scripts": "lint-scripts-like",
      "typecheck-product": "typecheck-product-like",
      "typecheck-scripts": "typecheck-scripts-like"
    }
  }),
  "long-tail-critical": fixture({
    assumptionIds: [SYNTHETIC_SOURCE_ID, "synthetic-long-tail-multiplier-5.5x"],
    contention: "zero",
    graph: {
      graph: {
        resourceCapacities: [],
        scopes: [],
        tasks: [
          task("critical-root"),
          task("critical-tail", { dependsOn: ["critical-root"] }),
          task("short-independent")
        ]
      },
      maxParallel: 2
    },
    policyIds: defaultPolicyIds,
    profiles: [profile("long-tail-pressure", 100, [1, 5.5]), profile("short", 20, [1])],
    scenarioId: "long-tail-critical",
    scenarioVersion: 1,
    taskProfiles: {
      "critical-root": "long-tail-pressure",
      "critical-tail": "short",
      "short-independent": "short"
    }
  }),
  "unsatisfied-observes": fixture({
    assumptionIds: [SYNTHETIC_SOURCE_ID],
    contention: "zero",
    graph: {
      graph: {
        resourceCapacities: [],
        scopes: [],
        tasks: [
          task("dependent", { dependsOn: ["upstream"] }),
          task("observer", { observes: ["upstream"] }),
          task("upstream")
        ]
      },
      maxParallel: 1
    },
    outcomes: { upstream: "unsatisfied" },
    policyIds: defaultPolicyIds,
    profiles: [profile("step", 10, [1])],
    scenarioId: "unsatisfied-observes",
    scenarioVersion: 1,
    taskProfiles: { dependent: "step", observer: "step", upstream: "step" }
  })
});

export { bunRunnerClaim, defaultPolicyIds, repositoryScanClaim };
