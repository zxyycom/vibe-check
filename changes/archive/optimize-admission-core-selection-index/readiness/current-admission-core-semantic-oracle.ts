import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  admissionCandidatesForCore,
  compilePreparedAdmissionGraph,
  createAdmissionCoreFromSchedulerSnapshot,
  createInitialAdmissionCoreState,
  selectAdmissionCore,
  settleRunningAdmissionCore,
  validateAdmissionCoreSelection,
  type AdmissionCoreState
} from "../../../src/project-run/task-scheduler/admission-core.ts";
import {
  admissionCoreTraceProjectionFor,
  traceAdmissionCore,
  type AdmissionTraceAction
} from "../../../src/project-run/task-scheduler/admission-core-trace.ts";
import { admissionSelectionPolicyFor } from "../../../src/project-run/task-scheduler/custom-admission-policy.ts";
import { prepareTaskGraph, type TaskGraph } from "../../../src/project-run/task-scheduler/graph.ts";
import { runTaskGraph } from "../../../src/project-run/task-scheduler/scheduler.ts";

const here = dirname(fileURLToPath(import.meta.url));
const defaultBeforePath = resolve(here, "current-admission-core-semantic-oracle.before.json");
const comparePath = optionValue("--compare");
rejectRetiredRepresentationOption();
const outputPath =
  optionValue("--output") ??
  (comparePath === undefined
    ? defaultBeforePath
    : resolve(here, "current-admission-core-semantic-oracle.after.json"));

if (comparePath === undefined && !process.argv.includes("--write-before")) {
  throw new Error("semantic oracle requires --write-before or --compare <before-oracle.json>");
}

interface CandidateProjection {
  readonly canAdmit: boolean;
  readonly taskId: string;
}

function rejectRetiredRepresentationOption(): void {
  if (process.argv.includes("--representation")) {
    throw new Error(
      "representation candidates are historic gate evidence; rerun the selected immutable-list implementation without --representation"
    );
  }
}

function optionValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a path`);
  }
  return resolve(process.cwd(), value);
}


const selectedImplementationFiles = Object.freeze([
  "package.json",
  "pnpm-lock.yaml",
  "src/project-run/task-scheduler/admission-core-compiled-graph.ts",
  "src/project-run/task-scheduler/admission-core.ts"
]);

async function selectedImplementationFingerprint(): Promise<
  Readonly<{ readonly algorithm: "sha256"; readonly files: readonly string[]; readonly sha256: string }>
> {
  const repositoryRoot = resolve(here, "../../..");
  const hash = createHash("sha256");
  for (const relativePath of selectedImplementationFiles) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(await readFile(resolve(repositoryRoot, relativePath)));
    hash.update("\0");
  }
  return Object.freeze({
    algorithm: "sha256",
    files: selectedImplementationFiles,
    sha256: hash.digest("hex")
  });
}

function coreFor(graph: TaskGraph, maxParallel: number): AdmissionCoreState {
  const planned = prepareTaskGraph(graph, maxParallel);
  return createInitialAdmissionCoreState(compilePreparedAdmissionGraph(planned, maxParallel));
}

function candidatesFor(state: AdmissionCoreState): readonly CandidateProjection[] {
  return Object.freeze(
    admissionCandidatesForCore(state).map((candidate) =>
      Object.freeze({
        canAdmit: candidate.canAdmit,
        taskId: candidate.task.id
      })
    )
  );
}

function traceFor(
  graph: TaskGraph,
  maxParallel: number,
  actions: readonly AdmissionTraceAction[]
): ReturnType<typeof traceAdmissionCore> {
  return traceAdmissionCore(coreFor(graph, maxParallel), actions);
}

function primaryReasonAndCandidateOracle(): Readonly<Record<string, unknown>> {
  const graph: TaskGraph = {
    tasks: [
      { id: "z-dependency" },
      { id: "a-dependency" },
      {
        dependsOn: ["z-dependency", "z-dependency", "a-dependency"],
        id: "depends"
      },
      { id: "z-observation" },
      { id: "a-observation" },
      {
        id: "observer",
        observes: ["z-observation", "z-observation", "a-observation"]
      },
      { id: "mutex-holder", mutex: ["z-mutex", "z-mutex", "a-mutex"] },
      { id: "mutex-contender", mutex: ["z-mutex", "z-mutex", "a-mutex"] }
    ]
  };
  const initial = coreFor(graph, 3);
  const holder = selectAdmissionCore(initial, "mutex-holder");
  if (!holder.accepted) throw new Error("semantic oracle mutex holder was not selectable");
  return Object.freeze({
    candidateOrderAtInitial: candidatesFor(initial),
    candidateOrderAfterMutexHolder: candidatesFor(holder.transition.state),
    trace: traceFor(graph, 3, [
      { kind: "select", taskId: "mutex-holder" },
      { kind: "settle", outcome: "satisfied", taskId: "mutex-holder" }
    ])
  });
}

function transitionAndForcedOracle(): Readonly<Record<string, unknown>> {
  const transitionGraph: TaskGraph = {
    tasks: [{ id: "source" }, { dependsOn: ["source"], id: "dependent" }]
  };
  const forcedGraph: TaskGraph = {
    tasks: [
      { id: "source" },
      { dependsOn: ["source", "source"], id: "first-dependent" },
      { dependsOn: ["source", "source"], id: "last-dependent" }
    ]
  };
  return Object.freeze({
    acceptedSelectSettleTrace: traceFor(transitionGraph, 1, [
      { kind: "select", taskId: "source" },
      { kind: "settle", outcome: "satisfied", taskId: "source" },
      { kind: "select", taskId: "dependent" },
      { kind: "settle", outcome: "unsatisfied", taskId: "dependent" }
    ]),
    forcedFailureTrace: traceFor(forcedGraph, 1, [
      { kind: "select", taskId: "source" },
      { kind: "settle-running", settlementKind: "failed", taskId: "source" }
    ])
  });
}

function scopeOracle(): Readonly<Record<string, unknown>> {
  const graph: TaskGraph = {
    scopes: [
      {
        activationTaskIds: ["activate"],
        id: "limited",
        maxParallel: 1,
        terminalTaskId: "terminal"
      }
    ],
    tasks: [
      { id: "activate", scopeId: "limited" },
      { id: "inside", scopeId: "limited" },
      { dependsOn: ["activate", "inside"], id: "terminal", scopeId: "limited" },
      { id: "outside" },
      { id: "unscoped" }
    ]
  };
  const activatingGraph: TaskGraph = {
    scopes: [
      {
        activationTaskIds: ["activate"],
        id: "activating",
        maxParallel: 2,
        terminalTaskId: "terminal"
      }
    ],
    tasks: [
      { id: "filler-first" },
      { id: "filler-second" },
      { id: "activate", scopeId: "activating" },
      {
        dependsOn: ["activate"],
        id: "terminal",
        scopeId: "activating"
      }
    ]
  };
  return Object.freeze({
    activeScopeBlocksEveryCandidate: traceFor(graph, 2, [{ kind: "select", taskId: "activate" }]),
    activatingScopeBlocksItsPendingActivationCandidate: traceFor(activatingGraph, 3, [
      { kind: "select", taskId: "filler-first" },
      { kind: "select", taskId: "filler-second" }
    ]),
    scopeBeforeRootAtSameGlobalRunning: traceFor(graph, 1, [{ kind: "select", taskId: "activate" }])
  });
}

/**
 * Keeps one pending target under every pending-task rejection stage at once, then
 * removes just the primary-stage blocker while restoring global occupancy. The
 * active scope and root both reach six running tasks; closing that scope at the
 * same running total proves the scope-before-root boundary on this one target.
 */
function competingBlockerPrecedenceOracle(): Readonly<Record<string, unknown>> {
  const graph: TaskGraph = {
    scopes: [
      {
        activationTaskIds: ["scope-activate"],
        id: "active-limited",
        maxParallel: 6,
        terminalTaskId: "scope-terminal"
      }
    ],
    tasks: [
      { id: "dependency" },
      { id: "observation" },
      { id: "mutex-holder", mutex: ["shared"] },
      { id: "scope-activate", scopeId: "active-limited" },
      {
        dependsOn: ["scope-activate"],
        id: "scope-terminal",
        scopeId: "active-limited"
      },
      { id: "filler-initial" },
      { id: "filler-root-fill" },
      { id: "filler-after-dependency" },
      { id: "filler-after-observation" },
      { id: "filler-after-mutex" },
      { id: "filler-after-scope" },
      {
        dependsOn: ["dependency"],
        id: "target",
        mutex: ["shared"],
        observes: ["observation"]
      }
    ]
  };
  const actions: readonly AdmissionTraceAction[] = [
    { kind: "select", taskId: "scope-activate" },
    { kind: "settle", outcome: "satisfied", taskId: "scope-activate" },
    { kind: "select", taskId: "scope-terminal" },
    { kind: "select", taskId: "dependency" },
    { kind: "select", taskId: "observation" },
    { kind: "select", taskId: "mutex-holder" },
    { kind: "select", taskId: "filler-initial" },
    { kind: "select", taskId: "filler-root-fill" },
    { kind: "settle", outcome: "satisfied", taskId: "dependency" },
    { kind: "select", taskId: "filler-after-dependency" },
    { kind: "settle", outcome: "satisfied", taskId: "observation" },
    { kind: "select", taskId: "filler-after-observation" },
    { kind: "settle", outcome: "satisfied", taskId: "mutex-holder" },
    { kind: "select", taskId: "filler-after-mutex" },
    { kind: "settle", outcome: "satisfied", taskId: "scope-terminal" },
    { kind: "select", taskId: "filler-after-scope" },
    { kind: "settle", outcome: "satisfied", taskId: "filler-after-scope" },
    { kind: "select", taskId: "target" }
  ];
  const trace = traceFor(graph, 6, actions);
  const targetValidationAfter = (actionIndex: number): unknown => {
    const validation = trace[actionIndex]?.post.validation.find(
      (entry) => entry.taskId === "target"
    )?.value;
    if (validation === undefined) {
      throw new Error(`semantic oracle target validation missing after action ${actionIndex}`);
    }
    return validation;
  };
  const stage = (
    actionIndex: number,
    name: string,
    expected: unknown
  ): Readonly<Record<string, unknown>> => {
    const validation = targetValidationAfter(actionIndex);
    if (JSON.stringify(validation) !== JSON.stringify(expected)) {
      throw new Error(`semantic oracle ${name} precedence changed: ${JSON.stringify(validation)}`);
    }
    return Object.freeze({
      afterAction: actions[actionIndex],
      name,
      targetValidation: validation
    });
  };
  return Object.freeze({
    /** Full transition projection retains catalog, candidate-visible validation and effects per step. */
    trace,
    targetPrimaryReasonByStage: Object.freeze([
      stage(7, "depends-on-over-all-later-blockers", {
        accepted: false,
        reason: { kind: "depends-on-pending", taskIds: ["dependency"] }
      }),
      stage(9, "observes-over-mutex-scope-and-root", {
        accepted: false,
        reason: { kind: "observes-pending", taskIds: ["observation"] }
      }),
      stage(11, "mutex-over-scope-and-root", {
        accepted: false,
        reason: { kind: "mutex-held", mutexIds: ["shared"] }
      }),
      stage(13, "active-scope-over-root", {
        accepted: false,
        reason: {
          kind: "scope-capacity-reached",
          maxParallel: 6,
          running: 6,
          scopeId: "active-limited"
        }
      }),
      stage(15, "root-after-active-scope-closes", {
        accepted: false,
        reason: { kind: "root-capacity-reached", maxParallel: 6, running: 6 }
      }),
      stage(16, "accepted-after-all-blockers-clear", { accepted: true })
    ])
  });
}

function legacySnapshotOracle(): Readonly<Record<string, unknown>> {
  const graph: TaskGraph = {
    tasks: [{ id: "running" }, { dependsOn: ["running"], id: "dependent" }, { id: "absent" }]
  };
  const planned = prepareTaskGraph(graph, 1);
  const state = createAdmissionCoreFromSchedulerSnapshot(
    compilePreparedAdmissionGraph(planned, 1),
    Object.freeze({
      activeScopeIds: [],
      graph: planned,
      isAbortRequested: false,
      isCancelled: false,
      maxParallel: 1,
      pendingTaskIds: ["dependent"],
      runningMutexes: [],
      runningTaskIds: ["running"],
      settledTasks: []
    })
  );
  return Object.freeze({
    pre: admissionCoreTraceProjectionFor(state),
    trace: traceAdmissionCore(state, [
      { kind: "settle-running", settlementKind: "failed", taskId: "running" }
    ])
  });
}

/**
 * The snapshot's external mutex list remains a blocker after a same-mutex dynamic
 * running task settles. This assertion intentionally sits outside the immutable
 * before JSON, which predates the regression row, but runs for every A/B/C gate.
 */
function legacyDynamicMutexAdditivityOracle(): Readonly<Record<string, unknown>> {
  const graph: TaskGraph = {
    tasks: [
      { id: "dynamic-holder", mutex: ["shared"] },
      { id: "contender", mutex: ["shared", "shared"] }
    ]
  };
  const planned = prepareTaskGraph(graph, 2);
  const seeded = createAdmissionCoreFromSchedulerSnapshot(
    compilePreparedAdmissionGraph(planned, 2),
    Object.freeze({
      activeScopeIds: [],
      graph: planned,
      isAbortRequested: false,
      isCancelled: false,
      maxParallel: 2,
      pendingTaskIds: ["contender"],
      runningMutexes: ["shared"],
      runningTaskIds: ["dynamic-holder"],
      settledTasks: []
    })
  );
  const dynamicSettled = settleRunningAdmissionCore(seeded, "dynamic-holder", "completed");
  if (!dynamicSettled.accepted) throw new Error("legacy mutex dynamic holder could not settle");
  const expected = Object.freeze({
    accepted: false as const,
    reason: Object.freeze({ kind: "mutex-held" as const, mutexIds: Object.freeze(["shared", "shared"]) })
  });
  const pre = validateLegacyMutex(seeded, expected);
  const post = validateLegacyMutex(dynamicSettled.transition.state, expected);
  return Object.freeze({
    beforeDynamicHolderSettlement: pre,
    afterDynamicHolderSettlement: post
  });
}

function validateLegacyMutex(
  state: AdmissionCoreState,
  expected: Readonly<{ readonly accepted: false; readonly reason: unknown }>
): unknown {
  const validation = selectAdmissionCore(state, "contender");
  const normalized = validation.accepted ? { accepted: true } : { accepted: false, reason: validation.reason };
  if (JSON.stringify(normalized) !== JSON.stringify(expected)) {
    throw new Error(`legacy/dynamic mutex additivity changed: ${JSON.stringify(normalized)}`);
  }
  return normalized;
}

function cancellationOracle(): ReturnType<typeof traceAdmissionCore> {
  return traceFor({ tasks: [{ id: "first" }, { id: "second" }, { id: "third" }] }, 2, [
    { kind: "cancel-pending" }
  ]);
}

async function callbackHardGuardOracle(): Promise<Readonly<Record<string, unknown>>> {
  const controller = new AbortController();
  let callbackValidation: unknown;
  let executeCount = 0;
  const run = await runTaskGraph({
    admissionPolicy: admissionSelectionPolicyFor((context) => {
      callbackValidation = context.admissionState.validateSelection("pending");
      controller.abort();
      return Object.freeze({ kind: "select" as const, taskId: "pending" });
    }),
    execute: () => {
      executeCount += 1;
      throw new Error("callback hard guard must prevent task execution");
    },
    graph: { tasks: [{ id: "pending" }] },
    maxParallel: 1,
    signal: controller.signal
  });
  return Object.freeze({
    callbackValidation,
    executeCount,
    run: Object.freeze({
      admissionPolicyFault: run.admissionPolicyFault ?? null,
      settlements: Object.freeze(
        run.settlements.map(({ settlement, task }) =>
          Object.freeze({ settlementKind: settlement.kind, taskId: task.id })
        )
      )
    })
  });
}

function currentCommit(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: resolve(here, "../../.."),
    encoding: "utf8"
  }).trim();
}

const extension = Object.freeze({
  legacyDynamicMutexAdditivity: legacyDynamicMutexAdditivityOracle()
});
const oracle = Object.freeze({
  cancellation: cancellationOracle(),
  callbackHardGuard: await callbackHardGuardOracle(),
  competingBlockerPrimaryPrecedence: competingBlockerPrecedenceOracle(),
  legacySnapshot: legacySnapshotOracle(),
  primaryReasonPayloadAndCandidateOrder: primaryReasonAndCandidateOracle(),
  scopeGlobalCapacity: scopeOracle(),
  transitionAndForcedEffects: transitionAndForcedOracle()
});
const output = Object.freeze({
  currentCommit: currentCommit(),
  extension,
  oracle,
  representation: "immutable-list",
  sourceFingerprint: await selectedImplementationFingerprint(),
  schemaVersion: 1
});

if (comparePath !== undefined) {
  const before = JSON.parse(await readFile(comparePath, "utf8")) as {
    readonly oracle?: unknown;
  };
  if (JSON.stringify(before.oracle) !== JSON.stringify(oracle)) {
    throw new Error(
      `semantic oracle differs from ${comparePath}; inspect every persisted semantic field before accepting this implementation`
    );
  }
}
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`wrote ${outputPath}`);
if (comparePath !== undefined) console.log(`semantic oracle matched ${comparePath}`);
