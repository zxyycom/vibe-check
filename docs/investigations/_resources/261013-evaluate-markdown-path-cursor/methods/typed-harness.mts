import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import * as before from "./node_modules/before/dist/index.js";
import * as after from "./node_modules/after/dist/index.js";

const baseDirectory = path.dirname(fileURLToPath(import.meta.url));
const variants = { before, after };
type Variant = keyof typeof variants;
interface Workload {
  readonly name: string;
  readonly root: string;
  readonly depth: number;
  readonly sourceCount: number;
  readonly relativeDirectory: string;
  readonly sourceBytes: number;
  readonly absoluteTargetBytes: number;
}
interface Observation {
  readonly milliseconds: number;
  readonly semantic: string;
}
interface Sample {
  readonly workload: string;
  readonly pair: number;
  readonly variant: Variant;
  readonly milliseconds: number;
}

async function prepareWorkload(
  name: string,
  depth: number,
  sourceCount: number
): Promise<Workload> {
  const root = path.join(baseDirectory, "fixtures", name);
  const relativeDirectory = Array.from({ length: depth - 1 }, () => "d").join("/");
  const directory = path.join(root, relativeDirectory);
  await mkdir(directory, { recursive: true });
  const source = "# Source\n\n[target](target.md#target)\n";
  await writeFile(path.join(directory, "target.md"), "# Target\n");
  for (let index = 0; index < sourceCount; index += 1) {
    await writeFile(path.join(directory, `s${index.toString().padStart(4, "0")}.md`), source);
  }
  return {
    name,
    root,
    depth,
    sourceCount,
    relativeDirectory,
    sourceBytes: Buffer.byteLength(source),
    absoluteTargetBytes: Buffer.byteLength(path.join(directory, "target.md"))
  };
}

async function observe(variant: Variant, workload: Workload): Promise<Observation> {
  const api = variants[variant];
  const definition = api.defineConfig({
    checks: [
      api.markdownLinkValidation({
        files: { patterns: [`${workload.relativeDirectory}/s*.md`] },
        findingPolicy: "blocking"
      })
    ],
    outputs: {
      diagnosticLogging: { enabled: false },
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    }
  });
  const start = performance.now();
  const result = await api.run(definition, { projectRoot: workload.root });
  const milliseconds = performance.now() - start;
  if (result.kind !== "completed") throw new Error(`Unexpected Run terminal: ${result.kind}`);
  const outcome = result.snapshot.checks[0]?.outcome;
  assert.equal(outcome?.status, "passed");
  assert.deepEqual(
    { ...outcome?.data },
    {
      sourceFileCount: workload.sourceCount,
      occurrenceCount: workload.sourceCount,
      targetReadCount: workload.sourceCount,
      findingCount: 0,
      rejectedInputCount: 0
    }
  );
  return { milliseconds, semantic: JSON.stringify(outcome) };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  assert.notEqual(upper, undefined);
  if (upper === undefined) throw new Error("No median for empty observations");
  if (sorted.length % 2 === 1) return upper;
  return ((sorted[middle - 1] ?? upper) + upper) / 2;
}

const mode = process.argv[2] ?? "smoke";
assert.ok(mode === "smoke" || mode === "measure");
const workloads = await Promise.all([
  prepareWorkload("shallow", 3, 120),
  prepareWorkload("bounded-deep", 128, 40)
]);
for (const workload of workloads) {
  const first = await observe("before", workload);
  const second = await observe("after", workload);
  assert.equal(first.semantic, second.semantic);
}
const samples: Sample[] = [];
if (mode === "measure") {
  for (let pair = 0; pair < 12; pair += 1) {
    for (const workload of pair % 2 === 0 ? workloads : [...workloads].reverse()) {
      const order: Variant[] = pair % 2 === 0 ? ["before", "after"] : ["after", "before"];
      for (const variant of order) {
        const observation = await observe(variant, workload);
        samples.push({
          workload: workload.name,
          pair,
          variant,
          milliseconds: observation.milliseconds
        });
      }
    }
  }
}
const summary = workloads.map((workload) => {
  const times = (variant: Variant) =>
    samples
      .filter((sample) => sample.workload === workload.name && sample.variant === variant)
      .map((sample) => sample.milliseconds);
  const beforeTimes = times("before");
  const afterTimes = times("after");
  if (beforeTimes.length === 0) return { workload: workload.name, semanticParity: true };
  const beforeMedian = median(beforeTimes);
  const afterMedian = median(afterTimes);
  return {
    workload: workload.name,
    semanticParity: true,
    beforeMedian,
    afterMedian,
    changePercent: (afterMedian / beforeMedian - 1) * 100,
    beforeMad: median(beforeTimes.map((time) => Math.abs(time - beforeMedian))),
    afterMad: median(afterTimes.map((time) => Math.abs(time - afterMedian))),
    beforeRange: [Math.min(...beforeTimes), Math.max(...beforeTimes)],
    afterRange: [Math.min(...afterTimes), Math.max(...afterTimes)],
    pairedChangesPercent: beforeTimes.map(
      (time, index) => ((afterTimes[index] ?? time) / time - 1) * 100
    )
  };
});
const identityVariants: readonly Variant[] = ["before", "after"];
const identities = await Promise.all(
  identityVariants.map(async (variant) => ({
    variant,
    sourceSha256: createHash("sha256")
      .update(
        await readFile(
          path.join(
            baseDirectory,
            "node_modules",
            variant,
            "src/package-checks/markdown-link-validation/filesystem-probes.ts"
          )
        )
      )
      .digest("hex"),
    bundleSha256: createHash("sha256")
      .update(await readFile(path.join(baseDirectory, "node_modules", variant, "dist/index.js")))
      .digest("hex")
  }))
);
const evidence = {
  formedAt: new Date().toISOString(),
  command: process.argv.join(" "),
  mode,
  runtime: process.versions,
  platform: process.platform,
  architecture: process.arch,
  cpu: os.cpus()[0]?.model,
  cpuCount: os.cpus().length,
  frozenHead: "bedcfc6b",
  identities,
  protocol:
    "Public defineConfig + markdownLinkValidation + run; imports/definition outside envelope; warm OS cache, application cache disabled; 1 warmup each; 12 paired AB/BA rounds; serial run IO; no filesystem instrumentation during timings",
  workloads,
  copySlots: workloads.map(({ depth, name }) => ({
    name,
    depth,
    beforeRemainingArraySlots: (depth * (depth - 1)) / 2,
    afterRemainingArraySlots: 0
  })),
  samples,
  summary
};
const verificationSuffix = mode === "smoke" ? "-typed-helper" : "";
await writeFile(
  path.join(
    baseDirectory,
    "raw",
    `${process.versions.bun === undefined ? "node" : "bun"}-${mode}${verificationSuffix}.json`
  ),
  `${JSON.stringify(evidence, null, 2)}\n`
);
console.log(JSON.stringify({ mode, summary }, null, 2));
