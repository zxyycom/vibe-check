// Run after formal timing, never concurrently. Counts are separate from duration evidence.
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
const directory = import.meta.dirname;
const archive = path.join(directory, 'fixture.tar.gz');
const inputs = ['hot','unique'].flatMap(shape => [1000,8000].flatMap(count => [3,32].map(depth => [shape,count,depth])));
inputs.push(['real',0,0]);
for (const input of inputs) for (const cacheState of ['off','empty','hit']) for (const version of ['before','after']) {
  const child = spawnSync(process.execPath, ['--import',path.join(directory,'io-counts.mjs'),path.join(directory,`${version}.mjs`),archive,...input.map(String),cacheState], {encoding:'utf8',maxBuffer:1024*1024});
  assert.equal(child.status, 0, child.stderr);
  const { elapsedMs, maxRssKiB, ...sample } = JSON.parse(child.stdout);
  const { counts } = JSON.parse(child.stderr.trim());
  const [shape,count,depth] = input;
  if (shape !== 'real') {
    const invocations = cacheState === 'hit' ? 2 : 1;
    const expectedProbes = shape === 'hot' && version === 'after' ? depth+2 : 1+count*(depth+1);
    assert.equal(counts.lstat, invocations*expectedProbes, `${version}/${input}/${cacheState} node observation probes`);
    assert.equal(counts.open, invocations*(shape === 'hot' ? 2 : count+1), 'Only demanded source/target bodies are read');
    assert.equal(sample.outcome.data.targetReadCount, count, 'Every edge remains logically charged');
  }
  appendFileSync(path.join(directory,'operations.jsonl'),JSON.stringify({version,...sample,counts})+'\n');
}
for (const shape of ['source','missing','directory','existence','aliases']) {
  const child = spawnSync(process.execPath, ['--import',path.join(directory,'io-counts.mjs'),path.join(directory,'after.mjs'),archive,shape,'1000','3','off'], {encoding:'utf8',maxBuffer:1024*1024});
  assert.equal(child.status,0,child.stderr);
  const { elapsedMs, maxRssKiB, ...sample } = JSON.parse(child.stdout);
  const { counts } = JSON.parse(child.stderr.trim());
  const expected = {
    source: { lstat:2, open:2 }, missing: { lstat:2, open:1 }, directory: {lstat:2,open:1,opendir:1,directoryEntryRead:1},
    existence: {lstat:2,open:1}, aliases:{lstat:5,readlink:2,open:3}
  }[shape];
  for (const [name,count] of Object.entries(expected)) assert.equal(counts[name],count,`${shape}: ${name}`);
  assert.equal(sample.outcome.data.targetReadCount, shape === 'source' ? 1001 : 1000);
  appendFileSync(path.join(directory,'operations.jsonl'),JSON.stringify({version:'after',...sample,counts})+'\n');
}
