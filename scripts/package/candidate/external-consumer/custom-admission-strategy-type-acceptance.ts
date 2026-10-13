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
      const liveState: AdmissionState = context.admissionState;
      const lookahead = liveState.validateSelection(firstTask?.taskId ?? "missing");
      void [
        firstTask?.admissionPriority,
        context.graph.scopes,
        context.activeScopeIds,
        context.runningTaskIds,
        context.settledTaskIds,
        capacity,
        runtime,
        lookahead
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
        async terminalEffect(terminal): Promise<void> {
          const sealed: SchedulerMeasurementContext = terminal;
          void sealed.execution.settledTasks;
        }
      };
    }
  }
});
// Declared callbacks preserve literal needs and selected, readonly phase context.
const declaredDecision = defineSchedulerContextCallback("decision", {
  contextNeeds: ["candidates", "runtime"],
  callback(context) {
    const selected: Readonly<Pick<AdmissionPolicyContext, "candidates" | "runtime">> = context;
    // @ts-expect-error a subset callback cannot read undeclared measurement.
    void context.measurement;
    // @ts-expect-error selected candidates remain readonly.
    context.candidates.push({});
    const candidate = selected.candidates.find(({ canAdmit }) => canAdmit);
    return selected.runtime.cancelled || candidate === undefined
      ? { kind: "wait" }
      : { kind: "select", taskId: candidate.taskId };
  }
});
const declaredNeeds: readonly ["candidates", "runtime"] = declaredDecision.contextNeeds;
const widenedNeeds: readonly (keyof AdmissionPolicyContext)[] = ["candidates"];
const widenedDecision = defineSchedulerContextCallback("decision", {
  contextNeeds: widenedNeeds,
  callback(context) {
    // @ts-expect-error a widened array does not guarantee candidates will actually be requested.
    void context.candidates;
    return { kind: "wait" };
  }
});
function uncertainDecision(token: "candidates" | "measurement") {
  return defineSchedulerContextCallback("decision", {
    contextNeeds: [token, "runtime"],
    callback(context) {
      void context.runtime.cancelled;
      // @ts-expect-error a union token cannot guarantee the candidates field.
      void context.candidates;
      // @ts-expect-error a union token cannot guarantee measurement either.
      void context.measurement;
      return { kind: "wait" };
    }
  });
}
function sharedHeadTerminalNeeds(needs: readonly ["graph"] | readonly ["graph", "execution"]) {
  return defineSchedulerContextCallback("terminal", {
    contextNeeds: needs,
    callback(context) {
      void context.graph;
      // @ts-expect-error a tail present in only some tuple branches is not guaranteed.
      void context.execution;
    }
  });
}
function reorderedTerminalNeeds(
  needs: readonly ["graph", "execution"] | readonly ["execution", "graph"]
) {
  return defineSchedulerContextCallback("terminal", {
    contextNeeds: needs,
    callback(context) {
      // @ts-expect-error union-valued positions conservatively guarantee no graph field.
      void context.graph;
      // @ts-expect-error union-valued positions conservatively guarantee no execution field.
      void context.execution;
    }
  });
}
void [sharedHeadTerminalNeeds, reorderedTerminalNeeds];
const declaredShape: DeclaredSchedulerContextCallback<
  "decision", readonly ["candidates", "runtime"]
> = declaredDecision;
const noneDecision = defineSchedulerContextCallback("decision", {
  contextNeeds: [],
  callback(context) {
    // @ts-expect-error none does not guarantee any decision fields.
    void context.candidates;
    return { kind: "wait" };
  }
});
const fullDecision: FullSchedulerContextCallback<"decision"> = defineSchedulerContextCallback(
  "decision", {
    callback(context) {
      const full: AdmissionPolicyContext = context;
      void [full.graph, full.measurement, full.admissionState];
      return { kind: "wait" };
    }
  }
);
const undefinedDecision = defineSchedulerContextCallback("decision", {
  contextNeeds: undefined,
  callback(context) {
    const full: AdmissionPolicyContext = context;
    void full.capacity;
    return { kind: "wait" };
  }
});
const storedDecision: SchedulerContextCallbackInput<AdmissionPolicyContext, AdmissionProposal> =
  declaredDecision;
const decisionPhase: SchedulerContextPhase = "decision";
const phaseContext = (context: SchedulerContextByPhase["decision"]): AdmissionPolicyContext => context;
const phaseResult: SchedulerContextResultByPhase["decision"] = { kind: "wait" };
defineConfig({ scheduler: { terminalEffects: [(context) => {
  const full: SchedulerMeasurementContext = context;
  void [full.graph, full.execution, full.rawMeasurement];
  return { ignoredLegacyReturn: true };
}] } });
const declaredTerminal = defineSchedulerContextCallback("terminal", {
  contextNeeds: ["execution"],
  async callback(context) {
    void context.execution.settledTasks;
    // @ts-expect-error terminal subset does not guarantee rawMeasurement.
    void context.rawMeasurement;
  }
});
const declaredPreparation = defineSchedulerContextCallback("preparation", {
  contextNeeds: ["graph"],
  async callback(context) {
    const graph: SchedulerGraphSnapshot = context.graph;
    void graph;
    return { decide: declaredDecision, terminalEffect: declaredTerminal };
  }
});
const nonePreparation = defineSchedulerContextCallback("preparation", {
  contextNeeds: [],
  callback(context) {
    // @ts-expect-error none preparation does not guarantee graph.
    void context.graph;
    return { decide: noneDecision };
  }
});
const declaredPreparedPolicy = defineAdmissionPolicy({
  kind: "custom", strategy: { kind: "prepared", prepare: declaredPreparation }
});
const legacyPreparationDeclaredResult = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    async prepare(context) {
      void context.graph;
      return { decide: declaredDecision, terminalEffect: declaredTerminal };
    }
  }
});
defineConfig({ scheduler: {
  admissionPolicy: declaredPreparedPolicy,
  terminalEffects: [
    declaredTerminal,
    defineSchedulerContextCallback("terminal", { contextNeeds: [], callback() {} }),
    defineSchedulerContextCallback("terminal", {
      callback(context) { const full: SchedulerMeasurementContext = context; void full.rawMeasurement; }
    }),
    defineSchedulerContextCallback("terminal", {
      contextNeeds: undefined, callback(context) { void context.graph; }
    })
  ]
} });
defineConfig({ scheduler: { admissionPolicy: {
  kind: "custom", strategy: { kind: "simple", decide: declaredDecision }
} } });
defineAdmissionPolicy({ kind: "custom", strategy: { kind: "simple", decide: fullDecision } });
defineAdmissionPolicy({ kind: "custom", strategy: { kind: "simple", decide: undefinedDecision } });
defineAdmissionPolicy({ kind: "custom", strategy: { kind: "prepared", prepare: nonePreparation } });
const rawDescriptorStrategy: CustomAdmissionStrategy = {
  kind: "simple",
  decide: {
    contextNeeds: ["candidates"],
    callback(context) {
      // @ts-expect-error raw descriptor erases context at the storage boundary; use the helper to read it.
      void context.candidates;
      return { kind: "wait" };
    }
  }
};
// @ts-expect-error needs must be keys of the selected phase.
defineSchedulerContextCallback("decision", { contextNeeds: ["execution"], callback: () => ({ kind: "wait" }) });
// @ts-expect-error preparation cannot request decision fields.
defineSchedulerContextCallback("preparation", { contextNeeds: ["runtime"], callback: () => ({ decide: noneDecision }) });
// @ts-expect-error terminal cannot request an online measurement prefix.
defineSchedulerContextCallback("terminal", { contextNeeds: ["measurement"], callback() {} });
// @ts-expect-error helper descriptors are exact, not generic option bags.
defineSchedulerContextCallback("decision", { contextNeeds: [], callback: () => ({ kind: "wait" }), unsupported: true });
// @ts-expect-error declared decisions must also return a synchronous proposal.
defineSchedulerContextCallback("decision", { contextNeeds: [], async callback() { return { kind: "wait" }; } });
defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "simple",
    // @ts-expect-error a raw descriptor decision cannot return a Promise.
    decide: { contextNeeds: [], async callback() { return { kind: "wait" }; } }
  }
});
defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "simple",
    // @ts-expect-error raw callback descriptors are nested-exact at policy authoring.
    decide: { contextNeeds: [], callback: () => ({ kind: "wait" }), unsupported: true }
  }
});
defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    // @ts-expect-error descriptor preparation does not weaken exact prepared-result keys.
    prepare: defineSchedulerContextCallback("preparation", {
      contextNeeds: [], callback: () => ({ decide: noneDecision, unsupported: true })
    })
  }
});
void [declaredNeeds, widenedDecision, uncertainDecision, declaredShape, storedDecision, decisionPhase, phaseContext, phaseResult,
  legacyPreparationDeclaredResult, rawDescriptorStrategy];
const strategy: CustomAdmissionStrategy = {
  kind: "simple",
  decide: () => ({ kind: "wait" })
};
const preparedStrategy: PreparedCustomAdmissionStrategy = {
  decide: () => ({ kind: "wait" }),
  terminalEffect: () => undefined
};
const preparationContext = (context: CustomAdmissionPreparationContext): SchedulerGraphSnapshot =>
  context.graph;
const simulation: AdmissionGraph = createAdmissionGraph({
  graph: {
    resourceCapacities: [],
    scopes: [],
    tasks: [
      {
        admissionPriority: 0,
        dependsOn: [],
        mutex: [],
        observes: [],
        resourceClaims: [],
        scopeId: null,
        taskId: "simulated"
      }
    ]
  },
  maxParallel: 1
});
const simulatedState: AdmissionState = simulation.initialState();
const simulationInput: AdmissionGraphInput = {
  graph: {
    resourceCapacities: [],
    scopes: [],
    tasks: [
      {
        admissionPriority: 0,
        dependsOn: [],
        mutex: [],
        observes: [],
        resourceClaims: [],
        scopeId: null,
        taskId: "simulated-input"
      }
    ]
  },
  maxParallel: 1
};
const selectedSimulation: AdmissionTransitionResult = simulatedState.select("simulated");
const validation: AdmissionSelectionValidation = simulatedState.validateSelection("simulated");
void [
  strategy,
  preparedStrategy,
  preparationContext,
  simulationInput,
  selectedSimulation,
  validation
];
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
