import { cpus, platform, release, totalmem, type } from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { prepareTaskGraph, type TaskGraph } from "../../../src/project-run/task-scheduler/graph.ts";
import { runTaskGraph } from "../../../src/project-run/task-scheduler/scheduler.ts";
import { admissionSelectionPolicyFor } from "../../../src/project-run/task-scheduler/custom-admission-policy.ts";
import { createLearnedCriticalPathAdmission } from "../../../src/project-run/task-scheduler/learned-critical-path-admission-policy.ts";
import { createAdmissionGraph, type AdmissionState } from "../../../src/index.ts";

const here = dirname(new URL(import.meta.url).pathname);
const manifestPath = resolve(here, "admission-state-benchmark.manifest.json");
const rawResultPath = resolve(here, "admission-state-benchmark.raw.json");
const summaryPath = resolve(here, "admission-state-benchmark.summary.md");
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as BenchmarkManifest;
const sink = { value: 0 };

type Status = 0 | 1 | 2 | 3;
type RepresentationName = "full-clone-map-set" | "parent-delta" | "dense-id-chunked-cow";
type MeasuredRepresentation =
  | RepresentationName
  | "current-real-shell"
  | "implementation-parent-delta";
type ScenarioSample = Readonly<{
  readonly allocationProxyHeapDeltaBytes: number;
  readonly cpuSystemMs: number;
  readonly cpuUserMs: number;
  readonly wallMs: number;
}>;
type ScenarioResult = Readonly<{
  readonly id: string;
  readonly iterationsPerSample: number;
  readonly representation: MeasuredRepresentation;
  readonly samples: readonly ScenarioSample[];
  readonly stats: Readonly<{
    readonly allocationProxyHeapDeltaBytes: Quantiles;
    readonly cpuSystemMs: Quantiles;
    readonly cpuUserMs: Quantiles;
    readonly wallMs: Quantiles;
  }>;
}>;
type Quantiles = Readonly<{ readonly p50: number; readonly p95: number }>;
type BenchmarkManifest = Readonly<{
  readonly command: string;
  readonly fixtures: Readonly<Record<string, string>>;
  readonly profile: Readonly<{
    readonly catalogIterationsPerSample: number;
    readonly measuredSamples: number;
    readonly prototypeIterationsPerSample: number;
    readonly realRunIterationsPerSample: number;
    readonly samePredecessorForksPerSample: number;
    readonly searchDepth: number;
    readonly validationIterationsPerSample: number;
    readonly warmupSamples: number;
  }>;
  readonly seed: number;
}>;

interface CompiledFixture {
  readonly dependencyIdsByIndex: readonly (readonly number[])[];
  readonly idByIndex: readonly string[];
  readonly indexById: ReadonlyMap<string, number>;
  readonly maxParallel: number;
}

interface PrototypeState {
  readonly running: number;
}

interface Prototype<S extends PrototypeState> {
  readonly initial: S;
  catalog(state: S): number;
  inspect(state: S): number;
  select(state: S, taskIndex: number): S | undefined;
  settle(state: S, taskIndex: number, outcome: "satisfied" | "unsatisfied"): S | undefined;
  validate(state: S, taskIndex: number): boolean;
}

interface FullCloneState extends PrototypeState {
  readonly runningIds: ReadonlySet<number>;
  readonly statuses: ReadonlyMap<number, Status>;
}

interface ParentDeltaState extends PrototypeState {
  readonly parent: ParentDeltaState | undefined;
  readonly status: Status | undefined;
  readonly taskIndex: number | undefined;
}

interface DenseCowState extends PrototypeState {
  readonly chunks: readonly Uint8Array[];
}

function taskId(index: number): string {
  return `task-${String(index).padStart(4, "0")}`;
}

function createLayeredGraph(taskCount: number, layerWidth: number): TaskGraph {
  return {
    tasks: Array.from({ length: taskCount }, (_, index) => {
      const layerStart = Math.max(0, index - layerWidth);
      const predecessor = index < layerWidth ? [] : [taskId(layerStart + (index % layerWidth))];
      return {
        id: taskId(index),
        dependsOn: predecessor,
        ...(index % 11 === 0 ? { mutex: [`mutex-${index % 4}`] } : {})
      };
    })
  };
}

function createHighFanoutGraph(): TaskGraph {
  return {
    tasks: [
      { id: "root" },
      ...Array.from({ length: 255 }, (_, index) => ({
        id: `dependent-${String(index).padStart(3, "0")}`,
        dependsOn: ["root"]
      }))
    ]
  };
}

function compilePrototype(graph: TaskGraph, maxParallel: number): CompiledFixture {
  const indexById = new Map<string, number>();
  const idByIndex = graph.tasks.map((task, index) => {
    indexById.set(task.id, index);
    return task.id;
  });
  const dependencyIdsByIndex = graph.tasks.map((task) =>
    (task.dependsOn ?? []).map((taskId) => {
      const index = indexById.get(taskId);
      if (index === undefined)
        throw new Error(`benchmark fixture references missing task ${taskId}`);
      return index;
    })
  );
  return Object.freeze({
    dependencyIdsByIndex: Object.freeze(dependencyIdsByIndex.map((entry) => Object.freeze(entry))),
    idByIndex: Object.freeze(idByIndex),
    indexById,
    maxParallel
  });
}

function fullClonePrototype(graph: CompiledFixture): Prototype<FullCloneState> {
  const initial: FullCloneState = Object.freeze({
    running: 0,
    runningIds: new Set(),
    statuses: new Map()
  });
  const statusFor = (state: FullCloneState, taskIndex: number): Status =>
    state.statuses.get(taskIndex) ?? 0;
  const validate = (state: FullCloneState, taskIndex: number): boolean =>
    statusFor(state, taskIndex) === 0 &&
    state.running < graph.maxParallel &&
    graph.dependencyIdsByIndex[taskIndex]?.every(
      (dependency) => statusFor(state, dependency) === 2
    ) === true;
  return {
    initial,
    catalog: (state) =>
      graph.idByIndex.reduce((count, _, index) => count + Number(validate(state, index)), 0),
    inspect: (state) => state.running + state.statuses.size + state.runningIds.size,
    select: (state, taskIndex) => {
      if (!validate(state, taskIndex)) return undefined;
      const statuses = new Map(state.statuses);
      statuses.set(taskIndex, 1);
      const runningIds = new Set(state.runningIds);
      runningIds.add(taskIndex);
      return Object.freeze({ running: state.running + 1, runningIds, statuses });
    },
    settle: (state, taskIndex, outcome) => {
      if (statusFor(state, taskIndex) !== 1) return undefined;
      const statuses = new Map(state.statuses);
      statuses.set(taskIndex, outcome === "satisfied" ? 2 : 3);
      const runningIds = new Set(state.runningIds);
      runningIds.delete(taskIndex);
      return Object.freeze({ running: state.running - 1, runningIds, statuses });
    },
    validate
  };
}

function parentDeltaPrototype(graph: CompiledFixture): Prototype<ParentDeltaState> {
  const initial: ParentDeltaState = Object.freeze({
    parent: undefined,
    running: 0,
    status: undefined,
    taskIndex: undefined
  });
  const statusFor = (state: ParentDeltaState, taskIndex: number): Status => {
    let cursor: ParentDeltaState | undefined = state;
    while (cursor !== undefined) {
      if (cursor.taskIndex === taskIndex && cursor.status !== undefined) return cursor.status;
      cursor = cursor.parent;
    }
    return 0;
  };
  const validate = (state: ParentDeltaState, taskIndex: number): boolean =>
    statusFor(state, taskIndex) === 0 &&
    state.running < graph.maxParallel &&
    graph.dependencyIdsByIndex[taskIndex]?.every(
      (dependency) => statusFor(state, dependency) === 2
    ) === true;
  const transition = (
    state: ParentDeltaState,
    taskIndex: number,
    status: Status,
    running: number
  ) => Object.freeze({ parent: state, running, status, taskIndex });
  return {
    initial,
    catalog: (state) =>
      graph.idByIndex.reduce((count, _, index) => count + Number(validate(state, index)), 0),
    inspect: (state) => {
      let nodeCount = 0;
      for (
        let cursor: ParentDeltaState | undefined = state;
        cursor !== undefined;
        cursor = cursor.parent
      )
        nodeCount += 1;
      return state.running + nodeCount;
    },
    select: (state, taskIndex) =>
      validate(state, taskIndex) ? transition(state, taskIndex, 1, state.running + 1) : undefined,
    settle: (state, taskIndex, outcome) =>
      statusFor(state, taskIndex) === 1
        ? transition(state, taskIndex, outcome === "satisfied" ? 2 : 3, state.running - 1)
        : undefined,
    validate
  };
}

function denseCowPrototype(graph: CompiledFixture): Prototype<DenseCowState> {
  const chunkSize = 64;
  const initial: DenseCowState = Object.freeze({
    chunks: Object.freeze(
      Array.from(
        { length: Math.ceil(graph.idByIndex.length / chunkSize) },
        () => new Uint8Array(chunkSize)
      )
    ),
    running: 0
  });
  const statusFor = (state: DenseCowState, taskIndex: number): Status =>
    (state.chunks[Math.floor(taskIndex / chunkSize)]?.[taskIndex % chunkSize] ?? 0) as Status;
  const validate = (state: DenseCowState, taskIndex: number): boolean =>
    statusFor(state, taskIndex) === 0 &&
    state.running < graph.maxParallel &&
    graph.dependencyIdsByIndex[taskIndex]?.every(
      (dependency) => statusFor(state, dependency) === 2
    ) === true;
  const transition = (state: DenseCowState, taskIndex: number, status: Status, running: number) => {
    const chunkIndex = Math.floor(taskIndex / chunkSize);
    const chunks = state.chunks.slice();
    const changed = new Uint8Array(chunks[chunkIndex]);
    changed[taskIndex % chunkSize] = status;
    chunks[chunkIndex] = changed;
    return Object.freeze({ chunks: Object.freeze(chunks), running });
  };
  return {
    initial,
    catalog: (state) =>
      graph.idByIndex.reduce((count, _, index) => count + Number(validate(state, index)), 0),
    inspect: (state) => state.running + state.chunks.length,
    select: (state, taskIndex) =>
      validate(state, taskIndex) ? transition(state, taskIndex, 1, state.running + 1) : undefined,
    settle: (state, taskIndex, outcome) =>
      statusFor(state, taskIndex) === 1
        ? transition(state, taskIndex, outcome === "satisfied" ? 2 : 3, state.running - 1)
        : undefined,
    validate
  };
}

function requireSuccess<T>(value: T | undefined, action: string): T {
  if (value === undefined) throw new Error(`benchmark action unexpectedly rejected: ${action}`);
  return value;
}

function runnableIndex<S extends PrototypeState>(
  model: Prototype<S>,
  state: S,
  preferred: number
): number {
  if (model.validate(state, preferred)) return preferred;
  for (let index = 0; index < 256; index += 1) if (model.validate(state, index)) return index;
  throw new Error("prototype fixture became undrainable");
}

function settledState<S extends PrototypeState>(model: Prototype<S>, cycles = 8): S {
  let state = model.initial;
  for (let index = 0; index < cycles; index += 1) {
    const taskIndex = runnableIndex(model, state, index);
    const running = requireSuccess(model.select(state, taskIndex), "select");
    state = requireSuccess(model.settle(running, taskIndex, "satisfied"), "settle");
  }
  return state;
}

function quantiles(values: readonly number[]): Quantiles {
  const sorted = [...values].sort((left, right) => left - right);
  const pick = (quantile: number) => {
    const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1);
    return Number((sorted[index] ?? 0).toFixed(3));
  };
  return Object.freeze({ p50: pick(0.5), p95: pick(0.95) });
}

function sampleSync(operation: () => void): ScenarioSample {
  const beforeHeap = process.memoryUsage().heapUsed;
  const beforeCpu = process.cpuUsage();
  const started = performance.now();
  operation();
  const wallMs = performance.now() - started;
  const cpu = process.cpuUsage(beforeCpu);
  sink.value += Math.round(wallMs);
  return Object.freeze({
    allocationProxyHeapDeltaBytes: process.memoryUsage().heapUsed - beforeHeap,
    cpuSystemMs: cpu.system / 1000,
    cpuUserMs: cpu.user / 1000,
    wallMs
  });
}

async function sampleAsync(operation: () => Promise<void>): Promise<ScenarioSample> {
  const beforeHeap = process.memoryUsage().heapUsed;
  const beforeCpu = process.cpuUsage();
  const started = performance.now();
  await operation();
  const wallMs = performance.now() - started;
  const cpu = process.cpuUsage(beforeCpu);
  sink.value += Math.round(wallMs);
  return Object.freeze({
    allocationProxyHeapDeltaBytes: process.memoryUsage().heapUsed - beforeHeap,
    cpuSystemMs: cpu.system / 1000,
    cpuUserMs: cpu.user / 1000,
    wallMs
  });
}

function scenarioSync(
  id: string,
  representation: MeasuredRepresentation,
  iterationsPerSample: number,
  operation: () => void
): ScenarioResult {
  for (let index = 0; index < manifest.profile.warmupSamples; index += 1) operation();
  const samples = Array.from({ length: manifest.profile.measuredSamples }, () =>
    sampleSync(operation)
  );
  return Object.freeze({
    id,
    iterationsPerSample,
    representation,
    samples: Object.freeze(samples),
    stats: Object.freeze({
      allocationProxyHeapDeltaBytes: quantiles(
        samples.map((sample) => sample.allocationProxyHeapDeltaBytes)
      ),
      cpuSystemMs: quantiles(samples.map((sample) => sample.cpuSystemMs)),
      cpuUserMs: quantiles(samples.map((sample) => sample.cpuUserMs)),
      wallMs: quantiles(samples.map((sample) => sample.wallMs))
    })
  });
}

async function scenarioAsync(
  id: string,
  iterationsPerSample: number,
  operation: () => Promise<void>
): Promise<ScenarioResult> {
  for (let index = 0; index < manifest.profile.warmupSamples; index += 1) await operation();
  const samples: ScenarioSample[] = [];
  for (let index = 0; index < manifest.profile.measuredSamples; index += 1)
    samples.push(await sampleAsync(operation));
  return Object.freeze({
    id,
    iterationsPerSample,
    representation: "current-real-shell",
    samples: Object.freeze(samples),
    stats: Object.freeze({
      allocationProxyHeapDeltaBytes: quantiles(
        samples.map((sample) => sample.allocationProxyHeapDeltaBytes)
      ),
      cpuSystemMs: quantiles(samples.map((sample) => sample.cpuSystemMs)),
      cpuUserMs: quantiles(samples.map((sample) => sample.cpuUserMs)),
      wallMs: quantiles(samples.map((sample) => sample.wallMs))
    })
  });
}

async function runRealPath(
  graph: TaskGraph,
  maxParallel: number,
  policy: Parameters<typeof runTaskGraph<boolean>>[0]["admissionPolicy"]
): Promise<void> {
  const result = await runTaskGraph<boolean>({
    ...(policy === undefined ? {} : { admissionPolicy: policy }),
    execute: () => true,
    graph,
    maxParallel
  });
  if (result.settlements.length !== graph.tasks.length)
    throw new Error("real path did not settle fixture");
}

function retainedHeap<S extends PrototypeState>(
  representation: RepresentationName,
  id: "dfs-retained-branches" | "bfs-retained-branches",
  model: Prototype<S>
): Readonly<Record<string, unknown>> {
  const gc = (Bun as unknown as { gc?: (full?: boolean) => void }).gc;
  if (typeof gc !== "function")
    return Object.freeze({
      id,
      representation,
      status: "unavailable",
      reason: "Bun.gc is unavailable"
    });
  gc(true);
  const before = process.memoryUsage().heapUsed;
  const retained =
    id === "dfs-retained-branches" ? retainDepthFirst(model) : retainBreadthFirst(model);
  gc(true);
  const after = process.memoryUsage().heapUsed;
  sink.value += retained.length;
  return Object.freeze({
    id,
    representation,
    retainedBranchCount: retained.length,
    retainedHeapDeltaBytes: after - before,
    status: "observed"
  });
}

function retainDepthFirst<S extends PrototypeState>(model: Prototype<S>): S[] {
  const retained: S[] = [];
  const visit = (state: S, depth: number): void => {
    retained.push(state);
    if (depth === manifest.profile.searchDepth) return;
    for (const taskIndex of [depth * 2, depth * 2 + 1]) {
      const running = requireSuccess(model.select(state, taskIndex), "DFS select");
      visit(requireSuccess(model.settle(running, taskIndex, "satisfied"), "DFS settle"), depth + 1);
    }
  };
  visit(model.initial, 0);
  return retained;
}

function retainBreadthFirst<S extends PrototypeState>(model: Prototype<S>): S[] {
  let frontier: S[] = [model.initial];
  const retained: S[] = [...frontier];
  for (let depth = 0; depth < manifest.profile.searchDepth; depth += 1) {
    const next: S[] = [];
    for (const state of frontier) {
      for (const taskIndex of [depth * 2, depth * 2 + 1]) {
        const running = requireSuccess(model.select(state, taskIndex), "BFS select");
        next.push(requireSuccess(model.settle(running, taskIndex, "satisfied"), "BFS settle"));
      }
    }
    retained.push(...next);
    frontier = next;
  }
  return retained;
}

function runPrototypeScenarios<S extends PrototypeState>(
  representation: RepresentationName,
  model: Prototype<S>,
  graph: CompiledFixture,
  fanoutModel: Prototype<S>
): readonly ScenarioResult[] {
  const genericIterations = manifest.profile.prototypeIterationsPerSample;
  const scenarios: ScenarioResult[] = [];
  scenarios.push(
    scenarioSync("inspection", representation, genericIterations, () => {
      const state = settledState(model);
      for (let index = 0; index < genericIterations; index += 1) sink.value += model.inspect(state);
    })
  );
  scenarios.push(
    scenarioSync(
      "catalog-cold",
      representation,
      manifest.profile.catalogIterationsPerSample,
      () => {
        for (let index = 0; index < manifest.profile.catalogIterationsPerSample; index += 1)
          sink.value += model.catalog(settledState(model));
      }
    )
  );
  scenarios.push(
    scenarioSync(
      "catalog-warm",
      representation,
      manifest.profile.catalogIterationsPerSample,
      () => {
        const state = settledState(model);
        for (let index = 0; index < manifest.profile.catalogIterationsPerSample; index += 1)
          sink.value += model.catalog(state);
      }
    )
  );
  scenarios.push(
    scenarioSync(
      "repeated-validate",
      representation,
      manifest.profile.validationIterationsPerSample,
      () => {
        const state = settledState(model);
        for (let index = 0; index < manifest.profile.validationIterationsPerSample; index += 1)
          sink.value += Number(model.validate(state, (index + 16) % graph.idByIndex.length));
      }
    )
  );
  scenarios.push(
    scenarioSync("select-settle", representation, genericIterations, () => {
      let state = model.initial;
      for (let index = 0; index < genericIterations; index += 1) {
        const taskIndex = runnableIndex(model, state, index % graph.idByIndex.length);
        const running = requireSuccess(model.select(state, taskIndex), "select-settle select");
        state = requireSuccess(
          model.settle(running, taskIndex, "satisfied"),
          "select-settle settle"
        );
      }
      sink.value += model.inspect(state);
    })
  );
  scenarios.push(
    scenarioSync(
      "same-predecessor-fork",
      representation,
      manifest.profile.samePredecessorForksPerSample,
      () => {
        const predecessor = model.initial;
        const successors: S[] = [];
        for (let index = 0; index < manifest.profile.samePredecessorForksPerSample; index += 1)
          successors.push(
            requireSuccess(model.select(predecessor, index % 8), "same-predecessor fork")
          );
        sink.value += successors.length;
      }
    )
  );
  scenarios.push(
    scenarioSync("high-fanout", representation, genericIterations, () => {
      const root = requireSuccess(fanoutModel.select(fanoutModel.initial, 0), "fanout root select");
      const blocked = requireSuccess(
        fanoutModel.settle(root, 0, "unsatisfied"),
        "fanout root settle"
      );
      for (let index = 0; index < genericIterations; index += 1) {
        sink.value += fanoutModel.catalog(blocked);
        sink.value += Number(fanoutModel.validate(blocked, 1 + (index % 255)));
      }
    })
  );
  return Object.freeze(scenarios);
}

function summaryMarkdown(
  results: readonly ScenarioResult[],
  retained: readonly Readonly<Record<string, unknown>>[],
  choice: string
): string {
  const rows = results
    .map(
      (result) =>
        `| ${result.representation} | ${result.id} | ${result.iterationsPerSample} | ${result.stats.wallMs.p50} | ${result.stats.wallMs.p95} | ${result.stats.cpuUserMs.p50} | ${result.stats.allocationProxyHeapDeltaBytes.p50} |`
    )
    .join("\n");
  return (
    `# Admission-state benchmark summary\n\n` +
    `- Command: \`${manifest.command}\`\n` +
    `- Fixture seed: \`${manifest.seed}\`; warmup/measured samples: ${manifest.profile.warmupSamples}/${manifest.profile.measuredSamples}.\n` +
    `- The three named representations remain readiness prototypes. Implementation rows exercise the shipped parent+delta public state; real static/custom/learned rows verify their unused-state path.\n` +
    `- The implementation fixed-depth setup is timed separately. Inspection, warm catalog, repeated validation, and high-fanout rows reuse prebuilt immutable states so their timed operation excludes state construction.\n` +
    `- Allocation is a \`heapUsed\` delta proxy, not an allocation counter. Retained heap is process-wide, GC-dependent and advisory.\n\n` +
    `## Results\n\n` +
    `| Representation | Scenario | Iterations/sample | wall p50 ms | wall p95 ms | CPU user p50 ms | heap-delta proxy p50 bytes |\n` +
    `| --- | --- | ---: | ---: | ---: | ---: | ---: |\n${rows}\n\n` +
    `## Retained heap observation\n\n\`\`\`json\n${JSON.stringify(retained, null, 2)}\n\`\`\`\n\n` +
    `## Representation decision\n\n${choice}\n\n` +
    `The raw samples, environment, fixture descriptions, method and limitations are in [admission-state-benchmark.raw.json](admission-state-benchmark.raw.json) and [admission-state-benchmark.manifest.json](admission-state-benchmark.manifest.json).\n`
  );
}

function acceptedPublicState(result: ReturnType<AdmissionState["select"]>): AdmissionState {
  if (!result.accepted)
    throw new Error(`public benchmark transition rejected: ${result.reason.kind}`);
  return result.state;
}

function publicStateAfterSettlements(
  graph: ReturnType<typeof createAdmissionGraph>
): AdmissionState {
  let state = graph.initialState();
  for (let index = 0; index < 8; index += 1) {
    const taskId = state.catalog.selectableTaskIds[0];
    if (taskId === undefined) throw new Error("public benchmark fixture became undrainable");
    state = acceptedPublicState(state.select(taskId));
    state = acceptedPublicState(state.settle(taskId, "satisfied"));
  }
  return state;
}

function runImplementationScenarios(
  graph: ReturnType<typeof createAdmissionGraph>,
  fanout: ReturnType<typeof createAdmissionGraph>
): readonly ScenarioResult[] {
  const genericIterations = manifest.profile.prototypeIterationsPerSample;
  const fixedDepthState = publicStateAfterSettlements(graph);
  const fixedDepthTaskIds = fixedDepthState.catalog.selectableTaskIds;
  if (fixedDepthTaskIds.length === 0) {
    throw new Error("public benchmark fixed-depth state has no selectable Task");
  }
  const fanoutRoot = acceptedPublicState(fanout.initialState().select("root"));
  const fanoutBlocked = acceptedPublicState(fanoutRoot.settle("root", "unsatisfied"));
  const scenarios: ScenarioResult[] = [];
  scenarios.push(
    scenarioSync(
      "fixed-depth-state-setup",
      "implementation-parent-delta",
      genericIterations,
      () => {
        for (let index = 0; index < genericIterations; index += 1) {
          const state = publicStateAfterSettlements(graph);
          sink.value += Number(Object.isFrozen(state));
        }
      }
    )
  );
  scenarios.push(
    scenarioSync("inspection", "implementation-parent-delta", genericIterations, () => {
      for (let index = 0; index < genericIterations; index += 1)
        sink.value += fixedDepthState.inspection.runningTaskIds.length;
    })
  );
  scenarios.push(
    scenarioSync(
      "catalog-cold",
      "implementation-parent-delta",
      manifest.profile.catalogIterationsPerSample,
      () => {
        for (let index = 0; index < manifest.profile.catalogIterationsPerSample; index += 1)
          sink.value += graph.initialState().catalog.selectableTaskIds.length;
      }
    )
  );
  scenarios.push(
    scenarioSync(
      "catalog-warm",
      "implementation-parent-delta",
      manifest.profile.catalogIterationsPerSample,
      () => {
        for (let index = 0; index < manifest.profile.catalogIterationsPerSample; index += 1)
          sink.value += fixedDepthState.catalog.selectableTaskIds.length;
      }
    )
  );
  scenarios.push(
    scenarioSync(
      "repeated-validate",
      "implementation-parent-delta",
      manifest.profile.validationIterationsPerSample,
      () => {
        for (let index = 0; index < manifest.profile.validationIterationsPerSample; index += 1)
          sink.value += Number(
            fixedDepthState.validateSelection(
              fixedDepthTaskIds[index % fixedDepthTaskIds.length] ?? "missing"
            ).accepted
          );
      }
    )
  );
  scenarios.push(
    scenarioSync("select-settle", "implementation-parent-delta", genericIterations, () => {
      let state = graph.initialState();
      for (let index = 0; index < genericIterations; index += 1) {
        const taskId = state.catalog.selectableTaskIds[0];
        if (taskId === undefined)
          throw new Error("public benchmark select-settle became undrainable");
        state = acceptedPublicState(state.select(taskId));
        state = acceptedPublicState(state.settle(taskId, "satisfied"));
      }
      sink.value += state.inspection.settledTasks.length;
    })
  );
  scenarios.push(
    scenarioSync(
      "same-predecessor-fork",
      "implementation-parent-delta",
      manifest.profile.samePredecessorForksPerSample,
      () => {
        const predecessor = graph.initialState();
        const taskIds = predecessor.catalog.selectableTaskIds.slice(0, 8);
        const branches: AdmissionState[] = [];
        for (let index = 0; index < manifest.profile.samePredecessorForksPerSample; index += 1) {
          const taskId = taskIds[index % taskIds.length];
          if (taskId === undefined) throw new Error("public benchmark lacks branch task");
          branches.push(acceptedPublicState(predecessor.select(taskId)));
        }
        sink.value += branches.length;
      }
    )
  );
  scenarios.push(
    scenarioSync("high-fanout", "implementation-parent-delta", genericIterations, () => {
      for (let index = 0; index < genericIterations; index += 1) {
        sink.value += fanoutBlocked.catalog.nonSelectableTasks.length;
        sink.value += Number(
          fanoutBlocked.validateSelection(`dependent-${String(index % 255).padStart(3, "0")}`)
            .accepted
        );
      }
    })
  );
  return Object.freeze(scenarios);
}

function retainedImplementationHeap(
  id: "dfs-retained-branches" | "bfs-retained-branches",
  graph: ReturnType<typeof createAdmissionGraph>
): Readonly<Record<string, unknown>> {
  const gc = (Bun as unknown as { gc?: (full?: boolean) => void }).gc;
  if (typeof gc !== "function") {
    return Object.freeze({
      id,
      reason: "Bun.gc is unavailable",
      representation: "implementation-parent-delta",
      status: "unavailable"
    });
  }
  gc(true);
  const before = process.memoryUsage().heapUsed;
  const retained =
    id === "dfs-retained-branches"
      ? retainImplementationDepthFirst(graph)
      : retainImplementationBreadthFirst(graph);
  gc(true);
  const after = process.memoryUsage().heapUsed;
  sink.value += retained.length;
  return Object.freeze({
    id,
    representation: "implementation-parent-delta",
    retainedBranchCount: retained.length,
    retainedHeapDeltaBytes: after - before,
    status: "observed"
  });
}

function retainImplementationDepthFirst(
  graph: ReturnType<typeof createAdmissionGraph>
): AdmissionState[] {
  const retained: AdmissionState[] = [];
  const visit = (state: AdmissionState, depth: number): void => {
    retained.push(state);
    if (depth === manifest.profile.searchDepth) return;
    for (const taskId of state.catalog.selectableTaskIds.slice(0, 2)) {
      const running = acceptedPublicState(state.select(taskId));
      visit(acceptedPublicState(running.settle(taskId, "satisfied")), depth + 1);
    }
  };
  visit(graph.initialState(), 0);
  return retained;
}

function retainImplementationBreadthFirst(
  graph: ReturnType<typeof createAdmissionGraph>
): AdmissionState[] {
  let frontier: AdmissionState[] = [graph.initialState()];
  const retained: AdmissionState[] = [...frontier];
  for (let depth = 0; depth < manifest.profile.searchDepth; depth += 1) {
    const next: AdmissionState[] = [];
    for (const state of frontier) {
      for (const taskId of state.catalog.selectableTaskIds.slice(0, 2)) {
        const running = acceptedPublicState(state.select(taskId));
        next.push(acceptedPublicState(running.settle(taskId, "satisfied")));
      }
    }
    retained.push(...next);
    frontier = next;
  }
  return retained;
}

const realGraph = createLayeredGraph(96, 12);
const prototypeGraph = compilePrototype(createLayeredGraph(256, 16), 8);
const fanoutGraph = compilePrototype(createHighFanoutGraph(), 8);
const plannedRealGraph = prepareTaskGraph(realGraph, 8);
const implementationGraph = createAdmissionGraph({
  graph: prepareTaskGraph(createLayeredGraph(256, 16), 8).schedulerGraphSnapshot,
  maxParallel: 8
});
const implementationFanoutGraph = createAdmissionGraph({
  graph: prepareTaskGraph(createHighFanoutGraph(), 8).schedulerGraphSnapshot,
  maxParallel: 8
});
const learnedPolicy = createLearnedCriticalPathAdmission(
  plannedRealGraph.schedulerGraphSnapshot,
  Object.freeze({
    predictions: Object.freeze(
      plannedRealGraph.tasks.map((task, index) =>
        Object.freeze({ estimatedDurationMs: 1 + (index % 7), taskId: task.id })
      )
    )
  })
).admissionPolicy;
const customPolicy = admissionSelectionPolicyFor((context) => {
  const selected = context.candidates.find((candidate) => candidate.canAdmit);
  return selected === undefined
    ? Object.freeze({ kind: "wait" as const })
    : Object.freeze({ kind: "select" as const, taskId: selected.taskId });
});

const scenarios: ScenarioResult[] = [];
scenarios.push(
  scenarioSync(
    "compile",
    "current-real-shell",
    manifest.profile.prototypeIterationsPerSample,
    () => {
      for (let index = 0; index < manifest.profile.prototypeIterationsPerSample; index += 1)
        sink.value += prepareTaskGraph(realGraph, 8).tasks.length;
    }
  )
);
scenarios.push(
  await scenarioAsync(
    "real-static-unused-state-hot-path",
    manifest.profile.realRunIterationsPerSample,
    async () => {
      for (let index = 0; index < manifest.profile.realRunIterationsPerSample; index += 1)
        await runRealPath(realGraph, 8, undefined);
    }
  )
);
scenarios.push(
  await scenarioAsync(
    "real-custom-unused-state-hot-path",
    manifest.profile.realRunIterationsPerSample,
    async () => {
      for (let index = 0; index < manifest.profile.realRunIterationsPerSample; index += 1)
        await runRealPath(realGraph, 8, customPolicy);
    }
  )
);
scenarios.push(
  await scenarioAsync(
    "real-learned-unused-state-hot-path",
    manifest.profile.realRunIterationsPerSample,
    async () => {
      for (let index = 0; index < manifest.profile.realRunIterationsPerSample; index += 1)
        await runRealPath(realGraph, 8, learnedPolicy);
    }
  )
);
scenarios.push(...runImplementationScenarios(implementationGraph, implementationFanoutGraph));

const factories: readonly Readonly<{
  readonly create: (graph: CompiledFixture) => Prototype<PrototypeState>;
  readonly representation: RepresentationName;
}>[] = [
  {
    create: fullClonePrototype as (graph: CompiledFixture) => Prototype<PrototypeState>,
    representation: "full-clone-map-set"
  },
  {
    create: parentDeltaPrototype as (graph: CompiledFixture) => Prototype<PrototypeState>,
    representation: "parent-delta"
  },
  {
    create: denseCowPrototype as (graph: CompiledFixture) => Prototype<PrototypeState>,
    representation: "dense-id-chunked-cow"
  }
];
const retained: Readonly<Record<string, unknown>>[] = [];
for (const entry of factories) {
  const model = entry.create(prototypeGraph);
  const fanoutModel = entry.create(fanoutGraph);
  scenarios.push(
    ...runPrototypeScenarios(entry.representation, model, prototypeGraph, fanoutModel)
  );
  retained.push(retainedHeap(entry.representation, "dfs-retained-branches", model));
  retained.push(retainedHeap(entry.representation, "bfs-retained-branches", model));
}
retained.push(retainedImplementationHeap("dfs-retained-branches", implementationGraph));
retained.push(retainedImplementationHeap("bfs-retained-branches", implementationGraph));

const representationRows = Object.fromEntries(
  factories.map((entry) => [
    entry.representation,
    Object.fromEntries(
      scenarios
        .filter((scenario) => scenario.representation === entry.representation)
        .map((scenario) => [scenario.id, scenario.stats.wallMs])
    )
  ])
);
const decision =
  "The Plan retains `parent+delta` as the simplest representation that satisfies immutable predecessor retention and successor-only branching. The separately timed fixed-depth setup and target-operation rows do not establish parent-chain lookup as a dominant cost, so they do not justify private compaction or a dense fallback. Dense chunked COW remains an evidence-gated fallback; full-clone Map/Set remains rejected because successor transitions copy the whole dynamic collection.";
const raw = Object.freeze({
  schemaVersion: 1,
  command: manifest.command,
  generatedAt: new Date().toISOString(),
  environment: Object.freeze({
    bunVersion: Bun.version,
    cpu: cpus(),
    os: Object.freeze({
      architecture: process.arch,
      platform: platform(),
      release: release(),
      totalMemoryBytes: totalmem(),
      type: type()
    }),
    pid: process.pid
  }),
  fixtureSeed: manifest.seed,
  fixtureDescriptions: manifest.fixtures,
  measurement: Object.freeze({
    allocation: "heapUsed delta around each batch without forced GC; proxy only",
    implementationTargetOperations:
      "fixed-depth setup is measured separately; inspection, warm catalog, repeated validation, and high-fanout reuse prebuilt immutable states",
    retainedHeap:
      "Bun.gc(true) before/after live retained branches when available; process-wide advisory observation",
    warmupSamples: manifest.profile.warmupSamples,
    measuredSamples: manifest.profile.measuredSamples
  }),
  implementationPublicStateMeasured: true,
  publicStateInstantiatedByRealBaseline: false,
  scenarios: Object.freeze(scenarios),
  retainedHeap: Object.freeze(retained),
  representationP50P95WallMs: representationRows,
  coverage: Object.freeze({
    timedScenarioIds: Object.freeze(scenarios.map((scenario) => scenario.id)),
    retainedHeapScenarioIds: Object.freeze(retained.map((observation) => observation.id))
  }),
  sink: sink.value
});
await mkdir(here, { recursive: true });
await writeFile(rawResultPath, `${JSON.stringify(raw, null, 2)}\n`);
await writeFile(summaryPath, summaryMarkdown(scenarios, retained, decision));
console.log(`wrote ${rawResultPath}`);
console.log(`wrote ${summaryPath}`);
