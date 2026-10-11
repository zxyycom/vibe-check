import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [root,output,iterations='5']=process.argv.slice(2); const base='/tmp/vibe-lizard-upgrade-20261011';
const files=JSON.parse(readFileSync(`${base}/paths.json`,'utf8')).map(filename=>({filename,source:readFileSync(`${base}/corpus/${filename}`,'utf8')}));
const {get_reader_for}=await import(pathToFileURL(`${root}/src/package-checks/function-metrics/analyzer/reader-registry.ts`).href);
const readers=files.map(f=>get_reader_for(f.filename));
function tokenize(){let count=0;let bytes=0;for(let i=0;i<files.length;i++){for(const t of readers[i].generateTokens(files[i].source)){count++;bytes+=t.length;}}return {count,codeUnits:bytes};}
tokenize();const samples=[];let result;
for(let i=0;i<Number(iterations);i++){const start=performance.now();result=tokenize();samples.push(performance.now()-start);}
writeFileSync(output,JSON.stringify({runtime:process.version,samples,files:files.length,result},null,2)+'\n');
