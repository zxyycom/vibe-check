// Evidence driver: invokes only frozen public-API bundles; no Product runtime imports.
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
const [mode = 'baseline'] = process.argv.slice(2);
const directory = import.meta.dirname;
const baselinePath = path.join(directory, 'baseline.jsonl');
const baseline = existsSync(baselinePath) ? readFileSync(baselinePath, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
const archive = path.join(directory, 'fixture.tar.gz');
const workloads = ['hot', 'unique'].flatMap(shape => [1000, 8000].flatMap(count => [3,32].map(depth => [shape,count,depth])));
workloads.push(['real',0,0]);
for (const [shape,count,depth] of workloads) for (const cache of ['off','empty','hit']) {
  if (mode === 'baseline' && baseline.some(sample => sample.shape === shape && sample.count === count && sample.depth === depth && sample.cacheState === cache && sample.pair >= 0)) continue;
  const versions = mode === 'baseline' ? ['before'] : ['before','after'];
  for (let pair = -1; pair < (mode === 'baseline' ? 1 : 5); pair++) for (const version of (pair % 2 === 1 ? [...versions].reverse() : versions)) {
    const args = [path.join(directory, `${version}.mjs`), archive, shape, String(count), String(depth), cache];
    const sample = JSON.parse(execFileSync(process.execPath, args, { encoding:'utf8', maxBuffer: 1024*1024 }));
    appendFileSync(path.join(directory, `${mode}.jsonl`), JSON.stringify({version,pair, ...sample})+'\n');
  }
}
