import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AdmissionPolicyContext } from "../../project-definition/project-definition.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { admissionSelectionPolicyFor } from "./custom-admission-policy.ts";
import {
  compilePreparedAdmissionGraph,
  createInitialAdmissionCoreState
} from "./admission-core/core.ts";
import { admissionCoreTraceProjectionFor, traceAdmissionCore } from "./admission-core/trace.ts";
import { prepareTaskGraph } from "./graph.ts";
import { runTaskGraph } from "./scheduler.ts";

describe("Scheduler admission core integration", () => {
  it("replays canonical failed and forced effects through shell diagnostics and measurement", async () => {
    const graph = {
      tasks: [
        { id: "source" },
        { id: "first-dependent", dependsOn: ["source"] },
        { id: "last-dependent", dependsOn: ["source"] },
        { id: "tail" }
      ]
    };
    const planned = prepareTaskGraph(graph, 1);
    const coreTrace = traceAdmissionCore(
      createInitialAdmissionCoreState(compilePreparedAdmissionGraph(planned, 1)),
      [
        { kind: "select", taskId: "source" },
        { kind: "settle-running", settlementKind: "failed", taskId: "source" },
        { kind: "select", taskId: "tail" },
        { kind: "settle-running", settlementKind: "completed", taskId: "tail" }
      ]
    );
    const expectedEffects = coreTrace.flatMap((step) =>
      step.effects.map((effect, index) => ({
        effect,
        projection: step.effectProjections[index]
      }))
    );
    const shellEffects: typeof expectedEffects = [];
    const contexts: AdmissionPolicyContext[] = [];
    const observations: DiagnosticObservation[] = [];
    const replayEvents: string[] = [];

    const run = await runTaskGraph({
      admissionPolicy: admissionSelectionPolicyFor((context) => {
        contexts.push(context);
        const candidate = context.candidates.find((item) => item.canAdmit);
        if (candidate === undefined) return { kind: "wait" };
        assert.equal(context.admissionState.validateSelection(candidate.taskId).accepted, true);
        return { kind: "select", taskId: candidate.taskId };
      }),
      diagnosticLogger: Object.freeze({
        close: () => "disabled" as const,
        observe: (observation: DiagnosticObservation): void => {
          observations.push(observation);
          const details = observation.details;
          if (
            observation.event === "scheduler.decision" &&
            details !== null &&
            typeof details === "object" &&
            Reflect.get(details, "kind") === "settle-blocked"
          ) {
            const taskId: unknown = Reflect.get(details, "taskId");
            if (typeof taskId === "string") replayEvents.push(`diagnostic:${taskId}`);
          }
        }
      }),
      execute: (task) => {
        if (task.id === "source") throw new Error("expected source failure");
        return task.id;
      },
      graph,
      maxParallel: 1,
      onTaskBlocked: (task) => {
        replayEvents.push(`blocked:${task.id}`);
      },
      onAdmissionCoreEffect: ({ effect, state }) => {
        shellEffects.push({ effect, projection: admissionCoreTraceProjectionFor(state) });
        replayEvents.push(`core:${effect.kind}:${effect.taskId}`);
      },
      performanceDiagnostics: Object.freeze({
        clock: Object.freeze({ now: () => 0 }),
        declarativeFingerprint: "canonical-effect-replay"
      })
    });

    assert.deepEqual(shellEffects, expectedEffects);
    assert.deepEqual(replayEvents.slice(0, 8), [
      "core:admitted:source",
      "core:settled:source",
      "blocked:last-dependent",
      "diagnostic:last-dependent",
      "core:settled:last-dependent",
      "blocked:first-dependent",
      "diagnostic:first-dependent",
      "core:settled:first-dependent"
    ]);
    const sourceSettlementMeasurement = contexts
      .flatMap((context) =>
        Array.from({ length: context.measurement.measurementCount }, (_, index) =>
          context.measurement.measurementAt(index)
        )
      )
      .find((measurement) =>
        measurement?.effects.some(
          (effect) => effect.kind === "settled" && effect.taskId === "source"
        )
      );
    assert.deepEqual(sourceSettlementMeasurement, {
      interval: {
        availability: "available",
        contribution: {
          admissiblePendingTaskMs: 0,
          acceptedWaitMs: 0,
          capacityBlockedTaskMs: 0,
          effectiveCapacitySlotMs: 0,
          mutexBlockedTaskMs: 0,
          rootCapacitySlotMs: 0,
          taskSlotMs: 0
        }
      },
      effects: [
        { kind: "settled", settlementKind: "failed", taskId: "source" },
        { kind: "settled", settlementKind: "blocked", taskId: "last-dependent" },
        { kind: "settled", settlementKind: "blocked", taskId: "first-dependent" }
      ],
      kind: "wait",
      sequence: 2,
      taskId: null
    });
    assert.deepEqual(
      observations.flatMap((observation) => {
        const details = observation.details;
        if (
          observation.event !== "scheduler.decision" ||
          details === null ||
          typeof details !== "object"
        )
          return [];
        const kind: unknown = Reflect.get(details, "kind");
        if (kind !== "settle-blocked") return [];
        const taskId: unknown = Reflect.get(details, "taskId");
        const blockers: unknown = Reflect.get(details, "blockers");
        const trigger: unknown = Reflect.get(details, "trigger");
        if (blockers === null || typeof blockers !== "object") return [];
        if (trigger === null || typeof trigger !== "object") return [];
        const dependency: unknown = Reflect.get(blockers, "dependency");
        const triggerKind: unknown = Reflect.get(trigger, "kind");
        const triggerSettlementKind: unknown = Reflect.get(trigger, "settlementKind");
        const triggerTaskId: unknown = Reflect.get(trigger, "taskId");
        return typeof taskId === "string" &&
          typeof dependency === "number" &&
          triggerKind === "task-settled" &&
          triggerSettlementKind === "failed" &&
          triggerTaskId === "source"
          ? [Object.freeze({ dependency, taskId, triggerTaskId })]
          : [];
      }),
      [
        { dependency: 1, taskId: "last-dependent", triggerTaskId: "source" },
        { dependency: 0, taskId: "first-dependent", triggerTaskId: "source" }
      ]
    );
    assert.deepEqual(
      run.settlements.map(({ settlement, task }) => ({ kind: settlement.kind, taskId: task.id })),
      [
        { kind: "failed", taskId: "source" },
        { kind: "blocked", taskId: "first-dependent" },
        { kind: "blocked", taskId: "last-dependent" },
        { kind: "completed", taskId: "tail" }
      ]
    );

    let terminalLastSettledTaskId: string | null | undefined;
    await runTaskGraph({
      admissionPolicy: admissionSelectionPolicyFor(() => ({ kind: "select", taskId: "source" })),
      execute: () => {
        throw new Error("expected source failure");
      },
      graph: { tasks: graph.tasks.slice(0, 3) },
      maxParallel: 1,
      measurementHooks: [
        (context) => {
          terminalLastSettledTaskId = context.rawMeasurement.discrete.lastSettledTaskId;
        }
      ],
      performanceDiagnostics: Object.freeze({
        clock: Object.freeze({ now: () => 0 }),
        declarativeFingerprint: "canonical-effect-last-settled"
      })
    });
    assert.equal(terminalLastSettledTaskId, "first-dependent");
  });
});
