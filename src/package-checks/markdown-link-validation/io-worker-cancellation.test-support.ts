import * as filesystem from "node:fs";
import { workerData } from "node:worker_threads";
import { mock } from "bun:test";

const context: unknown = workerData;
if (
  typeof context !== "object" ||
  context === null ||
  !("observation" in context) ||
  !(context.observation instanceof SharedArrayBuffer)
) {
  throw new Error("Expected the read-observation buffer");
}
const observation = new Int32Array(context.observation);
const readSync = filesystem.readSync;
const closeSync = filesystem.closeSync;

/** Pause after a real read syscall; the parent controls cancellation without terminating the Worker. */
mock.module("node:fs", () => ({
  ...filesystem,
  readSync(
    descriptor: number,
    bytes: NodeJS.ArrayBufferView,
    offset: number,
    length: number,
    position: number | null
  ): number {
    const count = readSync(descriptor, bytes, offset, length, position);
    Atomics.add(observation, 3, 1);
    Atomics.store(observation, 0, 1);
    Atomics.notify(observation, 0);
    while (Atomics.load(observation, 1) === 0) Atomics.wait(observation, 1, 0);
    return count;
  },
  closeSync(descriptor: number): void {
    closeSync(descriptor);
    Atomics.add(observation, 2, 1);
  }
}));

await import("./io-worker.ts");
