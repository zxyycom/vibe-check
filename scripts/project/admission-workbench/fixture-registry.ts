import { GATE_SHAPE_FIXTURE } from "./gate-shape-fixture.ts";
import { FIXTURES as standardFixtures } from "./scenario-fixtures.ts";
import { freezeScenario, type Scenario } from "./scenario.ts";

/** Immutable fixture lookup used by the private command and its focused tests. */
export const FIXTURES: Readonly<Record<string, Scenario>> = freezeScenario({
  ...standardFixtures,
  "gate-shape-v1": GATE_SHAPE_FIXTURE
});
