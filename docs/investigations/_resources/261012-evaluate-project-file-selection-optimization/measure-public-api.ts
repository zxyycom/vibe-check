import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { parsePublicMeasurementArguments, readFrozenManifest } from "./helper-inputs.ts";

const argumentsOptions = parsePublicMeasurementArguments(process.argv.slice(2));
const root = process.cwd(),
  base = resolve(root, "tmp/optimization-20261012/file-selection");
const require = createRequire(import.meta.url);
const loadedMatcher: unknown = require("micromatch");
if (typeof loadedMatcher !== "function")
  throw new Error("micromatch did not export its matcher function");
const mm = loadedMatcher as typeof import("micromatch");
const profile = argumentsOptions.profile;
const calls = new Map<
  string,
  { calls: number; elapsedMs: number; patterns: number; paths: number }
>();
if (profile) {
  const wrapped = Object.assign(
    (paths: string[], patterns: string[], options: import("micromatch").Options) => {
      const start = performance.now();
      const out = mm(paths, patterns, options);
      const key = paths.length === 1 ? "singleton" : `batch-${paths.length}`;
      const row = calls.get(key) ?? { calls: 0, elapsedMs: 0, patterns: 0, paths: 0 };
      row.calls++;
      row.elapsedMs += performance.now() - start;
      row.patterns += patterns.length;
      row.paths += paths.length;
      calls.set(key, row);
      return out;
    },
    mm
  );
  const moduleEntry = require.cache[require.resolve("micromatch")];
  if (moduleEntry === undefined)
    throw new Error("micromatch cache entry unavailable for profiling");
  moduleEntry.exports = wrapped;
}
const { collectProjectFiles } = await import(resolve(root, "src/index.ts"));
const native = [
  "src/**/*.ts",
  "docs/schemas/**",
  "docs/examples/**",
  "scripts/**/*.ts",
  ...(
    await import(resolve(root, "scripts/project/gate/checks/repository-quality.ts"))
  ).PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS.duplicateDetection.codeAreas[
    "product-source"
  ].files.patterns.filter((x: string) => x.startsWith("!")),
  "!docs/schemas/historical/**"
];
if (argumentsOptions.freeze) {
  const paths = collectProjectFiles({ projectRoot: root, selection: { patterns: native } });
  const manifest = paths.map((path) => {
    const bytes = readFileSync(resolve(root, path));
    return { path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  });
  writeFileSync(
    resolve(base, "manifest.json"),
    JSON.stringify({ frozenAt: new Date().toISOString(), native, manifest }, null, 2)
  );
}
const frozen = readFrozenManifest(resolve(base, "manifest.json"));
const expected = frozen.manifest.map((entry) => entry.path);
for (const x of frozen.manifest) {
  const bytes = readFileSync(resolve(root, x.path));
  if (bytes.length !== x.bytes || createHash("sha256").update(bytes).digest("hex") !== x.sha256)
    throw new Error(`manifest drift ${x.path}`);
}
const rows = [];
for (const [name, patterns] of [
  ["native", frozen.native],
  ["explicit", expected]
] as const) {
  const samples = [];
  calls.clear();
  for (let i = 0; i < (profile ? 1 : 4); i++) {
    const start = performance.now();
    const paths = collectProjectFiles({
      projectRoot: root,
      selection: { patterns: [...patterns] }
    });
    const row = {
      i,
      elapsedMs: performance.now() - start,
      count: paths.length,
      samePaths: JSON.stringify(paths) === JSON.stringify(expected),
      frozen: Object.isFrozen(paths)
    };
    if (!row.samePaths) throw new Error("path drift");
    samples.push(row);
  }
  rows.push({ name, patterns: patterns.length, samples, profile: [...calls] });
}
writeFileSync(
  resolve(
    base,
    `${profile ? "profile" : "baseline"}-${process.release.name}-${process.versions.node ?? process.versions.bun}.json`
  ),
  JSON.stringify(
    { measuredAt: new Date().toISOString(), runtime: process.versions, root, rows },
    null,
    2
  )
);
console.log(JSON.stringify(rows));
