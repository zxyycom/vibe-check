import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseExperimentArguments, readFrozenManifest } from "./helper-inputs.ts";

interface SelectionProfileRow {
  readonly calls: number;
  readonly elapsedMs: number;
  readonly patterns: number;
  readonly paths: number;
}

const kind = parseExperimentArguments(process.argv.slice(2));
const profilingState = globalThis as typeof globalThis & {
  __selectionProfile?: Readonly<Record<string, SelectionProfileRow>>;
};
const root = process.cwd(),
  base = resolve(root, "tmp/optimization-20261012/file-selection");
const frozen = readFrozenManifest(resolve(base, "manifest.json")),
  expected = frozen.manifest.map((entry) => entry.path);
const { collectProjectFiles } = await import(resolve(base, kind, "public-collection.ts"));
const rows = [];
for (const [name, patterns] of [
  ["native", frozen.native],
  ["explicit", expected]
] as const) {
  const samples = [];
  profilingState.__selectionProfile = {};
  for (let i = 0; i < (kind === "profile" ? 1 : 4); i++) {
    const start = performance.now();
    const paths = collectProjectFiles({ projectRoot: root, selection: { patterns } });
    if (JSON.stringify(paths) !== JSON.stringify(expected)) throw new Error("different paths");
    samples.push({
      i,
      elapsedMs: performance.now() - start,
      count: paths.length,
      frozen: Object.isFrozen(paths)
    });
  }
  rows.push({ name, samples, profile: profilingState.__selectionProfile });
}
writeFileSync(
  resolve(base, `${kind}-node-${process.versions.node}.json`),
  JSON.stringify({ measuredAt: new Date().toISOString(), runtime: process.versions, rows }, null, 2)
);
console.log(JSON.stringify(rows));
