import { fixture, profile, task } from "./fixture-model.ts";
import { bunRunnerClaim, defaultPolicyIds, repositoryScanClaim } from "./scenario-fixtures.ts";
import { freezeScenario, type Scenario } from "./scenario.ts";

export const GATE_MAPPING = freezeScenario({
  identity: "project-gate-named-resources@b30477b6",
  maxParallel: 3,
  resources: [
    { resourceId: "project-gate-bun-test-runners", units: 2 },
    { resourceId: "project-gate-repository-scans", units: 2 }
  ],
  testTaskIds: [
    "tests-package-artifact",
    "tests-package-consumer-docs",
    "tests-package-consumer-runtime",
    "tests-package-consumer-types",
    "tests-package-supporting",
    "tests-product-duplicate-detection",
    "tests-product-file-metrics",
    "tests-product-function-metrics",
    "tests-product-json",
    "tests-product-markdown-links",
    "tests-product-runtime",
    "tests-product-secret-detection",
    "tests-product-supporting-checks",
    "tests-scripts-project",
    "tests-scripts-test-evidence",
    "tests-scripts-tooling",
    "tests-scripts-validation"
  ],
  qualityTaskIds: [
    "duplicate-detection",
    "file-metrics",
    "function-metrics",
    "markdown-link-validation"
  ]
});

const gateTasks = [
  ...GATE_MAPPING.testTaskIds.map((taskId) =>
    task(taskId, {
      claims: bunRunnerClaim,
      mutex: taskId === "tests-scripts-validation" ? ["project-gate-documentation-materials"] : []
    })
  ),
  ...GATE_MAPPING.qualityTaskIds.map((taskId) => task(taskId, { claims: repositoryScanClaim }))
];

const gateTaskProfiles = gateProfileAssignments();

function gateProfileAssignments(): Readonly<Record<string, string>> {
  const assignments: Record<string, string> = {};
  for (const taskId of GATE_MAPPING.testTaskIds) assignments[taskId] = "gate-test-lane-synthetic";
  for (const taskId of GATE_MAPPING.qualityTaskIds) assignments[taskId] = "gate-quality-synthetic";
  return freezeScenario(assignments);
}

export const GATE_SHAPE_FIXTURE: Scenario = fixture({
  assumptionIds: ["synthetic-work-assumption-v1", "static-gate-shape-not-runtime-evidence"],
  contention: "zero",
  graph: {
    graph: { resourceCapacities: GATE_MAPPING.resources, scopes: [], tasks: gateTasks },
    maxParallel: GATE_MAPPING.maxParallel
  },
  mappingIdentity: GATE_MAPPING.identity,
  policyIds: defaultPolicyIds,
  profiles: [
    profile("gate-quality-synthetic", 100, [1], repositoryScanClaim),
    profile("gate-test-lane-synthetic", 100, [1], bunRunnerClaim)
  ],
  scenarioId: "gate-shape-v1",
  scenarioVersion: 1,
  taskProfiles: gateTaskProfiles
});
