import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

import { snapshotExactClosedRecord as before } from "./node_modules/before.ts";
import { snapshotExactClosedRecord as candidate } from "./node_modules/candidate.ts";

type Snapshot = typeof before;
type Variant = "before" | "candidate";
interface Workload {
  readonly keyShape: "short" | "shared-prefix";
  readonly keyCount: number;
  readonly iterations: number;
  readonly keys: readonly string[];
  readonly input: Readonly<Record<string, unknown>>;
}
interface Sample {
  readonly keyShape: Workload["keyShape"];
  readonly round: number;
  readonly variant: Variant;
  readonly keyCount: number;
  readonly iterations: number;
  readonly elapsedMs: number;
}

const variants: Readonly<Record<Variant, Snapshot>> = { before, candidate };
const scales = [
  { keyCount: 0, iterations: 500_000 },
  { keyCount: 4, iterations: 200_000 },
  { keyCount: 16, iterations: 100_000 },
  { keyCount: 255, iterations: 1_000 },
  { keyCount: 256, iterations: 1_000 },
  { keyCount: 257, iterations: 1_000 },
  { keyCount: 1024, iterations: 200 }
] as const;
const nested = { retained: true };
const callback = () => "retained";
const keyShapes = ["short", "shared-prefix"] as const;
const workloads: readonly Workload[] = keyShapes.flatMap((keyShape) =>
  scales.map(({ keyCount, iterations }) => {
    const entries = Array.from({ length: keyCount }, (_, index): readonly [string, unknown] => [
      keyShape === "short"
        ? `r${index}`
        : `project-file-region-with-a-shared-namespace-prefix-${String(index).padStart(5, "0")}`,
      index % 2 === 0 ? nested : callback
    ]);
    const input: Readonly<Record<string, unknown>> = Object.fromEntries<unknown>(entries);
    return { keyShape, keyCount, iterations, keys: Object.freeze(Object.keys(input)), input };
  })
);

function verify(snapshot: Snapshot): void {
  for (const workload of workloads) {
    for (const keys of [workload.keys, [...workload.keys].reverse()]) {
      const result = snapshot(workload.input, keys);
      assert.ok(result !== undefined);
      assert.notEqual(result, workload.input);
      assert.deepEqual(Object.keys(result), Object.keys(workload.input));
      assert.equal(Object.getPrototypeOf(result), Object.prototype);
      assert.equal(Object.isFrozen(result), true);
      for (const key of workload.keys) assert.equal(result[key], workload.input[key]);
    }
    const nonIterableKeys = [...workload.keys];
    Object.defineProperty(nonIterableKeys, Symbol.iterator, {
      value() {
        throw new Error("caller key iteration must not run");
      }
    });
    assert.deepEqual(snapshot(workload.input, nonIterableKeys), workload.input);
    const mismatched = workload.keys.map((key, index) => (index === 0 ? "absent" : key));
    if (workload.keyCount > 0) assert.equal(snapshot(workload.input, mismatched), undefined);
    assert.equal(snapshot(workload.input, [...workload.keys, "absent"]), undefined);
  }
  const special: Readonly<Record<string, unknown>> = Object.fromEntries<unknown>([
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
  assert.deepEqual(
    snapshot(Object.assign(Object.create(null), special), Object.keys(special)),
    special
  );
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
  assert.equal(
    snapshot(Object.defineProperty({}, "field", { value: nested }), ["field"]),
    undefined
  );
  assert.equal(
    snapshot(
      new Proxy(
        {},
        {
          ownKeys() {
            throw new Error("reflection fault");
          }
        }
      ),
      []
    ),
    undefined
  );
}

function measure(snapshot: Snapshot, workload: Workload, iterations: number): number {
  const started = performance.now();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    snapshot(workload.input, workload.keys);
  }
  return performance.now() - started;
}

const mode = process.argv[2];
if (process.argv.length !== 3 || (mode !== "smoke" && mode !== "measure")) {
  throw new Error("usage: harness.mjs smoke|measure");
}
verify(before);
verify(candidate);
if (mode === "smoke") {
  process.stdout.write("verified both variants across all shapes and scales\n");
} else {
  const startedAt = new Date().toISOString();
  const samples: Sample[] = [];
  for (const workload of workloads) {
    const warmupIterations = workload.keyCount <= 16 ? 20_000 : 500;
    for (const snapshot of [before, candidate]) measure(snapshot, workload, warmupIterations);
    for (let round = 0; round < 8; round += 1) {
      const order: readonly Variant[] =
        round % 2 === 0 ? ["before", "candidate"] : ["candidate", "before"];
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
  const digest = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
  process.stdout.write(
    `${JSON.stringify(
      {
        protocol: "exact-public-snapshot-ab-ba-v1",
        startedAt,
        finishedAt: new Date().toISOString(),
        runtime: process.version,
        compiledBy: "Bun 1.3.14",
        warmupRule: "K<=16:20000;else:500 per variant per workload",
        platform: process.platform,
        architecture: process.arch,
        sourceSha256: {
          harness: digest(new URL("./harness.mjs", import.meta.url).pathname),
          before: digest(new URL("./node_modules/before.ts", import.meta.url).pathname),
          candidate: digest(new URL("./node_modules/candidate.ts", import.meta.url).pathname)
        },
        samples
      },
      null,
      2
    )}\n`
  );
}
