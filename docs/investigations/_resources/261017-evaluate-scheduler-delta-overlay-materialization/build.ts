import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
const root=process.cwd(), dir=resolve('tmp/scheduler-delta-overlay-investigation');
const core=resolve('src/project-run/task-scheduler/admission-core');
const replacements=['selection-index.ts','selection-seed.ts','ready-frontier.ts','static-frontier.ts'];
writeFileSync(dir+'/entry.ts',`export * from '${core}/core.ts';\nexport * from '${core}/input.ts';\nexport * from '${core}/projection.ts';\nexport * from '${core}/state-query.ts';\nexport * from '${core}/static-selection-query.ts';\nexport { configure, metrics } from './overlay.ts';\n`);
const inputs=new Map();
for(const variant of ['baseline','overlay']){
 const result=await Bun.build({entrypoints:[dir+'/entry.ts'],target:'node',format:'esm',packages:'external',minify:false,plugins:[{name:'freeze-and-rebind',setup(build){build.onLoad({filter:/\.ts$/},args=>{let text=readFileSync(args.path,'utf8');if(args.path.includes('/src/'))inputs.set(relative(root,args.path),createHash('sha256').update(text).digest('hex'));if(variant==='overlay'&&replacements.some(f=>args.path===core+'/'+f))text=text.replaceAll('from "immutable"',`from "${dir}/overlay.ts"`);return{contents:text,loader:'ts'};});}}]});
 if(!result.success)throw new Error(JSON.stringify(result.logs));writeFileSync(dir+'/'+variant+'.mjs',await result.outputs[0].text());
}
writeFileSync(dir+'/manifest.json',JSON.stringify({formedAt:new Date().toISOString(),replacements,transformation:'Only runtime immutable imports in listed four files rebound to overlay.ts; all other source bytes unchanged. Type-only uses erased by same bundler.',inputs:[...inputs].sort()},null,2)+'\n');
