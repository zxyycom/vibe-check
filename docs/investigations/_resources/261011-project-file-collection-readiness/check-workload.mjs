import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { defineConfig, jsonValidation, run } from '../../../../src/index.ts';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'collection-check-cost-'));
try {
  for (const [area, count] of [['config', 40], ['node_modules', 80], ['build', 40]]) {
    for (let directory = 0; directory < count; directory++) {
      const base = path.join(root, area, `d${directory}`);
      fs.mkdirSync(base, { recursive: true });
      for (let file = 0; file < 30; file++) fs.writeFileSync(path.join(base, `f${file}.json`), '{"value":1}\n');
    }
  }
  const definition = defineConfig({
    checks: [jsonValidation({ files: { patterns: ['**/*.json'] } })],
    outputs: { diagnosticLogging: { enabled: false }, machinePublication: { enabled: false }, progressRendering: { enabled: false } }
  });
  const trials = [];
  for (let trial = 0; trial < 11; trial++) {
    let reads = 0, stats = 0;
    const read = fs.readdirSync, stat = fs.lstatSync;
    fs.readdirSync = function (...args) { reads++; return read.apply(this, args); };
    fs.lstatSync = function (...args) { stats++; return stat.apply(this, args); };
    const started = performance.now();
    let result;
    try { result = await run(definition, { projectRoot: root }); }
    finally { fs.readdirSync = read; fs.lstatSync = stat; }
    assert.equal(result.kind, 'completed');
    assert.equal(result.aggregate, 'passed');
    const outcome = result.snapshot.checks[0].outcome;
    assert.equal(outcome.status, 'passed');
    assert.equal(outcome.data.scannedFileCount, 1200);
    assert.equal(outcome.data.rejectedInputCount, 0);
    trials.push({ ms: performance.now() - started, reads, stats, outcome, heapBytes: process.memoryUsage().heapUsed, rssBytes: process.memoryUsage().rss });
  }
  const times = trials.slice(1).map(t => t.ms).sort((a, b) => a - b);
  console.log(JSON.stringify({ node: process.version, bun: process.versions.bun ?? null, files: 4800, selected: 1200, cache: 'one initial trial then ten warm filesystem trials; no forced GC', warmMedianMs: times[5], trials }, null, 2));
} finally { fs.rmSync(root, { recursive: true, force: true }); }
