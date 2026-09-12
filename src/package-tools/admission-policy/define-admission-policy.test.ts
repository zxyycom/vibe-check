import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  AdmissionPolicy,
  AdmissionPolicyContext
} from "../../project-definition/scheduler-policy.ts";
import { defineAdmissionPolicy } from "./define-admission-policy.ts";

describe("admission policy authoring", () => {
  it("preserves policy identity and closed generic authoring types", () => {
    const staticInput = { kind: "static" } as const;
    const staticPolicy = defineAdmissionPolicy(staticInput);
    const staticKind: "static" = staticPolicy.kind;
    assert.equal(staticPolicy, staticInput);
    assert.equal(staticKind, "static");

    const simplePolicy = defineAdmissionPolicy({
      kind: "custom",
      strategy: {
        kind: "simple",
        decide(context) {
          const typedContext: AdmissionPolicyContext = context;
          const candidate = typedContext.candidates.find(({ canAdmit }) => canAdmit);
          return candidate === undefined
            ? { kind: "wait" as const }
            : { kind: "select" as const, taskId: candidate.taskId };
        }
      }
    });
    const preparedPolicy = defineAdmissionPolicy({
      kind: "custom",
      strategy: {
        kind: "prepared",
        prepare(context) {
          void context.graph;
          return {
            decide(decision) {
              const candidate = decision.candidates.find(({ canAdmit }) => canAdmit);
              return candidate === undefined
                ? { kind: "wait" as const }
                : { kind: "select" as const, taskId: candidate.taskId };
            },
            complete(terminal) {
              void terminal.execution.settledTasks;
            }
          };
        }
      }
    });
    const asynchronouslyPreparedPolicy = defineAdmissionPolicy({
      kind: "custom",
      strategy: {
        kind: "prepared",
        async prepare(context) {
          void context.graph;
          return {
            decide: () => ({ kind: "wait" as const }),
            async complete(terminal) {
              void terminal.execution.settledTasks;
            }
          };
        }
      }
    });
    const policies: readonly AdmissionPolicy[] = [
      staticPolicy,
      simplePolicy,
      preparedPolicy,
      asynchronouslyPreparedPolicy
    ];
    assert.equal(policies.length, 4);
  });
});

// @ts-expect-error static policy authoring is exact.
defineAdmissionPolicy({ kind: "static", unsupported: true });
defineAdmissionPolicy({
  kind: "custom",
  strategy: { kind: "simple", decide: () => ({ kind: "wait" as const }) },
  // @ts-expect-error custom policy authoring is exact.
  unsupported: true
});
defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    // @ts-expect-error prepared strategy authoring is exact.
    prepare: () => ({
      decide: () => ({ kind: "wait" as const }),
      unsupported: true
    })
  }
});
