import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [root,output,iterations='1']=process.argv.slice(2);
const base='/tmp/vibe-lizard-upgrade-20261011';
const paths=JSON.parse(readFileSync(`${base}/paths.json`,'utf8'));
const files=paths.map(filename=>({filename,sourceCode:readFileSync(`${base}/corpus/${filename}`,'utf8')}));
const {analyzeLizardSource}=await import(pathToFileURL(`${root}/src/package-checks/function-metrics/analyzer/port-facade.ts`).href);
function analyze(){return files.map(file=>({filename:file.filename,functions:analyzeLizardSource(file).function_list}));}
analyze();
const samples=[];let facts;
for(let i=0;i<Number(iterations);i++){const start=performance.now();facts=analyze();samples.push(performance.now()-start);}
writeFileSync(output,JSON.stringify({runtime:process.version,samples,files:files.length,functions:facts.reduce((n,f)=>n+f.functions.length,0),digest:createHash('sha256').update(JSON.stringify(facts)).digest('hex')},null,2)+'\n');
