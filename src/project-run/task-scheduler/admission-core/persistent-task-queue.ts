/**
 * Scheduler-private persistent leftist Task queue; smaller static preference ranks are selected first.
 * Membership and lifecycle stay with the ready/forced frontier owners. Mnemonist's mutable
 * array heap cannot preserve retained AdmissionState forks without copying the entire queue.
 */
export interface PersistentTaskQueue {
  readonly left: PersistentTaskQueue | undefined;
  readonly right: PersistentTaskQueue | undefined;
  /**
   * Shortest path to an empty child. Left-child null-path length is at least the right child's,
   * keeping the merge spine logarithmic.
   */
  readonly nullPathLength: number;
  readonly preferenceRank: number;
  readonly taskSlot: number;
}

export function queueWithTask(
  queue: PersistentTaskQueue | undefined,
  task: Readonly<{ taskSlot: number; preferenceRank: number }>
): PersistentTaskQueue {
  const leaf = Object.freeze({
    left: undefined,
    right: undefined,
    nullPathLength: 1,
    preferenceRank: task.preferenceRank,
    taskSlot: task.taskSlot
  });
  const next = mergeTaskQueues(queue, leaf);
  if (next === undefined) throw new Error("admission core Task insertion produced no queue");
  return next;
}

/** Copies only the right spine, retaining frozen subtrees in every predecessor and fork. */
export function mergeTaskQueues(
  left: PersistentTaskQueue | undefined,
  right: PersistentTaskQueue | undefined
): PersistentTaskQueue | undefined {
  if (left === undefined) return right;
  if (right === undefined) return left;
  if (left.preferenceRank > right.preferenceRank) return mergeTaskQueues(right, left);
  const mergedRight = mergeTaskQueues(left.right, right);
  const shouldKeepLeftChild =
    (left.left?.nullPathLength ?? 0) >= (mergedRight?.nullPathLength ?? 0);
  const nextLeft = shouldKeepLeftChild ? left.left : mergedRight;
  const nextRight = shouldKeepLeftChild ? mergedRight : left.left;
  return Object.freeze({
    left: nextLeft,
    right: nextRight,
    nullPathLength: (nextRight?.nullPathLength ?? 0) + 1,
    preferenceRank: left.preferenceRank,
    taskSlot: left.taskSlot
  });
}
