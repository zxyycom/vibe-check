import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createAdmissionGraph,
  type AdmissionState,
  type AdmissionTransitionResult
} from "../../../index.ts";
import {
  schedulerGraphSnapshot,
  schedulerGraphTask
} from "../scheduler-graph-snapshot.test-support.ts";

describe("immutable admission graph capacity", () => {
  it("keeps duplicate blocker payloads and global active-scope capacity for every candidate", () => {
    const duplicateRelations = createAdmissionGraph({
      graph: schedulerGraphSnapshot([
        schedulerGraphTask("z"),
        schedulerGraphTask("a"),
        schedulerGraphTask("dependent", { dependsOn: ["z", "z", "a"] }),
        schedulerGraphTask("holder", { mutex: ["z-lock", "z-lock", "a-lock"] }),
        schedulerGraphTask("contender", { mutex: ["z-lock", "z-lock", "a-lock"] })
      ]),
      maxParallel: 2
    }).initialState();
    assert.deepEqual(duplicateRelations.validateSelection("dependent"), {
      accepted: false,
      reason: { kind: "depends-on-pending", taskIds: ["a", "z", "z"] }
    });
    const held = acceptedState(duplicateRelations.select("holder"));
    assert.deepEqual(held.validateSelection("contender"), {
      accepted: false,
      reason: { kind: "mutex-held", mutexIds: ["a-lock", "z-lock", "z-lock"] }
    });

    const scope = createAdmissionGraph({
      graph: schedulerGraphSnapshot(
        [
          schedulerGraphTask("activate", { scopeId: "limited" }),
          schedulerGraphTask("inside", { scopeId: "limited" }),
          schedulerGraphTask("terminal", {
            dependsOn: ["activate", "inside"],
            scopeId: "limited"
          }),
          schedulerGraphTask("outside"),
          schedulerGraphTask("unscoped")
        ],
        [
          {
            activationTaskIds: ["activate"],
            id: "limited",
            maxParallel: 2,
            terminalTaskId: "terminal"
          }
        ]
      ),
      maxParallel: 3
    }).initialState();
    const active = acceptedState(scope.select("activate"));
    const globallyFull = acceptedState(active.select("outside"));
    const expected = {
      accepted: false as const,
      reason: {
        kind: "scope-capacity-reached" as const,
        maxParallel: 2,
        running: 2,
        scopeId: "limited"
      }
    };
    assert.deepEqual(globallyFull.validateSelection("inside"), expected);
    assert.deepEqual(globallyFull.validateSelection("unscoped"), expected);
  });
});

function acceptedState(result: AdmissionTransitionResult): AdmissionState {
  if (!result.accepted) assert.fail(`expected accepted transition: ${result.reason.kind}`);
  return result.state;
}
