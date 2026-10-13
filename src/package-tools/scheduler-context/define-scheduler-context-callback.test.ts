import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defineConfig,
  type ProjectDefinition
} from "../../project-definition/project-definition.ts";
import { defineAdmissionPolicy } from "../admission-policy/define-admission-policy.ts";
import { defineSchedulerContextCallback } from "./define-scheduler-context-callback.ts";

describe("Scheduler context callback authoring", () => {
  it("preserves descriptor identity and phase selected types through policy and direct Definition", () => {
    const descriptor = { contextNeeds: ["graph"] as const, callback: () => undefined };
    assert.equal(defineSchedulerContextCallback("terminal", descriptor), descriptor);
    const decide = defineSchedulerContextCallback("decision", {
      contextNeeds: ["candidates", "runtime"],
      callback(context) {
        void context.runtime.cancelled;
        // @ts-expect-error Undeclared fields are not guaranteed by phase peers.
        void context.measurement;
        const candidate = context.candidates.find((item) => item.canAdmit);
        return candidate === undefined
          ? { kind: "wait" }
          : { kind: "select", taskId: candidate.taskId };
      }
    });
    const terminalEffect = defineSchedulerContextCallback("terminal", {
      contextNeeds: ["execution"],
      callback(context) {
        void context.execution.settledTasks;
      }
    });
    const policy = defineAdmissionPolicy({
      kind: "custom",
      strategy: {
        kind: "prepared",
        prepare: defineSchedulerContextCallback("preparation", {
          contextNeeds: [],
          callback(context) {
            // @ts-expect-error None has no graph guarantee.
            void context.graph;
            return { decide, terminalEffect };
          }
        })
      }
    });
    const definition: ProjectDefinition = defineConfig({
      scheduler: { admissionPolicy: policy, terminalEffects: [terminalEffect] }
    });
    assert.equal(definition.scheduler.admissionPolicy, policy);
    const full = defineSchedulerContextCallback("decision", {
      contextNeeds: undefined,
      callback(context) {
        void context.measurement;
        return { kind: "wait" };
      }
    });
    defineAdmissionPolicy({ kind: "custom", strategy: { kind: "simple", decide: full } });
    defineConfig({
      scheduler: {
        terminalEffects: [
          {
            contextNeeds: [],
            callback(context) {
              // @ts-expect-error Raw descriptor storage cannot imply a full runtime context.
              void context.graph;
            }
          }
        ]
      }
    });
  });
});

defineSchedulerContextCallback("terminal", {
  // @ts-expect-error Phase-specific closed key grammar.
  contextNeeds: ["runtime"],
  callback: () => undefined
});
defineSchedulerContextCallback("terminal", {
  // @ts-expect-error Callback descriptor is exact.
  contextNeeds: [],
  callback: () => undefined,
  unsupported: true
});
defineSchedulerContextCallback("decision", {
  // @ts-expect-error No declared-needs overload accepts an asynchronous decision.
  contextNeeds: [],
  // @ts-expect-error decision does not accept async callbacks.
  callback: async () => ({ kind: "wait" })
});

const widened: readonly ("graph" | "execution")[] = ["graph"];
defineSchedulerContextCallback("terminal", {
  contextNeeds: widened,
  callback(context) {
    // @ts-expect-error A widened array cannot guarantee each possible union key.
    void context.execution;
  }
});
const unionToken: readonly ["graph" | "execution"] = ["graph"];
defineSchedulerContextCallback("terminal", {
  contextNeeds: unionToken,
  callback(context) {
    // @ts-expect-error A union-valued tuple position guarantees neither alternative.
    void context.graph;
  }
});

function sharedHeadNeeds(needs: readonly ["graph"] | readonly ["graph", "execution"]) {
  return defineSchedulerContextCallback("terminal", {
    contextNeeds: needs,
    callback(context) {
      void context.graph;
      // @ts-expect-error A tail present in only some tuple branches is not guaranteed.
      void context.execution;
    }
  });
}
function reorderedNeeds(needs: readonly ["graph", "execution"] | readonly ["execution", "graph"]) {
  return defineSchedulerContextCallback("terminal", {
    contextNeeds: needs,
    callback(context) {
      // @ts-expect-error Union-valued positions conservatively guarantee no graph field.
      void context.graph;
      // @ts-expect-error Union-valued positions conservatively guarantee no execution field.
      void context.execution;
    }
  });
}
void [sharedHeadNeeds, reorderedNeeds];
