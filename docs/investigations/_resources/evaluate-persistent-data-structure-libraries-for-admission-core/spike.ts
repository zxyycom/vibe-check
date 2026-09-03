import assert from "node:assert/strict";

import { List as ImmutableList } from "immutable";
import { MaxHeap } from "mnemonist";
import { MaxPriorityQueue } from "@datastructures-js/priority-queue";
import { List as RimbuList } from "@rimbu/list";
import { SortedSet } from "@rimbu/sorted";

const TASK_COUNT = 4096;
const CHUNK_SIZE = 64;
const TRANSITIONS = 512;
const FORCED_ADDITIONS = 80;
const WARMUP_SAMPLES = 5;
const MEASURED_SAMPLES = 15;
const REPEATS_PER_SAMPLE = 8;

declare const Bun: { readonly version: string };

type ChunkTree =
  | Readonly<{ readonly kind: "leaf"; readonly start: number; readonly end: number; readonly values: readonly number[] }>
  | Readonly<{ readonly kind: "branch"; readonly start: number; readonly end: number; readonly left: ChunkTree; readonly right: ChunkTree }>;
type CurrentChunkVector = Readonly<{ readonly length: number; readonly root: ChunkTree | undefined }>;
type LeftistHeap =
  | undefined
  | Readonly<{ readonly taskSlot: number; readonly rank: number; readonly left: LeftistHeap; readonly right: LeftistHeap }>;

function buildChunkTree(leaves: readonly (readonly number[])[], start = 0, end = leaves.length): ChunkTree | undefined {
  if (start === end) return undefined;
  if (end - start === 1) {
    const values = leaves[start];
    if (values === undefined) throw new Error("missing chunk leaf");
    return Object.freeze({ end, kind: "leaf", start, values });
  }
  const middle = start + Math.floor((end - start) / 2);
  const left = buildChunkTree(leaves, start, middle);
  const right = buildChunkTree(leaves, middle, end);
  if (left === undefined || right === undefined) throw new Error("incomplete chunk tree");
  return Object.freeze({ end, kind: "branch", left, right, start });
}

function currentVector(values: readonly number[]): CurrentChunkVector {
  const leaves: readonly (readonly number[])[] = Array.from(
    { length: Math.ceil(values.length / CHUNK_SIZE) },
    (_, chunk) => Object.freeze([...values.slice(chunk * CHUNK_SIZE, (chunk + 1) * CHUNK_SIZE)])
  );
  return Object.freeze({ length: values.length, root: buildChunkTree(leaves) });
}

function chunkFor(root: ChunkTree | undefined, chunkSlot: number): readonly number[] {
  let node = root;
  while (node?.kind === "branch") node = chunkSlot < node.left.end ? node.left : node.right;
  if (node?.kind !== "leaf" || node.start !== chunkSlot) throw new Error("missing chunk");
  return node.values;
}

function withChunkAt(root: ChunkTree | undefined, chunkSlot: number, values: readonly number[]): ChunkTree {
  if (root === undefined) throw new Error("missing root");
  if (root.kind === "leaf") {
    if (root.start !== chunkSlot) throw new Error("missing chunk leaf");
    return Object.freeze({ ...root, values: Object.freeze([...values]) });
  }
  if (chunkSlot < root.left.end) return Object.freeze({ ...root, left: withChunkAt(root.left, chunkSlot, values) });
  return Object.freeze({ ...root, right: withChunkAt(root.right, chunkSlot, values) });
}

function currentGet(vector: CurrentChunkVector, index: number): number {
  if (index < 0 || index >= vector.length) throw new RangeError("index");
  return chunkFor(vector.root, Math.floor(index / CHUNK_SIZE))[index % CHUNK_SIZE]!;
}

function currentUpdate(vector: CurrentChunkVector, index: number, value: number): CurrentChunkVector {
  if (index < 0 || index >= vector.length) throw new RangeError("index");
  const chunkSlot = Math.floor(index / CHUNK_SIZE);
  const updated = [...chunkFor(vector.root, chunkSlot)];
  updated[index % CHUNK_SIZE] = value;
  return Object.freeze({ length: vector.length, root: withChunkAt(vector.root, chunkSlot, updated) });
}

function rank(queue: LeftistHeap): number {
  return queue?.rank ?? 0;
}

function merge(left: LeftistHeap, right: LeftistHeap): LeftistHeap {
  if (left === undefined) return right;
  if (right === undefined) return left;
  if (left.taskSlot < right.taskSlot) return merge(right, left);
  const mergedRight = merge(left.right, right);
  const nextLeft = rank(left.left) >= rank(mergedRight) ? left.left : mergedRight;
  const nextRight = nextLeft === left.left ? mergedRight : left.left;
  return Object.freeze({ left: nextLeft, rank: rank(nextRight) + 1, right: nextRight, taskSlot: left.taskSlot });
}

function currentPush(queue: LeftistHeap, taskSlot: number): LeftistHeap {
  return merge(queue, Object.freeze({ left: undefined, rank: 1, right: undefined, taskSlot }));
}

function currentPop(queue: LeftistHeap): readonly [number | undefined, LeftistHeap] {
  if (queue === undefined) return [undefined, undefined];
  return [queue.taskSlot, merge(queue.left, queue.right)];
}

function slots(): readonly number[] {
  return Object.freeze(Array.from({ length: TASK_COUNT }, (_, index) => index));
}

function quantiles(samples: readonly number[]): Readonly<{ readonly p50: number; readonly p95: number }> {
  const ordered = [...samples].sort((left, right) => left - right);
  const at = (fraction: number): number => ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)]!;
  return Object.freeze({ p50: at(0.5), p95: at(0.95) });
}

function benchmark(name: string, operation: () => number): Readonly<{ readonly name: string; readonly checksum: number; readonly p50Ms: number; readonly p95Ms: number }> {
  let checksum = 0;
  for (let sample = 0; sample < WARMUP_SAMPLES; sample += 1) checksum += operation();
  const samples = Array.from({ length: MEASURED_SAMPLES }, () => {
    const started = performance.now();
    for (let repeat = 0; repeat < REPEATS_PER_SAMPLE; repeat += 1) checksum += operation();
    return performance.now() - started;
  });
  const stats = quantiles(samples);
  return Object.freeze({ checksum, name, p50Ms: stats.p50, p95Ms: stats.p95 });
}

function assertPersistentVectorContracts(): void {
  const values = slots();
  const current = currentVector(values);
  const currentNext = currentUpdate(current, 2048, -1);
  assert.equal(currentGet(current, 2048), 2048);
  assert.equal(currentGet(currentNext, 2048), -1);

  const immutable = ImmutableList(values);
  const immutableNext = immutable.set(2048, -1);
  assert.equal(immutable.get(2048), 2048);
  assert.equal(immutableNext.get(2048), -1);

  const rimbu = RimbuList.from(values);
  const rimbuNext = rimbu.updateAt(2048, -1);
  assert.equal(rimbu.get(2048), 2048);
  assert.equal(rimbuNext.get(2048), -1);
}

function assertQueueContracts(): void {
  let current: LeftistHeap;
  for (const slot of [4, 2, 7, 7, 1]) current = currentPush(current, slot);
  const [max, currentRest] = currentPop(current);
  assert.equal(max, 7);
  assert.equal(current?.taskSlot, 7);
  assert.equal(currentRest?.taskSlot, 7);

  const ordered = SortedSet.of(4, 2, 7, 7, 1).asNormal();
  const orderedWithMax = ordered.add(9);
  const orderedMax = orderedWithMax.max();
  assert.equal(ordered.max(), 7);
  assert.equal(orderedMax, 9);
  assert.equal(orderedWithMax.remove(orderedMax!).max(), 7);
  assert.equal(ordered.size, 4, "SortedSet deduplicates equal task slots");

  const mnemonist = new MaxHeap<number>();
  const mnemonistAlias = mnemonist;
  mnemonist.push(9);
  assert.equal(mnemonistAlias.peek(), 9, "Mnemonist changes an existing alias in place");

  const priorityQueue = new MaxPriorityQueue<number>();
  const priorityQueueAlias = priorityQueue;
  priorityQueue.enqueue(9);
  assert.equal(priorityQueueAlias.front(), 9, "datastructures-js changes an existing alias in place");

}

function currentVectorWorkload(): number {
  let state = currentVector(slots());
  const retained: CurrentChunkVector[] = [state];
  for (let step = 0; step < TRANSITIONS; step += 1) {
    const index = (step * 97) % TASK_COUNT;
    state = currentUpdate(state, index, -step - 1);
    retained.push(state);
  }
  return retained.reduce((sum, branch) => sum + currentGet(branch, (sum + 31) % TASK_COUNT), 0);
}

function immutableVectorWorkload(): number {
  let state = ImmutableList(slots());
  const retained = [state];
  for (let step = 0; step < TRANSITIONS; step += 1) {
    const index = (step * 97) % TASK_COUNT;
    state = state.set(index, -step - 1);
    retained.push(state);
  }
  return retained.reduce((sum, branch) => sum + branch.get((sum + 31) % TASK_COUNT)!, 0);
}

function rimbuVectorWorkload(): number {
  let state = RimbuList.from(slots());
  const retained = [state];
  for (let step = 0; step < TRANSITIONS; step += 1) {
    const index = (step * 97) % TASK_COUNT;
    state = state.updateAt(index, -step - 1);
    retained.push(state);
  }
  return retained.reduce((sum, branch) => sum + branch.get((sum + 31) % TASK_COUNT)!, 0);
}

function currentQueueWorkload(): number {
  let queue: LeftistHeap;
  for (const slot of slots()) queue = currentPush(queue, slot);
  const retained: LeftistHeap[] = [queue];
  for (let branch = 0; branch < 64; branch += 1) {
    let next = queue;
    for (let offset = 0; offset < FORCED_ADDITIONS; offset += 1) next = currentPush(next, TASK_COUNT + branch * FORCED_ADDITIONS + offset);
    for (let offset = 0; offset < FORCED_ADDITIONS; offset += 1) {
      const [popped, rest] = currentPop(next);
      if (popped === undefined) throw new Error("unexpected empty current queue");
      next = rest;
    }
    retained.push(next);
  }
  return retained.reduce((sum, branch) => sum + (branch?.taskSlot ?? 0), 0);
}

function rimbuQueueWorkload(): number {
  let queue = SortedSet.from(slots());
  const retained = [queue];
  for (let branch = 0; branch < 64; branch += 1) {
    let next = queue;
    for (let offset = 0; offset < FORCED_ADDITIONS; offset += 1) next = next.add(TASK_COUNT + branch * FORCED_ADDITIONS + offset);
    for (let offset = 0; offset < FORCED_ADDITIONS; offset += 1) {
      const popped = next.max();
      if (popped === undefined) throw new Error("unexpected empty Rimbu sorted set");
      next = next.remove(popped);
    }
    retained.push(next);
  }
  return retained.reduce((sum, branch) => sum + (branch.max() ?? 0), 0);
}

assertPersistentVectorContracts();
assertQueueContracts();

const result = Object.freeze({
  environment: Object.freeze({ bunVersion: Bun.version, platform: process.platform, runtime: "Bun" }),
  workload: Object.freeze({
    branchCount: 64,
    forcedAdditionsPerBranch: FORCED_ADDITIONS,
    measuredSamples: MEASURED_SAMPLES,
    repeatsPerSample: REPEATS_PER_SAMPLE,
    taskCount: TASK_COUNT,
    transitions: TRANSITIONS,
    warmupSamples: WARMUP_SAMPLES
  }),
  semantics: Object.freeze({
    currentChunkVector: "predecessor remains readable after a 4096-slot point update",
    currentLeftistQueue: "max pop preserves predecessor; equal slots are retained by the raw heap but actual admission enqueue deduplicates ready slots",
    mnemonist: "mutable; cannot represent an immutable predecessor",
    rimbuList: "predecessor remains readable after updateAt",
    rimbuSortedSet: "max/remove is persistent; equal values deduplicate, matching the admission core ready-slot Set before enqueue",
    thirdPartyPriorityQueue: "mutable; cannot represent an immutable predecessor"
  }),
  benchmarks: Object.freeze([
    benchmark("vector/current-derived-64-slot-chunk-tree", currentVectorWorkload),
    benchmark("vector/immutable-js-list", immutableVectorWorkload),
    benchmark("vector/rimbu-list", rimbuVectorWorkload),
    benchmark("frontier/current-derived-leftist-max-heap", currentQueueWorkload),
    benchmark("frontier/rimbu-sorted-set-max-remove", rimbuQueueWorkload)
  ])
});

console.log(JSON.stringify(result, null, 2));
