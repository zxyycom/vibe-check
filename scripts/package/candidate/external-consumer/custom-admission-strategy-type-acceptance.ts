/** Public consumer source that proves custom admission strategy authoring and compatibility boundaries. */
export const CUSTOM_ADMISSION_STRATEGY_TYPE_ACCEPTANCE_SOURCE = String.raw`const customAdmissionPolicy: AdmissionPolicy = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "simple",
    decide(context): AdmissionProposal {
      const firstTask = context.graph.tasks[0];
      const candidate = context.candidates.find(({ canAdmit }) => canAdmit);
      const capacity = context.capacity.effectiveMaxParallel;
      const runtime = context.runtime.abortRequested || context.runtime.cancelled;
      void [
        firstTask?.admissionPriority,
        context.graph.scopes,
        context.activeScopeIds,
        context.runningTaskIds,
        context.settledTaskIds,
        capacity,
        runtime
      ];
      return candidate === undefined
        ? { kind: "wait" }
        : { kind: "select", taskId: candidate.taskId };
    }
  }
});
const preparedCustomAdmissionPolicy: AdmissionPolicy = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    async prepare(context) {
      const graph: SchedulerGraphSnapshot = context.graph;
      void graph;
      return {
        decide(decision): AdmissionProposal {
          const candidate = decision.candidates.find(({ canAdmit }) => canAdmit);
          return candidate === undefined
            ? { kind: "wait" }
            : { kind: "select", taskId: candidate.taskId };
        },
        async complete(terminal): Promise<void> {
          const sealed: SchedulerMeasurementContext = terminal;
          void sealed.execution.settledTasks;
        }
      };
    }
  }
});
const strategy: CustomAdmissionStrategy = {
  kind: "simple",
  decide: () => ({ kind: "wait" })
};
const preparedStrategy: PreparedCustomAdmissionStrategy = {
  decide: () => ({ kind: "wait" }),
  complete: () => undefined
};
const preparationContext = (context: CustomAdmissionPreparationContext): SchedulerGraphSnapshot =>
  context.graph;
void [strategy, preparedStrategy, preparationContext];
defineConfig({ scheduler: { admissionPolicy: customAdmissionPolicy } });
defineConfig({ scheduler: { admissionPolicy: preparedCustomAdmissionPolicy } });
defineConfig({
  scheduler: {
    admissionPolicy: {
      kind: "custom",
      strategy: {
        kind: "simple",
        decide: (context) => {
          const candidate = context.candidates[0];
          return candidate === undefined
            ? { kind: "wait" as const }
            : { kind: "select" as const, taskId: candidate.taskId };
        }
      }
    }
  }
});
defineConfig({ scheduler: { admissionPolicy: { kind: "static" } } });
defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "simple",
    // @ts-expect-error admission decisions must synchronously return an exact proposal.
    async decide() {
      return { kind: "wait" };
    }
  }
});
defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "simple",
    decide: () => ({ kind: "wait" }),
    // @ts-expect-error custom strategy authoring is nested-exact.
    unsupported: true
  }
});
defineAdmissionPolicy({
  kind: "custom",
  // @ts-expect-error proposeAdmission is the retired public authoring form.
  proposeAdmission: () => ({ kind: "wait" })
});
defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    // @ts-expect-error prepared result excludes unknown fields at the public contract boundary.
    prepare: () => ({
      decide: () => ({ kind: "wait" }),
      unsupported: true
    })
  }
});
`;
