import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

/** Child isolation keeps built-in mocks out of lint and resolver tests. */
export function assertBoundedReadDrivers(): void {
  const child = spawnSync(
    process.execPath,
    [
      "--eval",
      `
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as asyncFs from "node:fs/promises";
import { mock } from "bun:test";
const NativeBytes = Uint8Array;
const flag = new Int32Array(new SharedArrayBuffer(4));
let scenario;
let allocations = [];
let calls = [];
let chunkIndex = 0;
function open() {
  calls.push("open");
  if (scenario.fail === "open") throw new Error("open");
  if (scenario.cancel === "open") Atomics.store(flag, 0, 1);
  return 7;
}
function stat() {
  calls.push("stat");
  if (scenario.fail === "stat") throw new Error("stat");
  if (scenario.cancel === "stat") Atomics.store(flag, 0, 1);
  return { isFile: () => scenario.regular !== false, size: scenario.size };
}
function read(fd, bytes, offset, length, position) {
  assert.equal(fd, 7);
  assert.equal(position, offset);
  calls.push("read");
  if (scenario.fail === "read") throw new Error("read");
  if (scenario.cancel === "read") Atomics.store(flag, 0, 1);
  const chunk = scenario.chunks[chunkIndex++] ?? [];
  assert.ok(chunk.length <= length, "fixture respects requested remaining capacity");
  bytes.set(chunk, offset);
  return chunk.length;
}
function close() {
  calls.push("close");
  if (scenario.cancel === "close") Atomics.store(flag, 0, 1);
  if (scenario.fail === "close") throw new Error("close");
}
mock.module("node:fs", () => ({ ...fs,
  openSync: open, fstatSync: stat, readSync: read, closeSync: close
}));
mock.module("node:fs/promises", () => ({ ...asyncFs, open: async () => {
  open();
  return { stat: async () => stat(),
    read: async (bytes, offset, length, position) => ({ bytesRead: read(7, bytes, offset, length, position) }),
    close: async () => close() };
} }));
const { readRegularFile } = await import("./src/package-checks/markdown-link-validation/filesystem-probes.ts");
const { readRegularFileNative, IoCancelled } = await import("./src/package-checks/markdown-link-validation/io-native.ts");
const cases = [
  { size: 0, max: 8, chunks: [], bytes: [], allocations: [1, 0] },
  { size: 3, max: 8, chunks: [[1,2,3]], bytes: [1,2,3], allocations: [4, 3] },
  { size: 0, max: 8, chunks: [[1], [2], [3,4], [5,6,7,8]], bytes: [1,2,3,4,5,6,7,8], allocations: [1,2,4,8,9,8] },
  { size: 4, max: 4, chunks: [[1,2,3,4]], bytes: [1,2,3,4], allocations: [5,4] },
  { size: 4, max: 4, chunks: [[1,2,3,4,5]], reason: "too-large", allocations: [5] },
  { size: 8, max: 8, chunks: [[1],[2]], bytes: [1,2], allocations: [9,2] },
  { size: 0, max: 8, regular: false, chunks: [], reason: "unavailable", allocations: [] },
  { size: 9, max: 8, chunks: [], reason: "too-large", allocations: [] },
  ...["open", "stat", "read"].map(fail => ({ size: 0, max: 8, chunks: [], fail, reason: "unavailable" })),
  { size: 0, max: 8, chunks: [], fail: "close", bytes: [] },
  ...[1_048_576, 16_777_216].flatMap(max => [
    { size: max, max, chunks: [new NativeBytes(max)], bytesLength: max, allocations: [max+1,max] },
    { size: max+1, max, chunks: [], reason: "too-large", allocations: [] }
  ])
];
for (const native of [false, true]) {
  for (scenario of cases) {
    calls = []; allocations = []; chunkIndex = 0;
    Atomics.store(flag, 0, 0);
    globalThis.Uint8Array = class extends NativeBytes {
      constructor(...args) { super(...args); if (typeof args[0] === "number") allocations.push(args[0]); }
    };
    let result;
    try { result = native ? readRegularFileNative("/fixture.md", scenario.max, flag) : await readRegularFile("/fixture.md", scenario.max); }
    finally { globalThis.Uint8Array = NativeBytes; }
    assert.equal(result.ok, scenario.reason === undefined);
    if (result.ok) {
      assert.equal(result.bytes.length, scenario.bytesLength ?? scenario.bytes.length);
      assert.equal(result.bytes.buffer.byteLength, result.bytes.length, "publication is an exact copy");
      if (scenario.bytes) assert.deepEqual([...result.bytes], scenario.bytes);
    } else assert.equal(result.reason, scenario.reason);
    if (scenario.allocations) assert.deepEqual(allocations, scenario.allocations);
    assert.equal(calls.filter(c => c === "close").length, scenario.fail === "open" ? 0 : 1);
    if (scenario.regular === false || scenario.size > scenario.max) assert.equal(calls.includes("read"), false);
  }
}
for (const cancel of ["before", "open", "stat", "read", "close"]) {
  scenario = { size: 0, max: 8, chunks: [], cancel };
  calls = []; allocations = []; chunkIndex = 0;
  Atomics.store(flag, 0, cancel === "before" ? 1 : 0);
  assert.throws(() => readRegularFileNative("/fixture.md", 8, flag), IoCancelled);
  assert.equal(calls.filter(c => c === "close").length, cancel === "before" ? 0 : 1);
  if (cancel === "open") assert.deepEqual(calls, ["open", "close"]);
  if (cancel === "stat") assert.deepEqual(calls, ["open", "stat", "close"]);
}
`
    ],
    { encoding: "utf8", timeout: 20_000 }
  );
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
}
