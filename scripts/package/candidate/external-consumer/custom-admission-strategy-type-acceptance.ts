/** Public consumer source that proves custom admission strategy authoring and compatibility boundaries. */
export const CUSTOM_ADMISSION_STRATEGY_TYPE_ACCEPTANCE_SOURCE = String.raw`const customAdmissionPolicy: AdmissionPolicy = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "simple",
    decide: defineContextCallback("scheduler.decide", { contextNeeds: ["activeScopeIds","admissionState","candidates","capacity","graph","runningTaskIds","runtime","settledTaskIds"], callback: (context): AdmissionProposal => {
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
    } })
  }
});
const preparedCustomAdmissionPolicy: AdmissionPolicy = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    prepare: defineContextCallback("scheduler.prepare", { contextNeeds: ["graph"], callback: async (context) => {
      const graph: SchedulerGraphSnapshot = context.graph;
      void graph;
      return {
        decide: defineContextCallback("scheduler.decide", { contextNeeds: ["candidates"], callback: (decision): AdmissionProposal => {
          const candidate = decision.candidates.find(({ canAdmit }) => canAdmit);
          return candidate === undefined
            ? { kind: "wait" }
            : { kind: "select", taskId: candidate.taskId };
        } }),
        terminalEffect: defineContextCallback("scheduler.terminal", { contextNeeds: ["execution","graph","runMeasurement","taskTimings"], callback: async (terminal): Promise<void> => {
          const sealed: SchedulerMeasurementContext = terminal;
          void sealed.execution.settledTasks;
        } })
      };
    } })
  }
});
// Declared callbacks preserve literal needs and selected, readonly phase context.
const declaredDecision = defineContextCallback("scheduler.decide", {
  contextNeeds: ["candidates", "runtime"],
  callback(context) {
    const selected: Readonly<Pick<AdmissionPolicyContext, "candidates" | "runtime">> = context;
    // @ts-expect-error a subset callback cannot read undeclared cumulative.
    void context.cumulative;
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
const widenedDecision = defineContextCallback("scheduler.decide", {
  contextNeeds: widenedNeeds,
  callback(context) {
    // @ts-expect-error a widened array does not guarantee candidates will actually be requested.
    void context.candidates;
    return { kind: "wait" };
  }
});
function uncertainDecision(token: "candidates" | "cumulative") {
  return defineContextCallback("scheduler.decide", {
    contextNeeds: [token, "runtime"],
    callback(context) {
      void context.runtime.cancelled;
      // @ts-expect-error a union token cannot guarantee the candidates field.
      void context.candidates;
      // @ts-expect-error a union token cannot guarantee cumulative either.
      void context.cumulative;
      return { kind: "wait" };
    }
  });
}
function sharedHeadTerminalNeeds(needs: readonly ["graph"] | readonly ["graph", "execution"]) {
  return defineContextCallback("scheduler.terminal", {
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
  return defineContextCallback("scheduler.terminal", {
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
const declaredShape: DeclaredContextCallback<
  [], AdmissionPolicyContext, readonly ["candidates", "runtime"], AdmissionProposal
> = declaredDecision;
const noneDecision = defineContextCallback("scheduler.decide", {
  contextNeeds: [],
  callback(context) {
    // @ts-expect-error none does not guarantee any decision fields.
    void context.candidates;
    return { kind: "wait" };
  }
});
const fullDecision: EmptyContextCallback<[], AdmissionProposal> = defineContextCallback(
  "scheduler.decide", {
    callback(context) {
      // @ts-expect-error Omitted needs is empty, not full.
      void context.graph;
      return { kind: "wait" };
    }
  }
);
const undefinedDecision = defineContextCallback("scheduler.decide", {
  contextNeeds: undefined,
  callback(context) {
    // @ts-expect-error Explicit undefined is empty, not full.
    void context.capacity;
    return { kind: "wait" };
  }
});
const storedDecision: ContextCallbackInput<[], AdmissionPolicyContext, AdmissionProposal> =
  declaredDecision;
const decisionPhase: CallbackContextPhase = "scheduler.decide";
const phaseContext = (context: CallbackContextByPhase["scheduler.decide"]): AdmissionPolicyContext => context;
const phaseResult: AdmissionProposal = { kind: "wait" };
defineConfig({ scheduler: { terminalEffects: [(context) => {
  // @ts-expect-error A plain function receives no injected fields.
  void context.graph;
  return { ignoredLegacyReturn: true };
}] } });
const declaredTerminal = defineContextCallback("scheduler.terminal", {
  contextNeeds: ["execution"],
  async callback(context) {
    void context.execution.settledTasks;
    // @ts-expect-error terminal subset does not guarantee runMeasurement.
    void context.runMeasurement;
  }
});
const declaredPreparation = defineContextCallback("scheduler.prepare", {
  contextNeeds: ["graph"],
  async callback(context) {
    const graph: SchedulerGraphSnapshot = context.graph;
    void graph;
    return { decide: declaredDecision, terminalEffect: declaredTerminal };
  }
});
const nonePreparation = defineContextCallback("scheduler.prepare", {
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
    prepare: defineContextCallback("scheduler.prepare", { contextNeeds: ["graph"], callback: async (context) => {
      void context.graph;
      return { decide: declaredDecision, terminalEffect: declaredTerminal };
    } })
  }
});
defineConfig({ scheduler: {
  admissionPolicy: declaredPreparedPolicy,
  terminalEffects: [
    declaredTerminal,
    defineContextCallback("scheduler.terminal", { contextNeeds: [], callback() {} }),
    defineContextCallback("scheduler.terminal", {
      callback(context) {
        // @ts-expect-error Omitted needs does not grant terminal data.
        void context.runMeasurement;
      }
    }),
    defineContextCallback("scheduler.terminal", {
      contextNeeds: undefined, callback(context) {
        // @ts-expect-error Undefined needs is empty.
        void context.graph;
      }
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
defineContextCallback("scheduler.decide", { contextNeeds: ["execution"], callback: () => ({ kind: "wait" }) });
// @ts-expect-error preparation cannot request decision fields.
defineContextCallback("scheduler.prepare", { contextNeeds: ["runtime"], callback: () => ({ decide: noneDecision }) });
// @ts-expect-error terminal cannot request an online cumulative prefix.
defineContextCallback("scheduler.terminal", { contextNeeds: ["cumulative"], callback() {} });
// @ts-expect-error helper descriptors are exact, not generic option bags.
defineContextCallback("scheduler.decide", { contextNeeds: [], callback: () => ({ kind: "wait" }), unsupported: true });
// @ts-expect-error declared decisions must also return a synchronous proposal.
defineContextCallback("scheduler.decide", { contextNeeds: [], async callback() { return { kind: "wait" }; } });
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
    prepare: defineContextCallback("scheduler.prepare", {
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
        decide: defineContextCallback("scheduler.decide", { contextNeeds: ["candidates"], callback: (context) => {
          const candidate = context.candidates[0];
          return candidate === undefined
            ? { kind: "wait" as const }
            : { kind: "select" as const, taskId: candidate.taskId };
        } })
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
