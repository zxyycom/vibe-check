import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chmodSync,copyFileSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
// Node 24.18: freeze-corpora.mjs <clean-baseline-repository> <owned-destination>
// Copies the caller-prepared baseline plus pressure fixtures; setup is outside timing.
const [repository,destination]=process.argv.slice(2).map(path=>resolve(path));
const expected='85776a7c8b62fd18d1e8e5bd1a27a63cd95e924a';
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:repository,encoding:'utf8'}).trim(),expected,'Restore the exact baseline in an owned directory before freezing.');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):join(dir,e.name).endsWith('.ts')?[join(dir,e.name)]:[]).sort();}
for(const source of walk(join(repository,'src'))){const path=source.slice(repository.length+1);const target=join(destination,'corpora/real',path);mkdirSync(dirname(target),{recursive:true});copyFileSync(source,target);chmodSync(target,0o444);}
for(const kind of ['short','large'])mkdirSync(join(destination,'corpora',kind,'src'),{recursive:true});
const source='export function example(a) { return a ?? 1; }\n';
for(let i=0;i<200;i++)writeFileSync(join(destination,'corpora/short/src',`input-${String(i).padStart(3,'0')}.ts`),source.padEnd(128,' '),{mode:0o444});
writeFileSync(join(destination,'corpora/large/src/input.ts'),source.padEnd(4*1024*1024,' '),{mode:0o444});
const corpora={};for(const kind of ['real','short','large']){const dir=join(destination,'corpora',kind);corpora[kind]=walk(dir).map(path=>{const bytes=readFileSync(path);return{path:path.slice(dir.length+1),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}});}
writeFileSync(join(destination,'corpus-manifest.json'),JSON.stringify({baselineCommit:expected,corpora},null,2)+'\n');
