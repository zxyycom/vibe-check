import assert from "node:assert/strict";
import type { PlannedTask, PlannedTaskGraph } from "../graph.ts";
import type { AdmissionCoreEffect } from "../admission-core/core.ts";
import type { SchedulerSettlementKind } from "../scheduler-decision-model.ts";
import { oracleUnits } from "./exact-time.test-support.ts";

type OracleStatus =
  | Readonly<{ kind: "pending" | "running" }>
  | Readonly<{ kind: "settled"; settlementKind: SchedulerSettlementKind }>;
type Category = "admissible-pending" | "capacity-blocked" | "mutex-blocked";
interface OracleDelay {
  admissiblePendingMs: bigint;
  capacityBlockedMs: bigint;
  mutexBlockedMs: bigint;
}
interface OracleCounts {
  admissionViablePending: number;
  admissiblePending: number;
  capacityBlocked: number;
  mutexBlocked: number;
}
const emptyDelay = (): OracleDelay => ({
  admissiblePendingMs: 0n,
  capacityBlockedMs: 0n,
  mutexBlockedMs: 0n
});

/** Low-optimization semantic oracle: raw graph + canonical effects, no Core query/counter/group reuse. */
export class QueueTraceOracle {
  readonly #graph: PlannedTaskGraph;
  readonly #maxParallel: number;
  readonly #status = new Map<string, OracleStatus>();
  readonly #scopeLifecycle = new Map<string, "inactive" | "active" | "closed">();
  readonly #delays = new Map<string, OracleDelay>();
  readonly #taken = new Set<string>();
  #now: number;
  public constructor(
    graph: PlannedTaskGraph,
    maxParallel: number,
    now: number,
    settlements: readonly Readonly<{ taskId: string; kind: SchedulerSettlementKind }>[] = []
  ) {
    this.#graph = graph;
    this.#maxParallel = maxParallel;
    this.#now = now;
    for (const task of graph.tasks) this.#status.set(task.id, { kind: "pending" });
    for (const settlement of settlements)
      this.#status.set(settlement.taskId, { kind: "settled", settlementKind: settlement.kind });
    for (const scope of graph.scopes)
      this.#scopeLifecycle.set(
        scope.id,
        this.#status.get(scope.terminalTaskId)?.kind === "settled" ? "closed" : "inactive"
      );
    this.#installSeen();
  }
  public category(task: PlannedTask): Category | undefined {
    if (this.#status.get(task.id)?.kind !== "pending") return undefined;
    if (
      task.dependsOn.some((id) => {
        const dependency = this.#status.get(id);
        return dependency?.kind !== "settled" || dependency.settlementKind !== "completed";
      })
    )
      return undefined;
    if (task.observes.some((id) => this.#status.get(id)?.kind !== "settled")) return undefined;
    const running = this.#graph.tasks.filter(
      (candidate) => this.#status.get(candidate.id)?.kind === "running"
    );
    if (task.mutex.some((mutex) => running.some((holder) => holder.mutex.includes(mutex))))
      return "mutex-blocked";
    if (running.length >= this.#maxParallel) return "capacity-blocked";
    if (
      this.#graph.scopes.some(
        (scope) =>
          this.#scopeLifecycle.get(scope.id) === "active" && running.length >= scope.maxParallel
      )
    )
      return "capacity-blocked";
    const ownScope = this.#graph.scopes.find((scope) => scope.id === task.scopeId);
    if (
      ownScope !== undefined &&
      this.#scopeLifecycle.get(ownScope.id) === "inactive" &&
      ownScope.activationTaskIds.includes(task.id) &&
      running.length >= ownScope.maxParallel
    )
      return "capacity-blocked";
    for (const claim of task.resourceClaims) {
      const capacity = this.#graph.resourceCapacities.find(
        (resource) => resource.resourceId === claim.resourceId
      )?.units;
      assert.notEqual(capacity, undefined);
      let inUse = 0;
      for (const holder of running)
        for (const held of holder.resourceClaims)
          if (held.resourceId === claim.resourceId) inUse += held.units;
      if (inUse + claim.units > (capacity ?? 0)) return "capacity-blocked";
    }
    return "admissible-pending";
  }
  public counts(): OracleCounts {
    const counts: OracleCounts = {
      admissionViablePending: 0,
      admissiblePending: 0,
      capacityBlocked: 0,
      mutexBlocked: 0
    };
    for (const task of this.#graph.tasks) {
      const category = this.category(task);
      if (category === undefined) continue;
      counts.admissionViablePending++;
      if (category === "admissible-pending") counts.admissiblePending++;
      else if (category === "capacity-blocked") counts.capacityBlocked++;
      else counts.mutexBlocked++;
    }
    return counts;
  }
  public advance(now: number): bigint {
    assert.ok(now >= this.#now);
    const elapsed = oracleUnits(now) - oracleUnits(this.#now);
    for (const task of this.#graph.tasks) {
      const category = this.category(task);
      if (category === undefined) continue;
      const delay = this.#delays.get(task.id);
      assert.notEqual(delay, undefined);
      if (delay === undefined) throw new Error("oracle delay was not installed");
      if (category === "admissible-pending") delay.admissiblePendingMs += elapsed;
      else if (category === "capacity-blocked") delay.capacityBlockedMs += elapsed;
      else delay.mutexBlockedMs += elapsed;
    }
    this.#now = now;
    return elapsed;
  }
  public apply(effect: AdmissionCoreEffect): void {
    this.#apply(effect);
    this.#installSeen();
  }
  public applyBatch(effects: readonly AdmissionCoreEffect[]): void {
    for (const effect of effects) this.#apply(effect);
    this.#installSeen();
  }
  #apply(effect: AdmissionCoreEffect): void {
    if (effect.kind === "admitted") {
      this.#status.set(effect.taskId, { kind: "running" });
      for (const scope of this.#graph.scopes) {
        if (
          scope.activationTaskIds.includes(effect.taskId) &&
          this.#scopeLifecycle.get(scope.id) === "inactive"
        )
          this.#scopeLifecycle.set(scope.id, "active");
      }
    } else {
      this.#status.set(effect.taskId, { kind: "settled", settlementKind: effect.settlementKind });
      for (const scope of this.#graph.scopes)
        if (scope.terminalTaskId === effect.taskId) this.#scopeLifecycle.set(scope.id, "closed");
    }
  }
  public delayFor(taskId: string): Readonly<OracleDelay> | undefined {
    return this.#delays.get(taskId);
  }
  public take(taskId: string): Readonly<OracleDelay> | undefined {
    this.#taken.add(taskId);
    return this.#delays.get(taskId);
  }
  public pendingDelays(): ReadonlyMap<string, Readonly<OracleDelay>> {
    return new Map([...this.#delays].filter(([taskId]) => !this.#taken.has(taskId)));
  }
  #installSeen(): void {
    for (const task of this.#graph.tasks)
      if (this.category(task) !== undefined && !this.#delays.has(task.id))
        this.#delays.set(task.id, emptyDelay());
  }
}
