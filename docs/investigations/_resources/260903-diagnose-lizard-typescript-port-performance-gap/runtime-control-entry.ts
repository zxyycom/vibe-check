import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { analyzePortForPerformanceBenchmark } from '/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/performance-harness.test-support.ts';
const request = JSON.parse(readFileSync(process.argv[2]!, 'utf8')) as { files: Array<{path:string;source:string}>};
analyzePortForPerformanceBenchmark(request.files);
const values:number[]=[]; let metrics=analyzePortForPerformanceBenchmark(request.files);
for(let i=0;i<9;i++){const start=performance.now(); metrics=analyzePortForPerformanceBenchmark(request.files);values.push(performance.now()-start)}
values.sort((a,b)=>a-b);
console.log(JSON.stringify({runtime:process.version,medianMs:values[4],allMs:values,digest:createHash('sha256').update(JSON.stringify(metrics)).digest('hex')}));
