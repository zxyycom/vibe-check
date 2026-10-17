import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import * as A from "./A.mjs";
import * as B from "./B.mjs";
import { fixture, coreWorkload, publicRunWorkload, diagnosticShellWorkload, stringify } from "./workloads.mjs";
let rows = 0;
for (const n of [12, 48]) for (const shape of ["cohort", "multi", "partition", "factored", "factored-cross", "unique", "overlap", "cross", "deep"]) {
  for (const order of shape.startsWith("factored") ? ["first", "last", "middle"] : ["last"]) {
    const spec = fixture(shape, n, order);
    for (const options of [{ record: true, retain: true, forks: 4 }, { record: true, failure: true }, { record: true, cancel: true }, { record: true, collector: "counts" }, { record: true, collector: "none" }, { record: true, preseed: "completed" }, { record: true, preseed: "failed" }]) {
      const left = coreWorkload(A, spec, options), right = coreWorkload(B, spec, options);
      left.retained = undefined; right.retained = undefined;
      assert.deepEqual(right, left, `${shape}/${n}/${order}/${stringify(options)}`); rows++;
    }
  }
}
for (const n of [16, 64]) for (const shape of ["multi", "factored", "cross", "unique"]) {
  const spec = fixture(shape, n);
  for (const mode of ["static", "measured", "custom-full"]) {
    assert.deepEqual(await publicRunWorkload(B, spec, mode, true), await publicRunWorkload(A, spec, mode, true), `${shape}/${n}/public/${mode}`); rows++;
  }
  assert.deepEqual(await diagnosticShellWorkload(B, spec, true), await diagnosticShellWorkload(A, spec, true), `${shape}/${n}/diagnostic`); rows++;
}
const result = { passed: true, rows, node: process.version, bun: globalThis.Bun?.version ?? null };
await writeFile(new URL(`verify-${globalThis.Bun ? "bun" : "node"}.json`, import.meta.url), JSON.stringify(result, null, 2));
console.log(result);
