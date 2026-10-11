import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

import { createProjectFileRegionIndex } from "../../../../src/data-boundary/project-file-region-index.ts";

// 当次 source-only 纯计算探针；没有旧 API baseline，不 forced GC，不作为产品性能契约。
const measurements = [];
for (const count of [10_000, 50_000]) {
  const files = Array.from({ length: count }, (_, i) => `src/area-${i % 20}/file-${i}.ts`);
  const rules = Array.from({ length: 20 }, (_, i) => ({
    id: `rule-${String(i).padStart(2, "0")}`,
    kind: "patterns",
    patterns: [`src/area-${i}/**/*.ts`, "!**/file-0.ts"]
  }));
  const actual = Array.from({ length: 20 }, (_, i) => ({
    id: `actual-${String(i).padStart(2, "0")}`,
    kind: "members",
    files: files.filter((_, index) => index % 5 === i % 5)
  }));
  const addedFiles = Array.from({ length: count / 10 }, (_, i) => `src/area-${i % 20}/added-${i}.ts`);
  const samples = [];
  for (let iteration = 0; iteration < 11; iteration += 1) {
    const started = performance.now();
    const index = createProjectFileRegionIndex({ fileSources: [files], regionSources: [rules, actual] });
    const constructed = performance.now();
    const constructMemory = process.memoryUsage();
    let forwardEdges = 0;
    let reverseEdges = 0;
    for (const path of index.filePaths) forwardEdges += index.regionsForFile(path).length;
    for (const id of index.regionIds) reverseEdges += index.filesForRegion(id).length;
    const queried = performance.now();
    const queryMemory = process.memoryUsage();
    assert.equal(forwardEdges, count * 5 - 1);
    assert.equal(reverseEdges, forwardEdges);
    const appendStarted = performance.now();
    const next = index.appendSources({
      fileSources: [addedFiles],
      regionSources: [[{ id: "added-rule", kind: "patterns", patterns: ["src/**"] }]]
    });
    const appended = performance.now();
    const appendMemory = process.memoryUsage();
    assert.equal(next.filePaths.length, count + count / 10);
    assert.equal(next.regionIds.length, 41);
    assert.equal(next.filesForRegion("actual-00").length, count / 5);
    assert.equal(index.regionsForFile(addedFiles[0]), undefined);
    assert.equal(next.regionsForFile(addedFiles[0]).length, 2);
    samples.push({
      iteration,
      milliseconds: { construct: constructed - started, query: queried - constructed, append: appended - appendStarted },
      memory: { construct: constructMemory, query: queryMemory, append: appendMemory },
      files: index.filePaths.length,
      regions: index.regionIds.length,
      edges: forwardEdges,
      appendedEdges: next.regionIds.reduce((sum, id) => sum + next.filesForRegion(id).length, 0)
    });
  }
  const median = (values) => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)];
  const memoryRange = (phase, metric) => {
    const values = samples.map((sample) => sample.memory[phase][metric] / 1024 / 1024);
    return { minimumMiB: Math.min(...values), maximumMiB: Math.max(...values) };
  };
  measurements.push({
    workload: { files: count, patternRegions: 20, memberRegions: 20, addedFiles: count / 10, addedRules: 1 },
    coldMilliseconds: samples[0].milliseconds,
    warmMedianMilliseconds: Object.fromEntries(["construct", "query", "append"].map((phase) => [phase, median(samples.slice(1).map((sample) => sample.milliseconds[phase]))])),
    memoryRanges: Object.fromEntries(["construct", "query", "append"].map((phase) => [phase, { rss: memoryRange(phase, "rss"), heapUsed: memoryRange(phase, "heapUsed") }])),
    samples
  });
}
process.stdout.write(JSON.stringify({ formedAt: new Date().toISOString(), runtime: { node: process.versions.node, bun: process.versions.bun ?? null }, forcedGc: false, measurements }, null, 2) + "\n");
