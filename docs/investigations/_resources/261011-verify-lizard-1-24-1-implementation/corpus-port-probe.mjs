import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [root,requestPath,output]=process.argv.slice(2);
const {analyzeLizardSource}=await import(pathToFileURL(`${root}/src/package-checks/function-metrics/analyzer/port-facade.ts`).href);
const request=JSON.parse(readFileSync(requestPath,'utf8'));
const analysis=request.cases.map(c=>({filename:c.filename,functions:analyzeLizardSource(c).function_list}));
writeFileSync(output,JSON.stringify({runtime:process.version,analysis},null,2)+'\n');
