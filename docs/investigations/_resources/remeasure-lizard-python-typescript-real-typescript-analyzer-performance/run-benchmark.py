import datetime, hashlib, json, math, os, platform, statistics, subprocess, sys, time
from pathlib import Path

base = Path(sys.argv[1])
root = Path('/home/dev/.codex/worktrees/d20e/vibe-check')
request = base/'request.json'
python_driver = root/'scripts/development/lizard-performance/python-driver.py'
port_harness = root/'src/package-checks/function-metrics/analyzer/performance-harness.test-support.ts'
python = Path('/tmp/lizard-1.24-venv/bin/python')
upstream = Path('/tmp/vibe-lizard-1.24.0-308b1c3')
expected_upstream='308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec'

def shell(command, **kwargs):
    return subprocess.run(command, capture_output=True, text=True, check=True, **kwargs)
def stdout(command, **kwargs): return shell(command, **kwargs).stdout.strip()
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def canon(metrics):
    fields=('ccn','endLine','file','name','nloc','parameterCount','startLine')
    normalized=[]
    for m in metrics:
        normalized.append({k: m[k] for k in fields} | {'file':m['file'].replace('\\','/')})
    normalized.sort(key=lambda m:(m['file'],m['startLine'],m['endLine'],m['name'],m['nloc'], -1 if m['ccn'] is None else m['ccn'],m['parameterCount']))
    return normalized
def digest(value): return hashlib.sha256(json.dumps(value,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
def run(condition, warmup):
    if condition=='python-lizard-1.24':
        cmd=['env',f'PYTHONPATH={upstream}',str(python),str(python_driver)]
    else:
        cmd=['bun',str(port_harness)]
    if warmup: cmd.append('--warmup')
    cmd.append(str(request))
    started=time.monotonic_ns()
    completed=shell(cmd,cwd=root)
    observed=(time.monotonic_ns()-started)/1_000_000
    value=json.loads(completed.stdout)
    normalized=canon(value['metrics'])
    return {'condition':condition,'command':cmd,'operationWallMs':value['operationWallMs'],'observedWallMs':observed,'outputDigest':digest(normalized),'metricCount':len(normalized),'canonicalMetrics':normalized,'stderr':completed.stderr}

def quantile(values,p):
    s=sorted(values); pos=(len(s)-1)*p; lo=int(pos); hi=math.ceil(pos); frac=pos-lo
    return s[lo]*(1-frac)+s[hi]*frac
def summary(values): return {'count':len(values),'median':quantile(values,.5),'p90':quantile(values,.9),'min':min(values),'max':max(values)}
def bootstrap(ratios):
    state=0x5eed1234
    draws=[]
    for _ in range(10000):
        sample=[]
        for _ in ratios:
            state=(1664525*state+1013904223)&0xffffffff
            sample.append(ratios[int((state/4294967296)*len(ratios))])
        draws.append(quantile(sample,.5))
    return [quantile(draws,.025),quantile(draws,.975)]

if stdout(['git','-C',str(upstream),'rev-parse','HEAD']) != expected_upstream: raise SystemExit('wrong upstream source commit')
if not python.exists(): raise SystemExit('pinned python env unavailable')
pre_py=run('python-lizard-1.24',False); pre_ts=run('typescript-port',False)
preflight={'status':'equal' if pre_py['canonicalMetrics']==pre_ts['canonicalMetrics'] else 'drift','python':{k:v for k,v in pre_py.items() if k!='canonicalMetrics'},'typescript':{k:v for k,v in pre_ts.items() if k!='canonicalMetrics'}}
(base/'preflight-canonical-metrics.json').write_text(json.dumps({'python':pre_py['canonicalMetrics'],'typescript':pre_ts['canonicalMetrics']},indent=2,ensure_ascii=False)+'\n')
if preflight['status']!='equal':
    # Preserve a bounded diagnostic to make fail-closed drift actionable.
    left,right=pre_py['canonicalMetrics'],pre_ts['canonicalMetrics']
    mismatches=[]
    for i in range(max(len(left),len(right))):
        a=left[i] if i<len(left) else None; b=right[i] if i<len(right) else None
        if a!=b:
            mismatches.append({'index':i,'python':a,'typescript':b})
            if len(mismatches)==10: break
    (base/'evidence.json').write_text(json.dumps({'status':'not-comparable-output-drift','preflight':preflight,'firstMismatches':mismatches},indent=2)+'\n')
    raise SystemExit('canonical output drift; benchmark stopped before samples')

samples=[]; ordinal=0
for block in range(1,16):
    order=['python-lizard-1.24','typescript-port','typescript-port','python-lizard-1.24'] if block%2 else ['typescript-port','python-lizard-1.24','python-lizard-1.24','typescript-port']
    for condition in order:
        ordinal+=1
        observation=run(condition,True)
        if observation['outputDigest'] != pre_py['outputDigest']:
            raise SystemExit(f'output drift in sample {ordinal} {condition}')
        observation.pop('canonicalMetrics')
        observation.update({'block':block,'ordinal':ordinal,'status':'complete'})
        samples.append(observation)
        print(f"block={block} ordinal={ordinal} condition={condition} operationWallMs={observation['operationWallMs']:.3f}",flush=True)
py=[x['operationWallMs'] for x in samples if x['condition']=='python-lizard-1.24']
ts=[x['operationWallMs'] for x in samples if x['condition']=='typescript-port']
ratios=[]
blocks=[]
for block in range(1,16):
    bp=[x['operationWallMs'] for x in samples if x['block']==block and x['condition']=='python-lizard-1.24']
    bt=[x['operationWallMs'] for x in samples if x['block']==block and x['condition']=='typescript-port']
    pg=math.sqrt(bp[0]*bp[1]); tg=math.sqrt(bt[0]*bt[1]); ratio=pg/tg
    ratios.append(ratio); blocks.append({'block':block,'pythonGeometricMeanMs':pg,'typescriptGeometricMeanMs':tg,'pythonDividedByTypescript':ratio})
request_value=json.loads(request.read_text())
py_probe=json.loads(stdout(['env',f'PYTHONPATH={upstream}',str(python),'-c',"import importlib.metadata,json,lizard,pygments,sys; from lizard_ext.version import version; print(json.dumps({'pythonVersion':sys.version,'pythonExecutable':sys.executable,'lizardModule':lizard.__file__,'lizardVersion':version,'pygmentsVersion':pygments.__version__}))"]))
evidence={'schemaVersion':1,'benchmark':'fixed-lizard-1.24-analyzer-only-real-typescript-corpus','formedAt':datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z'),'status':'comparable-wall-only','identity':{'worktreeHead':stdout(['git','-C',str(root),'rev-parse','HEAD']),'worktreeStatus':stdout(['git','-C',str(root),'status','--porcelain']),'upstreamLizardCommit':stdout(['git','-C',str(upstream),'rev-parse','HEAD']),'upstreamLizardSourcePathAtFormation':str(upstream),'pythonDriver':{'path':str(python_driver),'sha256':sha(python_driver)},'typescriptHarness':{'path':str(port_harness),'sha256':sha(port_harness)},'runner':{'path':'run-benchmark.py','sha256':sha(base/'run-benchmark.py')},'request':{'path':'request.json','sha256':sha(request),'bytes':request.stat().st_size},'corpusManifest':{'path':'corpus-manifest.json','sha256':sha(base/'corpus-manifest.json'),'manifestSha256':json.loads((base/'corpus-manifest.json').read_text())['manifestSha256']}},'environment':{'bunVersion':stdout(['bun','--version']),'python':py_probe,'kernel':platform.platform(),'machine':platform.machine(),'cpuModel':next((line.split(':',1)[1].strip() for line in open('/proc/cpuinfo') if line.startswith('model name')),None),'cpuCount':os.cpu_count()},'protocol':{'input':'same already-decoded UTF-8 source strings from request.json; normal analyzer reader selection and Product-consumed canonical metric mapping','excluded':'file discovery, read/decode, JSON/request parsing, process startup from operationWallMs, Worker transport, Product adapter, finding/settlement and Product snapshot','corpus':{'classification':'254 tracked, non-test, non-fixture, non-test-support real repository TypeScript Product source files; port-facade drift excluded','fileCount':len(request_value['files']),'sourceBytes':sum(len(x['source'].encode()) for x in request_value['files']),'sourceDigest':hashlib.sha256(''.join(hashlib.sha256(x['source'].encode()).hexdigest() for x in request_value['files']).encode()).hexdigest()},'temperature':'each fresh target performs one uncounted same-process analysis; operationWallMs surrounds the second analyzer-only operation','schedule':'15 blocks; odd ABBA and even BAAB; two samples per side per block; 30 samples per condition','equalityGuard':'canonical metrics sort file,startLine,endLine,name,nloc,ccn,parameterCount; preflight plus every counted sample must match Python preflight digest; IQR outliers are retained'},'preflight':preflight,'samples':samples,'statistics':{'operationWallMs':{'python':summary(py),'typescript':summary(ts)},'pairedBlocks':blocks,'pythonDividedByTypescript':{'median':quantile(ratios,.5),'p90':quantile(ratios,.9),'bootstrapMedian95':bootstrap(ratios)}}}
(base/'evidence.json').write_text(json.dumps(evidence,indent=2,ensure_ascii=False)+'\n')
