export const traceCorpus = [
  { name: "relations-forced-duplicates-mutex", maxParallel: 3, graph: { tasks: [
    { id: "source", mutex: ["m", "m"] }, { id: "second", mutex: ["n"] },
    { id: "dependent", dependsOn: ["source", "source", "second"] },
    { id: "observer", observes: ["source", "source"], mutex: ["m", "n"] },
    { id: "cascade", dependsOn: ["dependent"] }, { id: "free" }
  ] }, actions: [
    { kind: "select", taskId: "missing" }, { kind: "settle", taskId: "source", outcome: "invalid" },
    { kind: "select", taskId: "source" }, { kind: "select", taskId: "observer" },
    { kind: "settle", taskId: "free", outcome: "satisfied" }, { kind: "select", taskId: "second" },
    { kind: "settle-running", taskId: "source", settlementKind: "failed" },
    { kind: "select", taskId: "observer" }, { kind: "settle", taskId: "second", outcome: "satisfied" },
    { kind: "select", taskId: "observer" }, { kind: "cancel-pending" },
    { kind: "settle", taskId: "observer", outcome: "satisfied" }, { kind: "select", taskId: "missing" }
  ] },
  { name: "scope-ties-multiple-active", maxParallel: 4, graph: {
    scopes: [ { id: "a", maxParallel: 2, activationTaskIds: ["a-open"], terminalTaskId: "a-end" }, { id: "b", maxParallel: 3, activationTaskIds: ["b-open"], terminalTaskId: "b-end" } ],
    resourceCapacities: { r: 3 }, tasks: [
      { id: "z", scopeId: "a", admissionPriority: 5, resourceClaims: { r: 2 } },
      { id: "a", scopeId: "a", admissionPriority: 5, resourceClaims: { r: 2 } },
      { id: "a-open", scopeId: "a", resourceClaims: { r: 1 } },
      { id: "b-open", scopeId: "b" },
      { id: "a-end", scopeId: "a", observes: ["z", "a", "a-open"] },
      { id: "b-end", scopeId: "b", observes: ["b-open"] }, { id: "outside", admissionPriority: 100 }
    ] }, actions: [
      { kind: "select", taskId: "b-open" }, { kind: "select", taskId: "a-open" },
      { kind: "select", taskId: "outside" }, { kind: "settle", taskId: "a-open", outcome: "satisfied" },
      { kind: "select", taskId: "a" }, { kind: "settle", taskId: "a", outcome: "satisfied" },
      { kind: "select", taskId: "z" }, { kind: "settle", taskId: "z", outcome: "satisfied" },
      { kind: "select", taskId: "a-end" }, { kind: "settle", taskId: "a-end", outcome: "satisfied" },
      { kind: "select", taskId: "outside" }, { kind: "cancel-pending" },
      { kind: "settle-running", taskId: "b-open", settlementKind: "prerequisite-unsatisfied" }
    ] },
  { name: "resource-atomic-nonhead-cancellation", maxParallel: 3, graph: {
    resourceCapacities: { r: 5, s: 3 }, tasks: [
      { id: "z", admissionPriority: 5, resourceClaims: { r: 4, s: 2 } },
      { id: "a", admissionPriority: 5, resourceClaims: { r: 2, s: 2 } },
      { id: "tail", resourceClaims: { r: 1 } }, { id: "free" },
      { id: "observe", observes: ["z", "tail"] }, { id: "dep", dependsOn: ["a"] }
    ] }, actions: [
      { kind: "select", taskId: "tail" }, { kind: "select", taskId: "a" },
      { kind: "select", taskId: "z" }, { kind: "select", taskId: "free" },
      { kind: "cancel-pending" }, { kind: "settle", taskId: "tail", outcome: "satisfied" },
      { kind: "settle", taskId: "a", outcome: "unsatisfied" }, { kind: "settle", taskId: "free", outcome: "satisfied" }
    ] },
  { name: "seed-pre-admission-and-forced", maxParallel: 2, settlements: [{ taskId: "source", kind: "prerequisite-unsatisfied" }], graph: { tasks: [
    { id: "source" }, { id: "left", dependsOn: ["source"] }, { id: "right", dependsOn: ["source"] },
    { id: "join", dependsOn: ["left", "right"] }, { id: "observe", observes: ["source", "join"] }
  ] }, actions: [{ kind: "reconcile" }, { kind: "select", taskId: "observe" }, { kind: "settle", taskId: "observe", outcome: "satisfied" }] }
] as const;
