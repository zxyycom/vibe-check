import assert from "node:assert/strict";
import { inspectStrictJsonBytes as baseline } from "./momoa-control.ts";
import { inspectNativeBytes as candidate } from "./native-iterative-prototype.ts";
import { loadWorkloads, semanticSources } from "./corpus.ts";

const packPath = process.argv[2];
assert.ok(packPath !== undefined);
const encode = (source: string) => new TextEncoder().encode(source);
const inputs = [
  ...semanticSources().map(encode),
  new Uint8Array([0xef, 0xbb, 0xbf, 0xff]),
  new Uint8Array([0xc3, 0x28]),
  ...loadWorkloads(packPath).flatMap(({ documents }) => documents)
];
let mismatches = 0;
const examples: unknown[] = [];
for (const [index, bytes] of inputs.entries()) {
  const before = baseline(bytes);
  const after = candidate(bytes);
  try {
    assert.deepEqual(after, before);
  } catch {
    mismatches += 1;
    if (examples.length < 10)
      examples.push({ index, baseline: before.kind, candidate: after.kind });
  }
  if (after.kind === "valid") {
    const pending: unknown[] = [after.jsonValue];
    while (pending.length > 0) {
      const value = pending.pop();
      if (typeof value !== "object" || value === null) continue;
      assert.equal(Object.isFrozen(value), true);
      if (!Array.isArray(value)) assert.equal(Object.getPrototypeOf(value), null);
      for (const key of Object.keys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        assert.ok(descriptor !== undefined && "value" in descriptor);
        assert.equal(descriptor.writable, false);
        assert.equal(descriptor.configurable, false);
        pending.push(descriptor.value);
      }
    }
  }
}
// Independent expected outcomes, rather than relying solely on an old-implementation oracle.
for (const [source, reason] of [
  ['{"a":0,"a":0}', "duplicate-key"],
  ['{"a":0,"\\u0061":1}', "duplicate-key"],
  ['{"a":0,"a":0,}', "invalid-json"]
] as const)
  assert.deepEqual(candidate(encode(source)), { kind: "issue", reason });
assert.deepEqual(candidate(new Uint8Array([0xef, 0xbb, 0xbf, 0xff])), {
  kind: "issue",
  reason: "bom"
});
assert.deepEqual(candidate(new Uint8Array([0xc3, 0x28])), {
  kind: "issue",
  reason: "invalid-utf8"
});
for (const source of ["-0", "1e999", "-1e999"]) {
  const result = candidate(encode(source));
  assert.equal(result.kind, "valid");
  if (result.kind === "valid") assert.ok(Object.is(result.jsonValue, Number(source)));
}
const stress = [1024, 4096, 16384].map((depth) => {
  const bytes = encode("[".repeat(depth) + "0" + "]".repeat(depth));
  const before = baseline(bytes);
  const after = candidate(bytes);
  return { depth, baseline: before.kind, candidate: after.kind };
});
console.log(
  JSON.stringify({
    runtime: process.version,
    bun: process.versions.bun ?? null,
    inputs: inputs.length,
    mismatches,
    examples,
    stress
  })
);
assert.equal(mismatches, 0);
