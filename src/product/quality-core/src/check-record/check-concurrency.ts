import {
  type NormalizedTask,
  type TaskAdmissionController,
  type TaskDefinition
} from "../../../task-orchestration/src/index.ts";

export interface CheckTaskConcurrency {
  readonly activatesCap: boolean;
  readonly checkId: string;
  readonly maxParallel: number;
  readonly terminal: boolean;
}

export interface CheckTaskRegistry {
  readonly definitions: TaskDefinition[];
  readonly concurrencyByTaskId: Map<string, CheckTaskConcurrency>;
}

export interface CheckTaskRegistration {
  readonly activatesCap: boolean;
  readonly checkId: string;
  readonly definition: TaskDefinition;
  readonly maxParallel: number;
  readonly terminal: boolean;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireTaskConcurrency(
  task: NormalizedTask,
  concurrencyByTaskId: ReadonlyMap<string, CheckTaskConcurrency>
): CheckTaskConcurrency {
  const value = concurrencyByTaskId.get(task.id);
  if (value === undefined) throw new TypeError("Check task concurrency metadata is missing");
  return value;
}

function compareConstrainedTask(
  left: NormalizedTask,
  right: NormalizedTask,
  concurrencyByTaskId: ReadonlyMap<string, CheckTaskConcurrency>
): number {
  const leftInfo = requireTaskConcurrency(left, concurrencyByTaskId);
  const rightInfo = requireTaskConcurrency(right, concurrencyByTaskId);
  return leftInfo.maxParallel - rightInfo.maxParallel
    || compareText(leftInfo.checkId, rightInfo.checkId)
    || compareText(left.id, right.id);
}

function effectiveMaxParallel(
  rootMaxParallel: number,
  activeMaxParallelByCheckId: ReadonlyMap<string, number>
): number {
  return [...activeMaxParallelByCheckId.values()].reduce(
    (effective, value) => Math.min(effective, value),
    rootMaxParallel
  );
}

export function createCheckTaskRegistry(): CheckTaskRegistry {
  return {
    definitions: [],
    concurrencyByTaskId: new Map<string, CheckTaskConcurrency>()
  };
}

export function registerCheckTask(
  registry: CheckTaskRegistry,
  registration: CheckTaskRegistration
): void {
  if (registry.concurrencyByTaskId.has(registration.definition.id)) {
    throw new TypeError("Check orchestration task ID is duplicated");
  }
  registry.definitions.push(registration.definition);
  registry.concurrencyByTaskId.set(registration.definition.id, Object.freeze({
    activatesCap: registration.activatesCap,
    checkId: registration.checkId,
    maxParallel: registration.maxParallel,
    terminal: registration.terminal
  }));
}

export function createCheckAdmissionController(
  rootMaxParallel: number,
  concurrencyByTaskId: ReadonlyMap<string, CheckTaskConcurrency>
): TaskAdmissionController {
  const activeMaxParallelByCheckId = new Map<string, number>();
  let reservationTaskId: string | undefined;

  const orderConstrained = (tasks: readonly NormalizedTask[]) => (
    [...tasks].sort((left, right) => compareConstrainedTask(left, right, concurrencyByTaskId))
  );

  return Object.freeze({
    selectNextReadyTask: (input: Readonly<{
      readonly activeCount: number;
      readonly concurrency: number;
      readonly readyTasks: readonly NormalizedTask[];
    }>) => {
      const { activeCount, readyTasks } = input;
      const effective = effectiveMaxParallel(rootMaxParallel, activeMaxParallelByCheckId);
      if (reservationTaskId !== undefined) {
        const reserved = readyTasks.find((task) => task.id === reservationTaskId);
        if (reserved !== undefined) {
          const prospective = Math.min(
            effective,
            requireTaskConcurrency(reserved, concurrencyByTaskId).maxParallel
          );
          return activeCount < prospective ? reserved : undefined;
        }
        reservationTaskId = undefined;
      }

      const tightening = orderConstrained(readyTasks.filter((task) => {
        const metadata = requireTaskConcurrency(task, concurrencyByTaskId);
        return metadata.activatesCap
          && !activeMaxParallelByCheckId.has(metadata.checkId)
          && metadata.maxParallel < effective;
      }));
      if (tightening.length > 0) {
        const candidate = tightening[0];
        const prospective = Math.min(
          effective,
          requireTaskConcurrency(candidate, concurrencyByTaskId).maxParallel
        );
        if (activeCount < prospective) return candidate;
        reservationTaskId = candidate.id;
        return undefined;
      }

      const activeConstrained = orderConstrained(readyTasks.filter((task) => {
        const metadata = requireTaskConcurrency(task, concurrencyByTaskId);
        return activeMaxParallelByCheckId.has(metadata.checkId)
          && metadata.maxParallel < rootMaxParallel
          && metadata.maxParallel === effective;
      }));
      if (activeConstrained.length > 0) {
        return activeCount < effective ? activeConstrained[0] : undefined;
      }

      return activeCount < effective ? readyTasks[0] : undefined;
    },
    onTaskAdmitted: (task: NormalizedTask) => {
      const metadata = requireTaskConcurrency(task, concurrencyByTaskId);
      if (metadata.activatesCap) {
        activeMaxParallelByCheckId.set(metadata.checkId, metadata.maxParallel);
      }
      if (reservationTaskId === task.id) reservationTaskId = undefined;
    },
    onTaskSettled: (task: NormalizedTask) => {
      const metadata = requireTaskConcurrency(task, concurrencyByTaskId);
      if (metadata.terminal) activeMaxParallelByCheckId.delete(metadata.checkId);
    }
  });
}
