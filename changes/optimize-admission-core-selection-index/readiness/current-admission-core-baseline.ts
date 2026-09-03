import { cpus, platform, release, totalmem, type } from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import type { AdmissionState } from "../../../src/index.ts";
import { createAdmissionGraph } from "../../../src/index.ts";
import {
  admissionCandidatesForCore,
  compilePreparedAdmissionGraph,
  createInitialAdmissionCoreState,
  selectAdmissionCore,
  settleRunningAdmissionCore,
  type AdmissionCoreState,
  type CompiledAdmissionGraph,
} from "../../../src/project-run/task-scheduler/admission-core.ts";
import { admissionSelectionPolicyFor } from "../../../src/project-run/task-scheduler/custom-admission-policy.ts";
import {
  prepareTaskGraph,
  type TaskGraph,
} from "../../../src/project-run/task-scheduler/graph.ts";
import { createLearnedCriticalPathAdmission } from "../../../src/project-run/task-scheduler/learned-critical-path-admission-policy.ts";
import { runTaskGraph } from "../../../src/project-run/task-scheduler/scheduler.ts";

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(
  here,
  "current-admission-core-baseline.manifest.json",
);
const manifest = JSON.parse(
  await readFile(manifestPath, "utf8"),
) as BenchmarkManifest;
const isProfileRun = process.argv.includes("--profile");
const rawPath = resolve(
  here,
  isProfileRun
    ? "current-admission-core-profile.raw.json"
    : "current-admission-core-baseline.raw.json",
);
const summaryPath = resolve(
  here,
  isProfileRun
    ? "current-admission-core-profile.summary.md"
    : "current-admission-core-baseline.summary.md",
);
let sink = 0;

type Topology = "independent" | "layered" | "mutex" | "scope" | "high-fanout";
type Operation =
  | "scheduler-candidates"
  | "catalog"
  | "validate-selection"
  | "select"
  | "settle"
  | "fork"
  | "forced-block-settle"
  | "real-static-unused-public-state"
  | "real-custom-unused-public-state"
  | "real-learned-unused-public-state";

type Quantiles = Readonly<{ readonly p50: number; readonly p95: number }>;
type Sample = Readonly<{
  readonly cpuSystemMs: number;
  readonly cpuUserMs: number;
  readonly heapDeltaBytes: number;
  readonly wallMs: number;
}>;
type Scenario = Readonly<{
  readonly depthTransitions: number | null;
  readonly forcedBlockedCount: number | null;
  readonly id: string;
  readonly iterationsPerSample: number;
  readonly operation: Operation;
  readonly samples: readonly Sample[];
  readonly stats: Readonly<{
    readonly cpuSystemMs: Quantiles;
    readonly cpuUserMs: Quantiles;
    readonly heapDeltaBytes: Quantiles;
    readonly wallMs: Quantiles;
  }>;
  readonly taskCount: number;
  readonly topology: Topology | "real-mixed";
}>;
type BenchmarkManifest = Readonly<{
  readonly command: string;
  readonly profile: Readonly<{
    readonly depthTransitions: readonly number[];
    readonly iterationsPerSample: Readonly<Record<string, number>>;
    readonly measuredSamples: number;
    readonly profiledWorkload: string;
    readonly warmupSamples: number;
  }>;
  readonly profileCommand: string;
  readonly requiredCoverage: Readonly<{
    readonly operations: readonly Operation[];
    readonly realPaths: readonly Operation[];
    readonly taskCounts: readonly number[];
    readonly topologies: readonly Topology[];
  }>;
  readonly seed: number;
}>;

interface PreparedFixture {
  readonly compiled: CompiledAdmissionGraph;
  readonly graph: ReturnType<typeof createAdmissionGraph>;
  readonly source: TaskGraph;
  readonly topology: Topology;
}

function taskId(index: number): string {
  return `task-${String(index).padStart(4, "0")}`;
}

function graphFor(topology: Topology, taskCount: number): TaskGraph {
  if (topology === "high-fanout") {
    return {
      tasks: [
        { id: "root" },
        ...Array.from({ length: taskCount - 1 }, (_, index) => ({
          dependsOn: ["root"],
          id: `dependent-${String(index).padStart(4, "0")}`,
        })),
      ],
    };
  }
  if (topology === "layered") {
    const width = Math.min(16, taskCount);
    return {
      tasks: Array.from({ length: taskCount }, (_, index) => ({
        dependsOn: index < width ? [] : [taskId(index - width)],
        id: taskId(index),
        observes:
          index < width * 2 || index % 3 !== 0
            ? []
            : [taskId(index - width * 2)],
      })),
    };
  }
  if (topology === "mutex") {
    return {
      tasks: Array.from({ length: taskCount }, (_, index) => ({
        id: taskId(index),
        mutex: ["shared"],
      })),
    };
  }
  if (topology === "scope") {
    const terminal = taskId(taskCount - 1);
    return {
      scopes: [
        {
          activationTaskIds: [taskId(0)],
          id: "limited",
          maxParallel: 2,
          terminalTaskId: terminal,
        },
      ],
      tasks: Array.from({ length: taskCount }, (_, index) => ({
        dependsOn:
          index === taskCount - 1
            ? Array.from({ length: taskCount - 1 }, (_, prerequisite) =>
                taskId(prerequisite),
              )
            : [],
        id: taskId(index),
        scopeId: "limited",
      })),
    };
  }
  return {
    tasks: Array.from({ length: taskCount }, (_, index) => ({
      id: taskId(index),
    })),
  };
}

function mixedRealGraph(): TaskGraph {
  const tasks = Array.from({ length: 96 }, (_, index) => {
    const id = taskId(index);
    return {
      dependsOn: index < 12 ? [] : [taskId(index - 12)],
      id,
      mutex: index % 10 === 0 ? ["ten"] : [],
      observes: index < 24 || index % 5 !== 0 ? [] : [taskId(index - 24)],
    };
  });
  return { tasks };
}

function preparedFixture(
  topology: Topology,
  taskCount: number,
): PreparedFixture {
  const source = graphFor(topology, taskCount);
  const planned = prepareTaskGraph(source, Math.min(8, taskCount));
  return Object.freeze({
    compiled: compilePreparedAdmissionGraph(planned, Math.min(8, taskCount)),
    graph: createAdmissionGraph({
      graph: planned.schedulerGraphSnapshot,
      maxParallel: Math.min(8, taskCount),
    }),
    source,
    topology,
  });
}

function acceptedState(
  result: ReturnType<AdmissionState["select"]>,
): AdmissionState {
  if (!result.accepted)
    throw new Error(
      `expected accepted state transition, received ${result.reason.kind}`,
    );
  return result.state;
}

function stateAtDepth(
  graph: ReturnType<typeof createAdmissionGraph>,
  transitions: number,
): AdmissionState {
  let state = graph.initialState();
  for (let index = 0; index < Math.floor(transitions / 2); index += 1) {
    const taskIdAtBoundary = state.catalog.selectableTaskIds[0];
    if (taskIdAtBoundary === undefined) {
      throw new Error(
        `fixture has no selectable task before requested depth ${transitions}`,
      );
    }
    state = acceptedState(state.select(taskIdAtBoundary));
    state = acceptedState(state.settle(taskIdAtBoundary, "satisfied"));
  }
  return state;
}

function coreAtDepth(
  compiled: CompiledAdmissionGraph,
  transitions: number,
): AdmissionCoreState {
  let state = createInitialAdmissionCoreState(compiled);
  for (let index = 0; index < Math.floor(transitions / 2); index += 1) {
    const task = admissionCandidatesForCore(state).find(
      (candidate) => candidate.canAdmit,
    )?.task;
    if (task === undefined)
      throw new Error(
        `core fixture has no candidate before depth ${transitions}`,
      );
    const selected = selectAdmissionCore(state, task.id);
    if (!selected.accepted)
      throw new Error(`core fixture rejected selected ${task.id}`);
    const settled = settleRunningAdmissionCore(
      selected.transition.state,
      task.id,
      "completed",
    );
    if (!settled.accepted)
      throw new Error(`core fixture rejected settlement ${task.id}`);
    state = settled.transition.state;
  }
  return state;
}

function nextSelectable(state: AdmissionState): string {
  const id = state.catalog.selectableTaskIds[0];
  if (id === undefined) throw new Error("fixture state has no selectable task");
  return id;
}

function quantiles(values: readonly number[]): Quantiles {
  const ordered = [...values].sort((left, right) => left - right);
  if (ordered.length === 0)
    throw new Error("cannot derive quantiles from no samples");
  const at = (fraction: number): number =>
    ordered[
      Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)
    ] ?? 0;
  return Object.freeze({ p50: at(0.5), p95: at(0.95) });
}

function sampleSync(operation: () => void): Sample {
  const beforeCpu = process.cpuUsage();
  const beforeHeap = process.memoryUsage().heapUsed;
  const started = performance.now();
  operation();
  const wallMs = performance.now() - started;
  const cpu = process.cpuUsage(beforeCpu);
  const afterHeap = process.memoryUsage().heapUsed;
  return Object.freeze({
    cpuSystemMs: cpu.system / 1000,
    cpuUserMs: cpu.user / 1000,
    heapDeltaBytes: afterHeap - beforeHeap,
    wallMs,
  });
}

async function sampleAsync(operation: () => Promise<void>): Promise<Sample> {
  const beforeCpu = process.cpuUsage();
  const beforeHeap = process.memoryUsage().heapUsed;
  const started = performance.now();
  await operation();
  const wallMs = performance.now() - started;
  const cpu = process.cpuUsage(beforeCpu);
  const afterHeap = process.memoryUsage().heapUsed;
  return Object.freeze({
    cpuSystemMs: cpu.system / 1000,
    cpuUserMs: cpu.user / 1000,
    heapDeltaBytes: afterHeap - beforeHeap,
    wallMs,
  });
}

function measuredSync(
  id: string,
  topology: Scenario["topology"],
  taskCount: number,
  depthTransitions: number | null,
  operation: Operation,
  iterationsPerSample: number,
  callback: () => void,
  forcedBlockedCount: number | null = null,
): Scenario {
  for (let index = 0; index < manifest.profile.warmupSamples; index += 1)
    callback();
  const samples = Array.from({ length: manifest.profile.measuredSamples }, () =>
    sampleSync(callback),
  );
  return Object.freeze({
    depthTransitions,
    forcedBlockedCount,
    id,
    iterationsPerSample,
    operation,
    samples: Object.freeze(samples),
    stats: Object.freeze({
      cpuSystemMs: quantiles(samples.map((sample) => sample.cpuSystemMs)),
      cpuUserMs: quantiles(samples.map((sample) => sample.cpuUserMs)),
      heapDeltaBytes: quantiles(samples.map((sample) => sample.heapDeltaBytes)),
      wallMs: quantiles(samples.map((sample) => sample.wallMs)),
    }),
    taskCount,
    topology,
  });
}

async function measuredAsync(
  id: string,
  taskCount: number,
  operation: Operation,
  iterationsPerSample: number,
  callback: () => Promise<void>,
): Promise<Scenario> {
  for (let index = 0; index < manifest.profile.warmupSamples; index += 1)
    await callback();
  const samples: Sample[] = [];
  for (let index = 0; index < manifest.profile.measuredSamples; index += 1)
    samples.push(await sampleAsync(callback));
  return Object.freeze({
    depthTransitions: null,
    forcedBlockedCount: null,
    id,
    iterationsPerSample,
    operation,
    samples: Object.freeze(samples),
    stats: Object.freeze({
      cpuSystemMs: quantiles(samples.map((sample) => sample.cpuSystemMs)),
      cpuUserMs: quantiles(samples.map((sample) => sample.cpuUserMs)),
      heapDeltaBytes: quantiles(samples.map((sample) => sample.heapDeltaBytes)),
      wallMs: quantiles(samples.map((sample) => sample.wallMs)),
    }),
    taskCount,
    topology: "real-mixed",
  });
}

function operationRows(
  fixture: PreparedFixture,
  taskCount: number,
  depthTransitions: number,
): readonly Scenario[] {
  const state = stateAtDepth(fixture.graph, depthTransitions);
  const core = coreAtDepth(fixture.compiled, depthTransitions);
  const target = nextSelectable(state);
  const running = acceptedState(state.select(target));
  const iterations = manifest.profile.iterationsPerSample[String(taskCount)];
  if (iterations === undefined)
    throw new Error(`missing iteration count for ${taskCount}`);
  const base = `${fixture.topology}-t${taskCount}-d${depthTransitions}`;
  return Object.freeze([
    measuredSync(
      `${base}-scheduler-candidates`,
      fixture.topology,
      taskCount,
      depthTransitions,
      "scheduler-candidates",
      iterations,
      () => {
        for (let index = 0; index < iterations; index += 1)
          sink += admissionCandidatesForCore(core).length;
      },
    ),
    measuredSync(
      `${base}-catalog`,
      fixture.topology,
      taskCount,
      depthTransitions,
      "catalog",
      iterations,
      () => {
        for (let index = 0; index < iterations; index += 1)
          sink +=
            state.catalog.selectableTaskIds.length +
            state.catalog.nonSelectableTasks.length;
      },
    ),
    measuredSync(
      `${base}-validate-selection`,
      fixture.topology,
      taskCount,
      depthTransitions,
      "validate-selection",
      iterations,
      () => {
        for (let index = 0; index < iterations; index += 1)
          sink += Number(state.validateSelection(target).accepted);
      },
    ),
    measuredSync(
      `${base}-select`,
      fixture.topology,
      taskCount,
      depthTransitions,
      "select",
      iterations,
      () => {
        for (let index = 0; index < iterations; index += 1)
          sink += Number(state.select(target).accepted);
      },
    ),
    measuredSync(
      `${base}-settle`,
      fixture.topology,
      taskCount,
      depthTransitions,
      "settle",
      iterations,
      () => {
        for (let index = 0; index < iterations; index += 1)
          sink += Number(running.settle(target, "satisfied").accepted);
      },
    ),
    measuredSync(
      `${base}-fork`,
      fixture.topology,
      taskCount,
      depthTransitions,
      "fork",
      iterations,
      () => {
        const branches: AdmissionState[] = [];
        for (let index = 0; index < iterations; index += 1)
          branches.push(acceptedState(state.select(target)));
        sink += branches.length;
      },
    ),
  ]);
}

function forcedBlockRow(taskCount: number): Scenario {
  const fixture = preparedFixture("high-fanout", taskCount);
  const selected = selectAdmissionCore(
    createInitialAdmissionCoreState(fixture.compiled),
    "root",
  );
  if (!selected.accepted)
    throw new Error("high-fanout root was not selectable");
  const preview = settleRunningAdmissionCore(
    selected.transition.state,
    "root",
    "failed",
  );
  if (!preview.accepted) throw new Error("high-fanout root failed to settle");
  const forcedBlockedCount = preview.transition.effects.filter(
    (effect) =>
      effect.kind === "settled" && effect.settlementKind === "blocked",
  ).length;
  const iterations = manifest.profile.iterationsPerSample[String(taskCount)];
  if (iterations === undefined)
    throw new Error(`missing forced-block iteration count for ${taskCount}`);
  return measuredSync(
    `high-fanout-t${taskCount}-forced-block-settle`,
    "high-fanout",
    taskCount,
    2,
    "forced-block-settle",
    iterations,
    () => {
      for (let index = 0; index < iterations; index += 1) {
        const root = selectAdmissionCore(
          createInitialAdmissionCoreState(fixture.compiled),
          "root",
        );
        if (!root.accepted)
          throw new Error("high-fanout root selection became invalid");
        const transition = settleRunningAdmissionCore(
          root.transition.state,
          "root",
          "failed",
        );
        if (!transition.accepted)
          throw new Error("high-fanout root settlement became invalid");
        sink += transition.transition.effects.length;
      }
    },
    forcedBlockedCount,
  );
}

async function realRows(): Promise<readonly Scenario[]> {
  const graph = mixedRealGraph();
  const maxParallel = 8;
  const planned = prepareTaskGraph(graph, maxParallel);
  const custom = admissionSelectionPolicyFor((context) => {
    const candidate = context.candidates.find((value) => value.canAdmit);
    return candidate === undefined
      ? Object.freeze({ kind: "wait" as const })
      : Object.freeze({ kind: "select" as const, taskId: candidate.taskId });
  });
  const learned = createLearnedCriticalPathAdmission(
    planned.schedulerGraphSnapshot,
    Object.freeze({
      predictions: Object.freeze(
        planned.tasks.map((task, index) =>
          Object.freeze({
            estimatedDurationMs: 1 + (index % 7),
            taskId: task.id,
          }),
        ),
      ),
    }),
  ).admissionPolicy;
  const iterations = 2;
  const row = async (
    operation: Extract<Operation, `real-${string}`>,
    policy: typeof custom | undefined,
  ): Promise<Scenario> =>
    measuredAsync(
      `real-mixed-${operation}`,
      96,
      operation,
      iterations,
      async () => {
        for (let index = 0; index < iterations; index += 1) {
          const run = await runTaskGraph({
            admissionPolicy: policy,
            execute: (task) => task.id,
            graph,
            maxParallel,
          });
          sink += run.settlements.length;
        }
      },
    );
  return Object.freeze([
    await row("real-static-unused-public-state", undefined),
    await row("real-custom-unused-public-state", custom),
    await row("real-learned-unused-public-state", learned),
  ]);
}

function profiledRows(): readonly Scenario[] {
  const fixture = preparedFixture("independent", 1024);
  const state = stateAtDepth(fixture.graph, 16);
  const core = coreAtDepth(fixture.compiled, 16);
  const iterations = 16;
  return Object.freeze([
    measuredSync(
      "profile-independent-t1024-d16-catalog",
      "independent",
      1024,
      16,
      "catalog",
      iterations,
      () => {
        for (let index = 0; index < iterations; index += 1)
          sink += state.catalog.selectableTaskIds.length;
      },
    ),
    measuredSync(
      "profile-independent-t1024-d16-scheduler-candidates",
      "independent",
      1024,
      16,
      "scheduler-candidates",
      iterations,
      () => {
        for (let index = 0; index < iterations; index += 1)
          sink += admissionCandidatesForCore(core).length;
      },
    ),
  ]);
}

function assertCoverage(scenarios: readonly Scenario[]): void {
  const operations = new Set(scenarios.map((scenario) => scenario.operation));
  const topologies = new Set(scenarios.map((scenario) => scenario.topology));
  const taskCounts = new Set(scenarios.map((scenario) => scenario.taskCount));
  for (const operation of [
    ...manifest.requiredCoverage.operations,
    ...manifest.requiredCoverage.realPaths,
  ]) {
    if (!operations.has(operation))
      throw new Error(`scenario closure missing operation ${operation}`);
  }
  for (const topology of manifest.requiredCoverage.topologies) {
    if (!topologies.has(topology))
      throw new Error(`scenario closure missing topology ${topology}`);
  }
  for (const taskCount of manifest.requiredCoverage.taskCounts) {
    if (!taskCounts.has(taskCount))
      throw new Error(`scenario closure missing task count ${taskCount}`);
  }
  if (
    !scenarios.some(
      (scenario) =>
        scenario.operation === "forced-block-settle" &&
        (scenario.forcedBlockedCount ?? 0) > 0,
    )
  ) {
    throw new Error(
      "scenario closure has no forced-block settlement with B > 0",
    );
  }
}

function summaryMarkdown(scenarios: readonly Scenario[]): string {
  const evidenceKind = isProfileRun ? "profile" : "baseline";
  const status = isProfileRun
    ? "**before-only sampled profile**"
    : "**before-only baseline**";
  const rows = scenarios
    .map(
      (scenario) =>
        `| ${scenario.id} | ${scenario.taskCount} | ${scenario.topology} | ${scenario.depthTransitions ?? "—"} | ${scenario.operation} | ${scenario.forcedBlockedCount ?? "—"} | ${scenario.iterationsPerSample} | ${scenario.stats.wallMs.p50.toFixed(3)} | ${scenario.stats.wallMs.p95.toFixed(3)} | ${scenario.stats.cpuUserMs.p50.toFixed(3)} | ${scenario.stats.cpuSystemMs.p50.toFixed(3)} | ${scenario.stats.heapDeltaBytes.p50} |`,
    )
    .join("\n");
  return (
    `# Current admission-core ${evidenceKind}\n\n` +
    `- Status: ${status} at git commit \`${gitCommit()}\`; no product runtime or test was changed by this Change.\n` +
    `- Command: \`${manifest.command}\`; seed: \`${manifest.seed}\`; warmup/measured samples: ${manifest.profile.warmupSamples}/${manifest.profile.measuredSamples}.\n` +
    `- CPU profile command: \`${manifest.profileCommand}\`; profiled workload: ${manifest.profile.profiledWorkload}.\n` +
    `- A row is a batch. Divide wall/CPU by iterations only for a per-operation approximation; p50/p95 remain batch quantiles.\n` +
    `- heap delta is a process-wide live-heap proxy without forced GC, not an allocation or retained-object measurement.\n\n` +
    `## Results\n\n` +
    `| Scenario | T | topology | D transitions | B | operation | iterations/sample | wall p50 ms | wall p95 ms | CPU user p50 ms | CPU system p50 ms | heap-delta proxy p50 bytes |\n` +
    `| --- | ---: | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${rows}\n\n` +
    `## Reading boundary\n\n` +
    `The rows identify current scaling and sampled hot paths. They do not prove a future representation's benefit, form a cross-host budget, or turn heap proxy into allocation evidence. Candidate selection must use these before data together with a semantically complete after workload.\n`
  );
}

function gitCommit(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: resolve(here, "../../.."),
    encoding: "utf8",
  }).trim();
}

const scenarios: Scenario[] = isProfileRun
  ? [...profiledRows()]
  : [...(await realRows())];
if (!isProfileRun) {
  for (const taskCount of manifest.requiredCoverage.taskCounts) {
    const fixture = preparedFixture("independent", taskCount);
    const depths =
      taskCount <= 256 ? [0, 16, 48] : taskCount === 1024 ? [0, 16] : [0];
    for (const depth of depths)
      scenarios.push(...operationRows(fixture, taskCount, depth));
    if (taskCount <= 256) scenarios.push(forcedBlockRow(taskCount));
  }
  for (const topology of ["layered", "mutex", "scope"] as const) {
    scenarios.push(...operationRows(preparedFixture(topology, 256), 256, 16));
  }
  assertCoverage(scenarios);
}
const raw = Object.freeze({
  command: manifest.command,
  coverage: Object.freeze({
    required: manifest.requiredCoverage,
    scenarioIds: Object.freeze(scenarios.map((scenario) => scenario.id)),
  }),
  environment: Object.freeze({
    bunVersion: Bun.version,
    cpu: cpus(),
    os: Object.freeze({
      architecture: process.arch,
      platform: platform(),
      release: release(),
      totalMemoryBytes: totalmem(),
      type: type(),
    }),
  }),
  fixtureSeed: manifest.seed,
  generatedAt: new Date().toISOString(),
  gitCommit: gitCommit(),
  measurement: Object.freeze({
    cpu: "process.cpuUsage() per batch",
    heap: "process.memoryUsage().heapUsed delta without forced GC; proxy only",
    mode: isProfileRun ? "profile" : "baseline",
    warmupSamples: manifest.profile.warmupSamples,
    measuredSamples: manifest.profile.measuredSamples,
    wall: "performance.now() elapsed milliseconds per batch",
  }),
  scenarios: Object.freeze(scenarios),
  sink,
});
await mkdir(here, { recursive: true });
await writeFile(rawPath, `${JSON.stringify(raw, null, 2)}\n`);
await writeFile(summaryPath, summaryMarkdown(scenarios));
console.log(`wrote ${rawPath}`);
console.log(`wrote ${summaryPath}`);
