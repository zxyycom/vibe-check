import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { prepareTaskGraph } from "./graph.ts";
import {
  compilePreparedAdmissionGraph,
  createInitialAdmissionCoreState,
  selectAdmissionCore,
  validateAdmissionCoreSelection
} from "./admission-core/core.ts";
import { admissionQueueKindForCore } from "./admission-core/selection-query.ts";
import { summarizeSchedulerBlockers } from "./scheduler-blocker-summary.ts";

describe("Scheduler blocker summary", () => {
  it("aggregates independent Core blockers even when primary scope or root capacity hides resources", () => {
    for (const scoped of [false, true]) {
      const graph = prepareTaskGraph(
        {
          resourceCapacities: { worker: 1 },
          ...(scoped
            ? {
                scopes: [
                  {
                    id: "scope",
                    maxParallel: 1,
                    activationTaskIds: ["holder"],
                    terminalTaskId: "terminal"
                  }
                ]
              }
            : {}),
          tasks: [
            {
              id: "holder",
              mutex: ["lock"],
              resourceClaims: { worker: 1 },
              ...(scoped ? { scopeId: "scope" } : {})
            },
            {
              id: "relation",
              dependsOn: ["holder"],
              mutex: ["lock"],
              resourceClaims: { worker: 1 }
            },
            {
              id: "observation",
              observes: ["holder"],
              mutex: ["lock"],
              resourceClaims: { worker: 1 }
            },
            { id: "mutex", mutex: ["lock"], resourceClaims: { worker: 1 } },
            { id: "resource", resourceClaims: { worker: 1 } },
            ...(scoped ? [{ id: "terminal", dependsOn: ["holder"], scopeId: "scope" }] : [])
          ]
        },
        scoped ? 3 : 1
      );
      const initial = createInitialAdmissionCoreState(
        compilePreparedAdmissionGraph(graph, scoped ? 3 : 1)
      );
      const selected = selectAdmissionCore(initial, "holder");
      if (!selected.accepted) assert.fail("holder must be admitted");
      const core = selected.transition.state;
      const validation = validateAdmissionCoreSelection(core, "resource");
      if (validation.accepted) assert.fail("resource must be blocked");
      assert.equal(
        validation.reason.kind,
        scoped ? "scope-capacity-reached" : "root-capacity-reached"
      );
      assert.deepEqual(summarizeSchedulerBlockers(core), {
        dependency: scoped ? 3 : 2,
        mutex: 1,
        resourceCapacity: 1,
        rootCapacity: !scoped,
        scopeCapacity: scoped
      });
      const slot = core.compiled.taskSlotsById.get("resource");
      assert.notEqual(slot, undefined);
      if (slot === undefined) assert.fail("missing resource slot");
      assert.equal(admissionQueueKindForCore(core, slot), "capacity-blocked");
      assert.deepEqual(summarizeSchedulerBlockers(initial), {
        dependency: scoped ? 3 : 2,
        mutex: 0,
        resourceCapacity: 0,
        rootCapacity: false,
        scopeCapacity: false
      });
    }
  });
});
