import assert from "node:assert/strict";

export function fixture(shape, n, order = "last") {
  const task = (id, fields = {}) => ({ id, ...fields });
  let sources, downstream;
  let resourceCapacities = { r: Math.max(8, n) };
  if (shape === "deep") return { graph: { tasks: Array.from({ length: n }, (_, i) => task(`d-${i}`, i ? { dependsOn: [`d-${i - 1}`] } : {})) }, sources: [], maxParallel: 8 };
  if (shape.startsWith("factored")) {
    sources = [task("a"), ...Array.from({ length: n }, (_, i) => task(`b-${i}`))];
    downstream = Array.from({ length: n }, (_, i) => task(`t-${i}`, { dependsOn: ["a", `b-${i}`], resourceClaims: { r: shape.endsWith("cross") ? i + 1 : 1 + i % 4 } }));
    const a = sources.shift();
    sources.splice(order === "first" ? 0 : order === "middle" ? Math.floor(n / 2) : n, 0, a);
  } else if (shape === "unique" || shape === "overlap") {
    sources = Array.from({ length: n }, (_, i) => task(`s-${i}`));
    downstream = Array.from({ length: n }, (_, i) => task(`t-${i}`, { dependsOn: shape === "unique" ? [`s-${i}`] : [`s-${i}`, `s-${(i + 1) % n}`, `s-${(i + 5) % n}`], resourceClaims: { r: 1 + i % 4 } }));
  } else {
    sources = Array.from({ length: 8 }, (_, i) => task(`s-${i}`));
    downstream = Array.from({ length: n }, (_, i) => task(`t-${i}`, {
      dependsOn: shape === "partition" ? [`s-${i % 8}`] : shape === "cohort" ? ["s-0", "s-0"] : ["s-0", "s-1", "s-2", "s-3"],
      observes: shape === "partition" ? [] : ["s-4", "s-5"],
      resourceClaims: { r: shape === "cross" ? i + 1 : 1 + i % 4 }
    }));
  }
  return { graph: { resourceCapacities, tasks: [...sources, ...downstream] }, sources: sources.map(({ id }) => id), maxParallel: 8 };
}
function plainState(api, state) {
  const publicState = api.admissionStateForCore(state);
  const choice = api.staticAdmissionCandidateForCore(state);
  return { catalog: publicState.catalog, inspection: publicState.inspection, static: choice ? { id: choice.task.id, canAdmit: choice.canAdmit } : null };
}
function delayRecord(queue) {
  return queue.pendingAdmissionDelays().slice().sort((a, b) => a.taskId.localeCompare(b.taskId));
}

// Compilation, seed, reads, collector work and complete downstream drain all belong to the measured call.
export function coreWorkload(api, spec, options = {}) {
  const { collector = "delays", record = false, full = false, retain = false, cancel = false, failure = false, forks = 0 } = options;
  const graph = api.prepareTaskGraph(spec.graph, spec.maxParallel);
  const compiled = api.compilePreparedAdmissionGraph(graph, spec.maxParallel);
  const seedId = options.preseed ? spec.sources[0] : undefined;
  const initial = api.createAdmissionCoreFromSettlements(compiled, seedId === undefined ? [] : [{ taskId: seedId, kind: options.preseed === "failed" ? "prerequisite-unsatisfied" : "completed" }]);
  let state = initial;
  const queue = collector === "none" ? undefined : new api.SchedulerQueueMeasurements(state, { delays: collector === "delays", peaks: true });
  const records = [];
  const retained = retain ? [initial] : [];
  const taken = [];
  let effects = 0, checksum = 0;
  function boundary(next, effect) {
    state = next;
    queue?.capture(state, true);
    if (record) {
      effects++;
      checksum += effect.taskId.length + (effect.kind === "admitted" ? 1 : 3);
    }
    if (full || record) {
      const projection = plainState(api, state);
      if (record) records.push({ effect, projection, counts: queue?.counts(), peaks: queue?.peaks(), delays: queue && delayRecord(queue) });
      else checksum += projection.catalog.selectableTaskIds.length + projection.inspection.runningTaskIds.length;
    }
  }
  function apply(result) {
    assert.equal(result.accepted, true, result.reason?.kind);
    for (let i = 0; i < result.transition.effects.length; i++) boundary(result.transition.effectStates[i], result.transition.effects[i]);
    state = result.transition.state;
  }
  function select(id) {
    queue?.addInterval(1n);
    const delay = queue?.takeAdmissionDelay(id);
    if (record) taken.push({ id, delay });
    apply(api.selectAdmissionCore(state, id));
  }
  function settle(id, fail = false) {
    queue?.addInterval(1n);
    apply(api.settleAdmissionCore(state, id, fail ? "unsatisfied" : "satisfied"));
  }
  const reconciliation = api.reconcileAdmissionCore(state);
  for (let i = 0; i < reconciliation.effects.length; i++) boundary(reconciliation.effectStates[i], reconciliation.effects[i]);
  state = reconciliation.state;
  for (const id of spec.sources) {
    if (id === seedId) continue;
    select(id); settle(id, failure && id === spec.sources[0]);
    if (retain) retained.push(state);
  }
  if (cancel) {
    queue?.addInterval(1n);
    const result = api.cancelPendingAdmissionCore(state);
    if (record) records.push({ cancellationEffects: result.effects, effectStates: result.effectStates.map((next) => plainState(api, next)) });
    state = result.state;
    queue?.capture(state, true);
    if (record) effects += result.effects.length;
  }
  const forkStates = [];
  for (let branch = 0; branch < forks; branch++) {
    let fork = state;
    for (let step = 0; step < Math.min(64, spec.graph.tasks.length / 4); step++) {
      const ids = api.admissionStateForCore(fork).catalog.selectableTaskIds;
      const id = ids[(branch + step) % Math.max(1, ids.length)];
      if (id === undefined) break;
      const selected = api.selectAdmissionCore(fork, id);
      assert.equal(selected.accepted, true);
      const settled = api.settleAdmissionCore(selected.transition.state, id, branch % 3 === 0 && step === 0 ? "unsatisfied" : "satisfied");
      assert.equal(settled.accepted, true);
      fork = settled.transition.state;
    }
    forkStates.push(fork);
  }
  while (state.selection.memberships.status.pending.size > 0) {
    const choice = api.staticAdmissionCandidateForCore(state);
    assert.ok(choice?.canAdmit, "DAG must progress after sources settle");
    select(choice.task.id); settle(choice.task.id);
  }
  if (record) {
    for (const snapshot of retained) records.push({ retained: plainState(api, snapshot) });
    for (const fork of forkStates) records.push({ fork: plainState(api, fork) });
  }
  return { effects, checksum, final: plainState(api, state), counts: queue?.counts(), peaks: queue?.peaks(), taken: record ? taken : undefined,
    delays: queue && delayRecord(queue), records: record ? records : undefined,
    retained: retain ? { compiled, initial, states: retained, forks: forkStates, final: state, queue } : options.keepFinal ? { compiled, final: state, queue } : undefined };
}

export async function publicRunWorkload(api, spec, mode = "static", record = false) {
  let terminal, callbacks = 0;
  const execution = [];
  const checks = spec.graph.tasks.map((task) => api.defineCheck({
    checkId: task.id, displayName: task.id, dependsOn: task.dependsOn ?? [], observes: task.observes ?? [], mutex: task.mutex ?? [],
    resourceClaims: task.resourceClaims ?? {}, admissionPriority: task.admissionPriority ?? 0,
    execute() { if (record) execution.push(task.id); return { status: "passed", data: {} }; }
  }));
  const decide = mode === "custom-full" ? api.defineContextCallback("scheduler.decide", {
    contextNeeds: ["candidates", "admissionState", "graph", "capacity", "runningTaskIds", "settledTaskIds", "cumulative", "actionHistory"],
    callback(c) {
      callbacks++;
      c.admissionState.catalog; c.admissionState.inspection;
      c.actionHistory.measurementAt(c.actionHistory.measurementCount - 1);
      const candidate = c.candidates.find((entry) => entry.canAdmit);
      return candidate ? { kind: "select", taskId: candidate.taskId } : { kind: "wait" };
    }
  }) : undefined;
  const measured = mode !== "static";
  const definition = api.defineConfig({ checks,
    outputs: { diagnosticLogging: { enabled: false }, machinePublication: { enabled: false }, progressRendering: { enabled: false } },
    scheduler: { maxParallel: spec.maxParallel, resourceCapacities: spec.graph.resourceCapacities ?? {},
      ...(decide ? { admissionPolicy: { kind: "custom", strategy: { kind: "simple", decide } } } : {}),
      ...(measured ? { terminalEffects: [api.defineContextCallback("scheduler.terminal", { contextNeeds: ["execution", "runMeasurement", "taskTimings"], callback(c) { terminal = c; } })] } : {})
    }
  });
  const result = await api.run(definition);
  assert.equal(result.kind, "completed");
  const discrete = terminal ? { execution: terminal.execution, run: terminal.runMeasurement.discrete, peaks: terminal.runMeasurement.peaks, taskIds: terminal.taskTimings.admissions?.map(({ taskId }) => taskId) } : undefined;
  return { kind: result.kind, callbacks, count: checks.length, execution: record ? execution : undefined, discrete };
}

export async function diagnosticShellWorkload(api, spec, record = false) {
  let tick = 0, seen = 0;
  const observations = [];
  const logger = Object.freeze({ close: () => "disabled", observe(observation) { seen++; if (record) observations.push(observation); else JSON.stringify(observation); } });
  const result = await api.runTaskGraph({ graph: spec.graph, maxParallel: spec.maxParallel,
    execute: () => true, diagnosticLogger: logger,
    performanceDiagnostics: { clock: Object.freeze({ now: () => ++tick }), declarativeFingerprint: "fixed-fixture", logger },
    terminalContextNeeds: ["execution", "runMeasurement", "taskTimings"] });
  return { seen, cancelled: result.cancelled, settlements: result.settlements.map(({ task, settlement }) => [task.id, settlement.kind]), observations: record ? observations : undefined };
}
export function stringify(value) { return JSON.stringify(value, (_, v) => typeof v === "bigint" ? `${v}n` : v); }
