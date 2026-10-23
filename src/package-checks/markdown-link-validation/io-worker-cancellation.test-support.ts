import * as filesystem from "node:fs";
import { workerData } from "node:worker_threads";
import { mock } from "bun:test";

import {
  IO_OBSERVATION,
  isNativeOperation,
  type NativeOperation
} from "./io-worker-observation.test-support.ts";

const context: unknown = workerData;
if (
  typeof context !== "object" ||
  context === null ||
  !("observation" in context) ||
  !(context.observation instanceof SharedArrayBuffer) ||
  context.observation.byteLength !== IO_OBSERVATION.byteLength ||
  !("operation" in context) ||
  !isNativeOperation(context.operation)
) {
  throw new Error("Expected the native-operation observation buffer and operation");
}
const observation = new Int32Array(context.observation);
const operation = context.operation;
const lstatSync = filesystem.lstatSync;
const readlinkSync = filesystem.readlinkSync;
const openSync = filesystem.openSync;
const fstatSync = filesystem.fstatSync;
const readSync = filesystem.readSync;
const closeSync = filesystem.closeSync;

function pauseAfterNativeOperation(completed: NativeOperation): void {
  if (operation !== completed) return;
  Atomics.store(observation, IO_OBSERVATION.entered, 1);
  Atomics.notify(observation, IO_OBSERVATION.entered);
  while (Atomics.load(observation, IO_OBSERVATION.released) === 0)
    Atomics.wait(observation, IO_OBSERVATION.released, 0);
}

/** Pause at a real native return boundary, before production checks the shared cancellation flag. */
mock.module("node:fs", () => ({
  ...filesystem,
  lstatSync(target: filesystem.PathLike): filesystem.Stats {
    const status = lstatSync(target);
    pauseAfterNativeOperation("lstat");
    return status;
  },
  readlinkSync(target: filesystem.PathLike): string {
    const destination = readlinkSync(target);
    pauseAfterNativeOperation("readlink");
    return destination;
  },
  openSync(target: filesystem.PathLike, flags: number): number {
    const descriptor = openSync(target, flags);
    Atomics.add(observation, IO_OBSERVATION.openCount, 1);
    pauseAfterNativeOperation("open");
    return descriptor;
  },
  fstatSync(descriptor: number): filesystem.Stats {
    const status = fstatSync(descriptor);
    pauseAfterNativeOperation("fstat");
    return status;
  },
  readSync(
    descriptor: number,
    bytes: NodeJS.ArrayBufferView,
    offset: number,
    length: number,
    position: number | null
  ): number {
    const count = readSync(descriptor, bytes, offset, length, position);
    Atomics.add(observation, IO_OBSERVATION.readCount, 1);
    pauseAfterNativeOperation("read");
    return count;
  },
  closeSync(descriptor: number): void {
    closeSync(descriptor);
    Atomics.add(observation, IO_OBSERVATION.closeCount, 1);
    pauseAfterNativeOperation("close");
  }
}));

await import("./io-worker.ts");
