import {writeFileSync,readFileSync,mkdirSync,statSync}from'node:fs';import{resolve}from'node:path';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
import{defineConfig,run,fileMetrics,jsonValidation,jsonSchemaValidation,secretDetection,maintenanceReminders,commandCheck,collectProjectFiles}from'../../../src/index.ts';
import{PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS as policy}from'../../../scripts/project/gate/checks/repository-quality.ts';
const base=import.meta.dirname,root=resolve(base,'../../..'),synthetic=resolve(base,'secret-benign');mkdirSync(synthetic,{recursive:true});for(let i=0;i<100;i++)writeFileSync(resolve(synthetic,`input-${i}.txt`),('benign line no credential material '+i+'\n').repeat(110));
const ancestors=[10,20,30].map(n=>execFileSync('git',['rev-parse',`HEAD~${n}`],{cwd:root,encoding:'utf8'}).trim());
const schemaIds=[['urn:vibe-check:schema:record:v4','docs/schemas/vibe-check-record.schema.json'],['https://vibe-check.local/schemas/vibe-check-report.schema.json','docs/schemas/vibe-check-report.schema.json'],['urn:vibe-check:schema:run:v4','docs/schemas/vibe-check-run.schema.json'],['urn:vibe-check:schema:record:v2','docs/schemas/historical/v2/vibe-check-record.schema.json'],['urn:vibe-check:schema:run:v2','docs/schemas/historical/v2/vibe-check-run.schema.json']];
const factories={
 file:()=>fileMetrics({...policy.fileMetrics,scanner:{executable:process.env.VIBE_CHECK_SCC_CMD!}}),
 json:()=>jsonValidation({files:{patterns:['docs/**/*.json']},maximumBytes:8*1024*1024}),
 schema:()=>jsonSchemaValidation({files:{patterns:['docs/schemas/**/*.json','docs/examples/json/*-report.json']},schemas:schemaIds.map(([id,path])=>({id,path})),bindings:['diagnostic-report','empty-scope-report','gate-failing-report','passing-report'].map(id=>({id,instancePath:`docs/examples/json/${id}.json`,schemaId:'https://vibe-check.local/schemas/vibe-check-report.schema.json'})),maximumBytes:8*1024*1024}),
 secret:()=>secretDetection({files:{patterns:['*.txt']}}),
 maintenance:()=>maintenanceReminders(Array.from({length:30},(_,i)=>({id:'review-'+i,baseCommit:ancestors[i%3],limits:{commits:1000,changedLines:10000000},message:'Synthetic workload reminder'}))),
 command:()=>commandCheck({checkId:'command',displayName:'Node probe',executable:process.env.VIBE_CHECK_NODE_CMD!,arguments:['--eval','process.stdout.write("ok")'],timeoutMs:5000,outputByteLimit:4096})
};
const evidence=[];
for(const [kind,factory]of Object.entries(factories)){
const check=factory(),projectRoot=kind==='secret'?synthetic:root;
const definition=defineConfig({checks:[check],scheduler:{maxParallel:1},outputs:{progressRendering:{enabled:false},machinePublication:{enabled:false},diagnosticLogging:{enabled:false}}});
const samples=[];
for(let i=0;i<4;i++){const start=performance.now();const result=await run(definition,{projectRoot,signal:AbortSignal.timeout(20000)});const sample={i,elapsedMs:performance.now()-start,kind:result.kind,...(result.kind==='completed'?{checkDurations:result.checkDurations,status:result.snapshot.checks.map(x=>x.outcome.status),outcomes:result.snapshot.checks.map(x=>x.outcome),recordCount:result.snapshot.records.length,aggregate:result.aggregate}:{diagnostic:result.diagnostic})};samples.push(sample);console.log(JSON.stringify({kind,...sample,outcomes:undefined}));}
let selections=kind==='file'?Object.values(policy.fileMetrics.codeAreas).map(x=>x.files):kind==='json'?[{patterns:['docs/**/*.json']}]:kind==='schema'?[{patterns:['docs/schemas/**/*.json','docs/examples/json/*-report.json']}]:kind==='secret'?[{patterns:['*.txt']}]:[];
const files=[...new Set(selections.flatMap(selection=>collectProjectFiles({projectRoot,selection})))].sort();
const manifest=files.map(path=>({path,bytes:statSync(resolve(projectRoot,path)).size,sha256:createHash('sha256').update(readFileSync(resolve(projectRoot,path))).digest('hex')}));
evidence.push({kind,projectRoot,options:check.options,samples,manifest});
}
writeFileSync(resolve(base,(process.versions.bun?'bun':'node')+'-checks.json'),JSON.stringify({scope:'remaining fixed Checks and commandCheck; source public API; outputs disabled; first operation+3 repeated; application/OS cold not asserted',runtime:process.versions,ancestors,evidence},null,2));
