import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { collectProjectFiles as before } from "./before/public-collection.ts";
import { collectProjectFiles as after } from "../../../src/index.ts";
import {
  assertNoArguments,
  readFrozenManifest,
  readBeforeSourceProvenance
} from "./helper-inputs.ts";

interface CollectionTimingSample {
  readonly i: number;
  readonly elapsedMs: number;
  readonly files: number;
  readonly pathsSha256: string;
  readonly frozen: boolean;
}

assertNoArguments(process.argv.slice(2), "measure-frozen-fixture.ts");
const root = process.cwd(),
  base = resolve(root, "tmp/optimization-20261012/file-selection"),
  resources = resolve(
    root,
    "docs/investigations/_resources/261012-evaluate-project-file-selection-optimization"
  ),
  fixture = resolve(base, "node_modules/frozen-fixture");
const frozen = readFrozenManifest(resolve(resources, "manifest.json")),
  provenance = readBeforeSourceProvenance(resolve(resources, "before-source-provenance.json")),
  expected = frozen.manifest.map((entry) => entry.path);
const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const fsSource = "src/package-checks/project-files/filesystem-collection.ts",
  afterSourceSha256 = hash(readFileSync(resolve(root, fsSource)));
for (const row of provenance.entries)
  assert.equal(hash(readFileSync(resolve(resources, row.resource))), row.sha256);
function verifyFixture() {
  for (const row of frozen.manifest) {
    const bytes = readFileSync(resolve(fixture, row.path));
    assert.equal(bytes.length, row.bytes);
    assert.equal(hash(bytes), row.sha256);
  }
}
verifyFixture();
const rows = [];
const schedule = [];
for (const [name, patterns] of [
  ["native", frozen.native],
  ["explicit", expected]
] as const) {
  const implementations = [
    ["before-snapshot", before],
    ["after-public-api", after]
  ] as const;
  const samplesByImplementation = new Map(
    implementations.map(([implementation]) => [implementation, [] as CollectionTimingSample[]])
  );
  for (let i = 0; i < 4; i++) {
    const order = i % 2 === 0 ? implementations : [...implementations].reverse();
    schedule.push({ name, i, order: order.map(([implementation]) => implementation) });
    for (const [implementation, collect] of order) {
      const started = performance.now();
      const paths = collect({ projectRoot: fixture, selection: { patterns: [...patterns] } });
      const elapsedMs = performance.now() - started;
      // Both implementations finish timing before all assertions, hashes and logging.
      assert.deepEqual(paths, expected);
      assert.equal(Object.isFrozen(paths), true);
      samplesByImplementation.get(implementation)!.push({
        i,
        elapsedMs,
        files: paths.length,
        pathsSha256: hash(JSON.stringify(paths)),
        frozen: true
      });
    }
  }
  for (const [implementation] of implementations)
    rows.push({
      name,
      patternCount: patterns.length,
      implementation,
      samples: samplesByImplementation.get(implementation)!
    });
}
verifyFixture();
assert.equal(hash(readFileSync(resolve(root, fsSource))), afterSourceSha256);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const summary = rows.map((row) => {
  const warm = row.samples.slice(1).map((x) => x.elapsedMs);
  return {
    name: row.name,
    implementation: row.implementation,
    medianMs: median(warm),
    minMs: Math.min(...warm),
    maxMs: Math.max(...warm)
  };
});
const runtime = process.versions.bun ? "bun" : "node",
  result = {
    measuredAt: new Date().toISOString(),
    runtimeName: runtime,
    runtime: process.versions,
    fixture,
    manifestFiles: expected.length,
    beforeOwnerSnapshot: provenance.entries.map((entry) => ({
      path: entry.path,
      sha256: entry.sha256
    })),
    afterSource: { path: fsSource, sha256: afterSourceSha256 },
    protocol:
      "same materialized frozen 853-file manifest; first+3 warm samples, serial AB/BA alternating each round; Node primary/Bun reference; import/fixture verification/assert/hash/log outside timing; before is unmodified public facade snapshot with only internal import routing",
    schedule,
    rows,
    summary
  };
writeFileSync(
  resolve(resources, `phase-b-${runtime}-frozen-fixture.json`),
  JSON.stringify(result, null, 2),
  { flag: "wx" }
);
console.log(JSON.stringify(summary));
