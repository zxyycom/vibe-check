import {
  referenceStaticCandidate,
  referenceLexicalOrder,
  referenceValidation
} from "./incremental-trace-selection.test-support.ts";
import type { PlannedTask, PlannedTaskGraph } from "../graph.ts";
import type { SchedulerSettlementKind } from "../scheduler-decision-model.ts";
import type { AdmissionCoreEffect } from "./core.ts";
import type {
  AdmissionTraceAction,
  AdmissionCoreTraceProjection,
  AdmissionCoreTraceStep
} from "./trace.ts";
import type {
  AdmissionCatalog,
  AdmissionSelectionRejectionReason
} from "../../../project-definition/scheduler-policy.ts";

type ReferenceStatus = "pending" | "running" | SchedulerSettlementKind;

/** Deliberately full-scan oracle: no compiled indexes, memberships, frontier or production reducer. */
export class ReferenceAdmissionState {
  readonly #graph: PlannedTaskGraph;
  readonly #maxParallel: number;
  readonly #status: Map<string, ReferenceStatus>;
  readonly #active = new Set<string>();

  public constructor(
    graph: PlannedTaskGraph,
    maxParallel: number,
    settlements: readonly Readonly<{ taskId: string; kind: SchedulerSettlementKind }>[] = []
  ) {
    this.#graph = graph;
    this.#maxParallel = maxParallel;
    this.#status = new Map<string, ReferenceStatus>(
      graph.tasks.map((task) => [task.id, "pending"])
    );
    for (const settlement of settlements) this.#status.set(settlement.taskId, settlement.kind);
  }

  #settled(taskId: string): boolean {
    const status = this.#status.get(taskId);
    return status !== "pending" && status !== "running";
  }
  #running(): PlannedTask[] {
    return this.#graph.tasks.filter((task) => this.#status.get(task.id) === "running");
  }
  #complete(): boolean {
    return this.#graph.tasks.every((task) => this.#settled(task.id));
  }
  #lifecycle(scope: PlannedTaskGraph["scopes"][number]): "inactive" | "active" | "closed" {
    if (this.#settled(scope.terminalTaskId)) return "closed";
    return this.#active.has(scope.id) ? "active" : "inactive";
  }
  #relationReady(task: PlannedTask): boolean {
    return [...task.dependsOn, ...task.observes].every((id) => this.#settled(id));
  }
  #mutexes(task: PlannedTask): string[] {
    const running = this.#running();
    return task.mutex.filter((id) => running.some((holder) => holder.mutex.includes(id)));
  }
  #resourceUse(resourceId: string): number {
    return this.#running().reduce(
      (total, task) =>
        total + (task.resourceClaims.find((claim) => claim.resourceId === resourceId)?.units ?? 0),
      0
    );
  }

  #pendingRejection(task: PlannedTask): AdmissionSelectionRejectionReason | undefined {
    const dependencies = task.dependsOn.filter((id) => !this.#settled(id));
    if (dependencies.length)
      return { kind: "depends-on-pending", taskIds: dependencies.sort(referenceLexicalOrder) };
    const observations = task.observes.filter((id) => !this.#settled(id));
    if (observations.length)
      return { kind: "observes-pending", taskIds: observations.sort(referenceLexicalOrder) };
    const mutexIds = this.#mutexes(task);
    if (mutexIds.length)
      return { kind: "mutex-held", mutexIds: mutexIds.sort(referenceLexicalOrder) };
    const running = this.#running().length;
    const blockingScope = this.#graph.scopes
      .filter((scope) => {
        const active = this.#active.has(scope.id) && this.#lifecycle(scope) !== "closed";
        const activates =
          task.scopeId === scope.id &&
          this.#lifecycle(scope) === "inactive" &&
          scope.activationTaskIds.includes(task.id);
        return (active || activates) && running >= scope.maxParallel;
      })
      .sort(
        (left, right) =>
          left.maxParallel - right.maxParallel || referenceLexicalOrder(left.id, right.id)
      )[0];
    if (blockingScope !== undefined)
      return {
        kind: "scope-capacity-reached",
        maxParallel: blockingScope.maxParallel,
        running,
        scopeId: blockingScope.id
      };
    if (running >= this.#maxParallel)
      return { kind: "root-capacity-reached", maxParallel: this.#maxParallel, running };
    const resources = task.resourceClaims.flatMap((claim) => {
      const capacity = this.#graph.resourceCapacities.find(
        (resource) => resource.resourceId === claim.resourceId
      )!.units;
      const inUse = this.#resourceUse(claim.resourceId);
      return inUse + claim.units > capacity
        ? [
            {
              available: capacity - inUse,
              capacity,
              inUse,
              required: claim.units,
              resourceId: claim.resourceId
            }
          ]
        : [];
    });
    return resources.length ? { kind: "resource-capacity-insufficient", resources } : undefined;
  }

  public validation(taskId: string) {
    return referenceValidation({
      graph: this.#graph,
      statuses: this.#status,
      isComplete: this.#complete(),
      taskId,
      pendingRejection: (task) => this.#pendingRejection(task)
    });
  }

  public projection(): AdmissionCoreTraceProjection {
    const sortedTasks = [...this.#graph.tasks].sort((left, right) =>
      referenceLexicalOrder(left.id, right.id)
    );
    const selectableTaskIds: string[] = [];
    const nonSelectableTasks: AdmissionCatalog["nonSelectableTasks"][number][] = [];
    for (const task of sortedTasks) {
      if (this.#status.get(task.id) !== "pending") continue;
      const reason = this.#pendingRejection(task);
      if (reason !== undefined) nonSelectableTasks.push({ reason, taskId: task.id });
      else selectableTaskIds.push(task.id);
    }
    const runningTaskIds = sortedTasks
      .filter((task) => this.#status.get(task.id) === "running")
      .map((task) => task.id);
    return {
      catalog: { nonSelectableTasks, selectableTaskIds },
      inspection: {
        capacity: {
          effectiveMaxParallel: Math.min(
            this.#maxParallel,
            ...this.#graph.scopes
              .filter((scope) => this.#active.has(scope.id) && this.#lifecycle(scope) !== "closed")
              .map((scope) => scope.maxParallel)
          ),
          maxParallel: this.#maxParallel,
          running: runningTaskIds.length
        },
        nextBoundary: nextBoundary(selectableTaskIds.length, runningTaskIds.length),
        resources: this.#graph.resourceCapacities.map(({ resourceId, units }) => {
          const inUse = this.#resourceUse(resourceId);
          return { resourceId, capacity: units, inUse, available: units - inUse };
        }),
        runningTaskIds,
        scopes: [...this.#graph.scopes]
          .sort((left, right) => referenceLexicalOrder(left.id, right.id))
          .map((scope) => ({ scopeId: scope.id, lifecycle: this.#lifecycle(scope) })),
        settledTasks: sortedTasks.flatMap<{ taskId: string; outcome: "satisfied" | "unsatisfied" }>(
          (task) => {
            const status = this.#status.get(task.id);
            if (status === "completed") return [{ taskId: task.id, outcome: "satisfied" }];
            if (status === "failed" || status === "prerequisite-unsatisfied")
              return [{ taskId: task.id, outcome: "unsatisfied" }];
            return [];
          }
        )
      },
      validation: [...sortedTasks.map((task) => task.id), "__admission_trace_unknown__"].map(
        (taskId) => ({ taskId, value: this.validation(taskId) })
      )
    };
  }

  public staticChoice(): Readonly<{ taskId: string; canAdmit: boolean }> | undefined {
    const candidates = this.#graph.tasks.filter(
      (task) =>
        this.#status.get(task.id) === "pending" &&
        this.#relationReady(task) &&
        this.#mutexes(task).length === 0
    );
    return referenceStaticCandidate({
      graph: this.#graph,
      maxParallel: this.#maxParallel,
      candidates,
      isActiveScope: (scope) => this.#active.has(scope.id) && this.#lifecycle(scope) !== "closed",
      canAdmit: (task) => this.#pendingRejection(task) === undefined
    });
  }

  public step(action: AdmissionTraceAction): AdmissionCoreTraceStep {
    const pre = this.projection();
    const effects: AdmissionCoreEffect[] = [];
    const effectProjections: AdmissionCoreTraceProjection[] = [];
    const settle = (taskId: string, settlementKind: SchedulerSettlementKind) => {
      const dependencyIds = this.#graph.tasks
        .find((task) => task.id === taskId)!
        .dependsOn.filter((id) => this.#settled(id) && this.#status.get(id) !== "completed");
      this.#status.set(taskId, settlementKind);
      for (const scope of this.#graph.scopes)
        if (scope.terminalTaskId === taskId) this.#active.delete(scope.id);
      effects.push(
        settlementKind === "blocked"
          ? { kind: "settled", settlementKind, taskId, dependencyIds }
          : { kind: "settled", settlementKind, taskId }
      );
      effectProjections.push(this.projection());
    };
    const reconcile = () => {
      for (;;) {
        const forced = [...this.#graph.tasks]
          .reverse()
          .find(
            (task) =>
              this.#status.get(task.id) === "pending" &&
              task.dependsOn.every((id) => this.#settled(id)) &&
              task.dependsOn.some((id) => this.#status.get(id) !== "completed")
          );
        if (forced === undefined) return;
        settle(forced.id, "blocked");
      }
    };
    let reasonKind: string | null = null;
    switch (action.kind) {
      case "select": {
        const validation = this.validation(action.taskId);
        if (!validation.accepted) {
          reasonKind = validation.reason.kind;
          break;
        }
        const task = this.#graph.tasks.find((candidate) => candidate.id === action.taskId)!;
        const scope = this.#graph.scopes.find((candidate) => candidate.id === task.scopeId);
        if (
          scope !== undefined &&
          this.#lifecycle(scope) === "inactive" &&
          scope.activationTaskIds.includes(task.id)
        )
          this.#active.add(scope.id);
        this.#status.set(task.id, "running");
        effects.push({ kind: "admitted", taskId: task.id });
        effectProjections.push(this.projection());
        break;
      }
      case "settle":
      case "settle-running": {
        if (
          action.kind === "settle" &&
          action.outcome !== "satisfied" &&
          action.outcome !== "unsatisfied"
        ) {
          reasonKind = "invalid-settlement-outcome";
          break;
        }
        if (this.#complete()) {
          reasonKind = "state-complete";
          break;
        }
        const status = this.#status.get(action.taskId);
        if (status === undefined) {
          reasonKind = "unknown-task";
          break;
        }
        if (status !== "running") {
          reasonKind = "not-running";
          break;
        }
        let settlementKind: SchedulerSettlementKind;
        if (action.kind === "settle-running") settlementKind = action.settlementKind;
        else
          settlementKind =
            action.outcome === "satisfied" ? "completed" : "prerequisite-unsatisfied";
        settle(action.taskId, settlementKind);
        reconcile();
        break;
      }
      case "cancel-pending":
        for (const task of this.#graph.tasks)
          if (this.#status.get(task.id) === "pending") settle(task.id, "cancelled-before-start");
        break;
      case "reconcile":
        reconcile();
        break;
    }
    return {
      action,
      pre,
      post: this.projection(),
      effects,
      effectProjections,
      result: { accepted: reasonKind === null, reasonKind }
    };
  }
}

function nextBoundary(selectable: number, running: number): "select" | "wait" | "complete" {
  if (selectable > 0) return "select";
  if (running > 0) return "wait";
  return "complete";
}
