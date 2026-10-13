// tmp/low-risk-optimization-20261013/exact-keys/threshold/harness.ts
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

// tmp/low-risk-optimization-20261013/exact-keys/threshold/node_modules/before.ts
function ownDataShape(value) {
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  const keys = [];
  for (const key of ownKeys) {
    if (typeof key !== "string")
      return;
    keys.push(key);
  }
  if (keys.some((key) => {
    const descriptor = descriptors[key];
    if (descriptor === undefined)
      return true;
    return descriptor.get !== undefined || descriptor.set !== undefined;
  }))
    return;
  return { descriptors, keys };
}
function snapshotClosedRecord(value) {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      return;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null)
      return;
    const shape = ownDataShape(value);
    if (shape === undefined || shape.keys.some((key) => shape.descriptors[key]?.enumerable !== true)) {
      return;
    }
    const entries = shape.keys.map((key) => {
      const descriptor = shape.descriptors[key];
      if (descriptor === undefined)
        throw new TypeError(`Missing own descriptor: ${key}`);
      return [key, descriptor.value];
    });
    return Object.freeze(Object.fromEntries(entries));
  } catch {
    return;
  }
}
function snapshotExactClosedRecord(value, keys) {
  const record = snapshotClosedRecord(value);
  return record !== undefined && hasExactPlainRecordKeys(record, keys) ? record : undefined;
}
function hasExactPlainRecordKeys(value, keys) {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}

// tmp/low-risk-optimization-20261013/exact-keys/threshold/node_modules/candidate.ts
var linearExactKeySearchLimit = 64;
function ownDataShape2(value) {
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  const keys = [];
  for (const key of ownKeys) {
    if (typeof key !== "string")
      return;
    keys.push(key);
  }
  if (keys.some((key) => {
    const descriptor = descriptors[key];
    if (descriptor === undefined)
      return true;
    return descriptor.get !== undefined || descriptor.set !== undefined;
  }))
    return;
  return { descriptors, keys };
}
function snapshotClosedRecord2(value) {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      return;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null)
      return;
    const shape = ownDataShape2(value);
    if (shape === undefined || shape.keys.some((key) => shape.descriptors[key]?.enumerable !== true)) {
      return;
    }
    const entries = shape.keys.map((key) => {
      const descriptor = shape.descriptors[key];
      if (descriptor === undefined)
        throw new TypeError(`Missing own descriptor: ${key}`);
      return [key, descriptor.value];
    });
    return Object.freeze(Object.fromEntries(entries));
  } catch {
    return;
  }
}
function snapshotExactClosedRecord2(value, keys) {
  const record = snapshotClosedRecord2(value);
  return record !== undefined && hasExactPlainRecordKeys2(record, keys) ? record : undefined;
}
function hasExactPlainRecordKeys2(value, keys) {
  const actualKeys = Object.keys(value);
  if (actualKeys.length !== keys.length)
    return false;
  if (keys.length <= linearExactKeySearchLimit) {
    return actualKeys.every((key) => keys.includes(key));
  }
  const unmatchedKeys = new Set(actualKeys);
  for (let index = 0;index < keys.length; index += 1) {
    const key = keys[index];
    if (key === undefined || !unmatchedKeys.delete(key))
      return false;
  }
  return true;
}

// tmp/low-risk-optimization-20261013/exact-keys/threshold/harness.ts
var variants = { before: snapshotExactClosedRecord, candidate: snapshotExactClosedRecord2 };
var scales = [
  { keyCount: 0, iterations: 1e5 },
  { keyCount: 1, iterations: 1e5 },
  { keyCount: 2, iterations: 1e5 },
  { keyCount: 4, iterations: 50000 },
  { keyCount: 8, iterations: 30000 },
  { keyCount: 16, iterations: 20000 },
  { keyCount: 32, iterations: 1e4 },
  { keyCount: 63, iterations: 5000 },
  { keyCount: 64, iterations: 5000 },
  { keyCount: 65, iterations: 5000 },
  { keyCount: 128, iterations: 2000 },
  { keyCount: 256, iterations: 1000 },
  { keyCount: 1024, iterations: 200 }
];
var nested = { retained: true };
var callback = () => "retained";
var keyShapes = ["short", "shared-prefix"];
var workloads = keyShapes.flatMap((keyShape) => scales.map(({ keyCount, iterations }) => {
  const entries = Array.from({ length: keyCount }, (_, index) => [
    keyShape === "short" ? `r${index}` : `project-file-region-with-a-shared-namespace-prefix-${String(index).padStart(5, "0")}`,
    index % 2 === 0 ? nested : callback
  ]);
  const input = Object.fromEntries(entries);
  return { keyShape, keyCount, iterations, keys: Object.freeze(Object.keys(input)), input };
}));
function verify(snapshot) {
  for (const workload of workloads) {
    for (const keys of [workload.keys, [...workload.keys].reverse()]) {
      const result = snapshot(workload.input, keys);
      assert.ok(result !== undefined);
      assert.notEqual(result, workload.input);
      assert.deepEqual(Object.keys(result), Object.keys(workload.input));
      assert.equal(Object.getPrototypeOf(result), Object.prototype);
      assert.equal(Object.isFrozen(result), true);
      for (const key of workload.keys)
        assert.equal(result[key], workload.input[key]);
    }
    const nonIterableKeys2 = [...workload.keys];
    Object.defineProperty(nonIterableKeys2, Symbol.iterator, {
      value() {
        throw new Error("caller key iteration must not run");
      }
    });
    assert.deepEqual(snapshot(workload.input, nonIterableKeys2), workload.input);
    const mismatched = workload.keys.map((key, index) => index === 0 ? "absent" : key);
    if (workload.keyCount > 0)
      assert.equal(snapshot(workload.input, mismatched), undefined);
    assert.equal(snapshot(workload.input, [...workload.keys, "absent"]), undefined);
  }
  const special = Object.fromEntries([
    ["__proto__", nested],
    ["constructor", callback],
    ["10", undefined],
    ["2", -0]
  ]);
  assert.deepEqual(snapshot(special, ["2", "__proto__", "10", "constructor"]), special);
  const nonIterableKeys = ["2", "__proto__", "10", "constructor"];
  Object.defineProperty(nonIterableKeys, Symbol.iterator, {
    value() {
      throw new Error("keys iteration must not run");
    }
  });
  assert.deepEqual(snapshot(special, nonIterableKeys), special);
  assert.deepEqual(snapshot(Object.assign(Object.create(null), special), Object.keys(special)), special);
  let getterCalls = 0;
  const accessor = Object.defineProperty({}, "field", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return nested;
    }
  });
  assert.equal(snapshot(accessor, ["field"]), undefined);
  assert.equal(getterCalls, 0);
  assert.equal(snapshot({ [Symbol("field")]: nested }, []), undefined);
  assert.equal(snapshot(Object.defineProperty({}, "field", { value: nested }), ["field"]), undefined);
  assert.equal(snapshot(new Proxy({}, {
    ownKeys() {
      throw new Error("reflection fault");
    }
  }), []), undefined);
}
function measure(snapshot, workload, iterations) {
  const started = performance.now();
  for (let iteration = 0;iteration < iterations; iteration += 1) {
    snapshot(workload.input, workload.keys);
  }
  return performance.now() - started;
}
var mode = process.argv[2];
if (process.argv.length !== 3 || mode !== "smoke" && mode !== "measure") {
  throw new Error("usage: harness.mjs smoke|measure");
}
verify(snapshotExactClosedRecord);
verify(snapshotExactClosedRecord2);
if (mode === "smoke") {
  process.stdout.write(`verified both variants across all shapes and scales
`);
} else {
  const startedAt = new Date().toISOString();
  const samples = [];
  for (const workload of workloads) {
    for (const snapshot of [snapshotExactClosedRecord, snapshotExactClosedRecord2])
      measure(snapshot, workload, 500);
    for (let round = 0;round < 8; round += 1) {
      const order = round % 2 === 0 ? ["before", "candidate"] : ["candidate", "before"];
      for (const variant of order) {
        samples.push({
          keyShape: workload.keyShape,
          round,
          variant,
          keyCount: workload.keyCount,
          iterations: workload.iterations,
          elapsedMs: measure(variants[variant], workload, workload.iterations)
        });
      }
    }
  }
  const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
  process.stdout.write(`${JSON.stringify({
    protocol: "exact-public-snapshot-ab-ba-v1",
    startedAt,
    finishedAt: new Date().toISOString(),
    runtime: process.version,
    compiledBy: "Bun 1.3.14",
    platform: process.platform,
    architecture: process.arch,
    sourceSha256: {
      harness: digest(new URL("./harness.mjs", import.meta.url).pathname),
      before: digest(new URL("./node_modules/before.ts", import.meta.url).pathname),
      candidate: digest(new URL("./node_modules/candidate.ts", import.meta.url).pathname)
    },
    samples
  }, null, 2)}
`);
}
