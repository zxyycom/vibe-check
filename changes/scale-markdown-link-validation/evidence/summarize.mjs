import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const directory = import.meta.dirname;
const samples = readFileSync(path.join(directory,'paired.jsonl'),'utf8').trim().split('\n').map(line => JSON.parse(line));
const median = values => { const sorted = [...values].sort((a,b)=>a-b); const middle=Math.floor(sorted.length/2); return sorted.length%2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2; };
const statistics = values => {const mid=median(values);return {median:mid,mad:median(values.map(value=>Math.abs(value-mid)))};};
const groups = new Map();
for (const sample of samples) {
  const key=JSON.stringify([sample.shape,sample.count,sample.depth,sample.cacheState]);
  if (!groups.has(key)) groups.set(key,[]);
  groups.get(key).push(sample);
}
assert.equal(groups.size,27);
const rows=[];
for (const [key,group] of groups) {
  assert.equal(group.length,12,'One warmup and five complete independent-process pairs per version');
  for (let pair=-1;pair<5;pair++) assert.deepEqual(group.filter(sample=>sample.pair===pair).map(sample=>sample.version),pair%2===1?['after','before']:['before','after'],'Alternating pair execution order');
  for (const sample of group) assert.deepEqual(sample.outcome.data,group[0].outcome.data,'Every raw invocation retains identical complete facts');
  const versions={};
  for (const version of ['before','after']) {
    const raw=group.filter(sample=>sample.version===version&&sample.pair>=0);
    assert.deepEqual(raw.map(sample=>sample.pair).sort(),[0,1,2,3,4]);
    versions[version]={elapsedMs:statistics(raw.map(sample=>sample.elapsedMs)),maxRssKiB:statistics(raw.map(sample=>sample.maxRssKiB)),data:raw[0].outcome.data};
  }
  assert.deepEqual(versions.before.data,versions.after.data);
  rows.push({input:JSON.parse(key),...versions,elapsedRatio:versions.after.elapsedMs.median/versions.before.elapsedMs.median,rssRatio:versions.after.maxRssKiB.median/versions.before.maxRssKiB.median});
}
writeFileSync(path.join(directory,'summary.json'),JSON.stringify(rows,null,2)+'\n');
let report='# Paired timing and resource observations\n\nEach row has five independent-process pairs after warmup. Timing and RSS are observations, not additional hard thresholds.\nRSS is process peak including fixture setup and hit prefill; time covers only the final public Run. OS page cache was not cleared.\n\n| shape | edges | depth | cache | before ms (MAD) | after ms (MAD) | after/before | before MiB | after MiB |\n| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |\n';
for(const row of rows) {const b=row.before.elapsedMs,a=row.after.elapsedMs;const [shape,count,depth,cache]=row.input;const labels=[shape,shape==='real'?row.before.data.targetReadCount:count,shape==='real'?'mixed':depth,cache];report+=`| ${labels.join(' | ')} | ${b.median.toFixed(1)} (${b.mad.toFixed(1)}) | ${a.median.toFixed(1)} (${a.mad.toFixed(1)}) | ${row.elapsedRatio.toFixed(3)} | ${(row.before.maxRssKiB.median/1024).toFixed(1)} | ${(row.after.maxRssKiB.median/1024).toFixed(1)} |\n`;}
report+='\nThe real corpus has 361 selected Markdown sources, 2,343 occurrences and 1,939 logically charged target references; mixed path depth. Synthetic count/depth are fixture parameters. Full time/RSS median and MAD values are in summary.json.\n';
writeFileSync(path.join(directory,'comparison.md'),report);
