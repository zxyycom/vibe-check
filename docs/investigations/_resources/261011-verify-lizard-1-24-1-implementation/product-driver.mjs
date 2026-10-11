import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [moduleRoot, corpusRoot, output, temperature='cold'] = process.argv.slice(2);
const paths=JSON.parse(readFileSync('/tmp/vibe-lizard-upgrade-20261011/paths.json','utf8'));
const api=await import(pathToFileURL(`${moduleRoot}/src/index.ts`).href);
async function measure(){
 const check=api.functionMetrics({codeAreas:{corpus:{files:{patterns:paths,useDefaultExcludes:false},limits:{codeLines:{maximum:1,lowComplexityAllowance:{cyclomaticComplexityBelow:6,maximum:1}},cyclomaticComplexity:{maximum:1},nestingDepth:{maximum:1},parameters:{maximum:1}}}}});
 const r=await api.run(api.defineConfig({checks:[check],outputs:{machinePublication:{enabled:false},diagnosticLogging:{enabled:false},progressRendering:{enabled:false}}}),{projectRoot:corpusRoot});
 if(r.kind!=='completed')throw Error(r.kind);
 const facts={checks:r.snapshot.checks.map(({checkId,outcome})=>({checkId,outcome})),records:r.snapshot.records};
 return facts;
}
if(temperature==='warmed-operation')await measure();
const start=performance.now();const facts=await measure();
const result={runtime:process.version,bun:globalThis.Bun?.version,temperature,wallMs:performance.now()-start,digest:createHash('sha256').update(JSON.stringify(facts)).digest('hex'),facts};
if(output)writeFileSync(output,JSON.stringify(result,null,2)+'\n');else console.log(JSON.stringify({...result,facts:undefined}));
