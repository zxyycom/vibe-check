import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { cpus, platform, release, arch } from "node:os";
import * as A from "./A.mjs";
import * as B from "./B.mjs";
import { fixture, coreWorkload, publicRunWorkload, diagnosticShellWorkload, stringify } from "./workloads.mjs";
const suite = process.argv[2] ?? "core";
const warmups = Number(process.env.WARMUPS ?? 3), samples = Number(process.env.SAMPLES ?? 8);
const rows = [];
const specs = [];
if (suite === "core") {
  for (const n of [32, 256, 1024]) {
    for (const shape of ["cohort", "multi", "partition", "unique", "overlap", "cross", "deep"]) specs.push({ n, shape, collector: "delays" });
    for (const shape of ["factored", "factored-cross"]) for (const order of ["first", "last", "middle"]) specs.push({ n, shape, order, collector: "delays" });
  }
  for (const n of [32, 256, 1024]) for (const collector of ["none", "counts"]) for (const shape of ["multi", "factored"]) specs.push({ n, shape, collector });
  for (const n of [32, 256]) for (const shape of ["multi", "factored"]) specs.push({ n, shape, collector: "delays", full: true });
  for (const n of [256, 1024]) specs.push({ n, shape: "multi", collector: "delays", retain: true, forks: 8 });
  for (const n of [32, 256, 1024]) for (const op of ["failure", "cancel"]) specs.push({ n, shape: "multi", collector: "delays", [op]: true });
  for (const n of [32, 256, 1024]) specs.push({ n, shape: "cohort", collector: "delays", preseed: "failed" });
} else {
  for (const n of [32, 256, 1024]) for (const shape of ["multi", "factored", "cross", "unique"]) for (const mode of ["static", "measured"]) specs.push({ n, shape, mode });
  for (const n of [32, 256]) for (const shape of ["multi", "factored"]) for (const mode of ["custom-full", "diagnostic-shell"]) specs.push({ n, shape, mode });
}
for (const spec of specs) {
  const input = fixture(spec.shape, spec.n, spec.order);
  const variants = [A, B];
  const measurements = [[], []];
  let expected;
  for (let sample = -warmups; sample < samples; sample++) {
    for (const variant of (sample & 1) === 0 ? [0, 1] : [1, 0]) {
      if (globalThis.Bun) Bun.gc(true); else globalThis.gc?.();
      const started = performance.now();
      let result;
      if (suite === "core") result = coreWorkload(variants[variant], input, spec);
      else if (spec.mode === "diagnostic-shell") result = await diagnosticShellWorkload(variants[variant], input);
      else result = await publicRunWorkload(variants[variant], input, spec.mode);
      const elapsed = performance.now() - started;
      const { retained, ...semantic } = result;
      const digest = stringify(semantic);
      if (expected === undefined) expected = digest;
      assert.equal(digest, expected, `${suite}/${stringify(spec)}`);
      if (sample >= 0) measurements[variant].push(elapsed);
    }
  }
  rows.push({ ...spec, A: measurements[0], B: measurements[1] });
  await writeFile(new URL(`timing-${suite}-${globalThis.Bun ? "bun" : "node"}.partial.json`, import.meta.url), JSON.stringify({ warmups, samples, rows }));
  process.stderr.write(`done ${suite} ${stringify(spec)}\n`);
}
const output = { suite, method: "direct complete trajectory total; compilation and seed included; sequential alternating A/B; GC outside span; no profiling or metrics instrumentation", warmups, samples,
  environment: { node: process.version, bun: globalThis.Bun?.version ?? null, platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model, cpuCount: cpus().length }, rows };
await writeFile(new URL(`timing-${suite}-${globalThis.Bun ? "bun" : "node"}.json`, import.meta.url), JSON.stringify(output, null, 2));
console.log(JSON.stringify({ suite, rows: rows.length, warmups, samples }));
