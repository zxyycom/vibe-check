import type { NormalizedTask } from "./definition/types.ts";

export interface TaskAdmissionController {
  selectNextReadyTask(input: Readonly<{
    readonly activeCount: number;
    readonly concurrency: number;
    readonly readyTasks: readonly NormalizedTask[];
  }>): NormalizedTask | undefined;
  onTaskAdmitted(task: NormalizedTask): void;
  onTaskSettled(task: NormalizedTask): void;
}

export interface TaskSchedulerOptions<TResult> {
  admissionController?: TaskAdmissionController;
  pending: NormalizedTask[];
  concurrency: number;
  execute: (task: NormalizedTask) => TResult | Promise<TResult>;
  onStart: (task: NormalizedTask) => unknown | Promise<unknown>;
  onComplete: (result: TResult, task: NormalizedTask) => unknown | Promise<unknown>;
}

interface StartTaskOptions<TResult> {
  task: NormalizedTask;
  execute: (task: NormalizedTask) => TResult | Promise<TResult>;
  onStart: (task: NormalizedTask) => unknown | Promise<unknown>;
  onComplete: (result: TResult, task: NormalizedTask) => unknown | Promise<unknown>;
  completedIds: Set<string>;
  runningMutexes: Set<string>;
  results: TResult[];
  onSettled: (task: NormalizedTask) => void;
  onError: (error: unknown) => void;
}

interface TaskScheduler<TResult> extends TaskSchedulerOptions<TResult> {
  completedIds: Set<string>;
  runningMutexes: Set<string>;
  results: TResult[];
  activeCount: number;
  settled: boolean;
}

export async function runTaskScheduler<TResult>(options: TaskSchedulerOptions<TResult>): Promise<TResult[]> {
  const scheduler = createTaskScheduler(options);

  await new Promise<void>((resolve, reject) => {
    const finishIfDone = () => {
      if (completeSchedulerIfDone(scheduler)) {
        resolve();
      }
    };

    const fail = (error: unknown) => {
      if (failScheduler(scheduler)) {
        reject(error);
      }
    };

    const schedule = () => {
      if (scheduler.settled) return;
      try {
        scheduleReadyTasks(scheduler, {
          onSettled: (task) => {
            scheduler.activeCount -= 1;
            scheduler.admissionController?.onTaskSettled(task);
            schedule();
            finishIfDone();
          },
          onError: fail
        });

        failIfBlocked(scheduler, fail);
        finishIfDone();
      } catch (error) {
        fail(error);
      }
    };

    schedule();
  });

  return scheduler.results;
}

function createTaskScheduler<TResult>(options: TaskSchedulerOptions<TResult>): TaskScheduler<TResult> {
  return {
    ...options,
    completedIds: new Set<string>(),
    runningMutexes: new Set<string>(),
    results: [],
    activeCount: 0,
    settled: false
  };
}

function scheduleReadyTasks<TResult>(
  scheduler: TaskScheduler<TResult>,
  callbacks: Pick<StartTaskOptions<TResult>, "onSettled" | "onError">
): void {
  while (scheduler.activeCount < scheduler.concurrency) {
    const readyTasks = scheduler.pending.filter((task) => (
      canRunTask(task, scheduler.completedIds, scheduler.runningMutexes)
    ));
    const task = selectNextReadyTask(scheduler, readyTasks);
    if (task === undefined) {
      break;
    }
    const nextIndex = scheduler.pending.indexOf(task);
    if (nextIndex === -1 || !readyTasks.includes(task)) {
      throw new TypeError("Task admission selected a task that is not ready");
    }
    scheduler.pending.splice(nextIndex, 1);
    scheduler.admissionController?.onTaskAdmitted(task);
    startTask({
      task,
      execute: scheduler.execute,
      onStart: scheduler.onStart,
      onComplete: scheduler.onComplete,
      completedIds: scheduler.completedIds,
      runningMutexes: scheduler.runningMutexes,
      results: scheduler.results,
      ...callbacks
    });
    scheduler.activeCount += 1;
  }
}

function failIfBlocked<TResult>(scheduler: TaskScheduler<TResult>, fail: (error: unknown) => void): void {
  if (scheduler.activeCount === 0 && scheduler.pending.length > 0) {
    fail(new Error(`unable to schedule tasks; unresolved dependencies or cycle: ${describePendingTasks(scheduler.pending, scheduler.completedIds)}`));
  }
}

function selectNextReadyTask<TResult>(
  scheduler: TaskScheduler<TResult>,
  readyTasks: readonly NormalizedTask[]
): NormalizedTask | undefined {
  if (readyTasks.length === 0) return undefined;
  const controller = scheduler.admissionController;
  if (controller === undefined) return readyTasks[0];
  const task = controller.selectNextReadyTask({
    activeCount: scheduler.activeCount,
    concurrency: scheduler.concurrency,
    readyTasks
  });
  if (task === undefined && scheduler.activeCount === 0) {
    throw new TypeError("Task admission controller blocked all ready tasks");
  }
  return task;
}

function completeSchedulerIfDone<TResult>(scheduler: TaskScheduler<TResult>): boolean {
  if (scheduler.settled || scheduler.pending.length > 0 || scheduler.activeCount > 0) {
    return false;
  }
  scheduler.settled = true;
  return true;
}

function failScheduler<TResult>(scheduler: TaskScheduler<TResult>): boolean {
  if (scheduler.settled) {
    return false;
  }
  scheduler.settled = true;
  return true;
}

function startTask<TResult>({
  task,
  execute,
  onStart,
  onComplete,
  completedIds,
  runningMutexes,
  results,
  onSettled,
  onError
}: StartTaskOptions<TResult>): void {
  for (const mutex of task.mutex) {
    runningMutexes.add(mutex);
  }

  void Promise.resolve()
    .then(() => onStart(task))
    .then(() => execute(task))
    .then((result) => {
      results.push(result);
      return onComplete(result, task);
    })
    .then(() => {
      completedIds.add(task.id);
    })
    .catch(onError)
    .finally(() => {
      for (const mutex of task.mutex) {
        runningMutexes.delete(mutex);
      }
      try {
        onSettled(task);
      } catch (error) {
        onError(error);
      }
    });
}

function canRunTask(task: NormalizedTask, completedIds: Set<string>, runningMutexes: Set<string>): boolean {
  return task.dependsOn.every((id) => completedIds.has(id))
    && task.mutex.every((mutex) => !runningMutexes.has(mutex));
}

function describePendingTasks(pending: readonly NormalizedTask[], completedIds: Set<string>): string {
  return pending
    .map((task) => {
      const blockedBy = task.dependsOn.filter((id) => !completedIds.has(id));
      return blockedBy.length > 0 ? `${task.id} waits for ${blockedBy.join(", ")}` : task.id;
    })
    .join("; ");
}
