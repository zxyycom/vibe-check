#!/usr/bin/env python3
# Summarize only an already-completed measure.sh output directory. No commands are run.
import collections,json,os,re,statistics,sys,pathlib
out=pathlib.Path(sys.argv[1])
def med(a): return statistics.median(a)
def vector(a):
    m=med(a)
    return {'n':len(a),'samples':a,'median':m,'min':min(a),'max':max(a),'ratioToMedian':[x/m for x in a]}
def time_val(label):
    p=out/'raw'/f'{label}.time'
    if not p.exists():return None
    x=dict(line.strip().split('=',1) for line in p.read_text().splitlines() if '=' in line)
    return float(x['outerElapsedSeconds']) * 1000 if 'outerElapsedSeconds' in x else None
# payload proxy vectors
payload={}
for name in ['typecheck-product','typecheck-scripts','lint-product','lint-scripts']:
    vals=[x for x in (time_val(f'{name}-{i}') for i in range(1,6)) if x is not None]
    payload[name]=vector(vals) if vals else {'n':0,'missing':True}
# Gate outer walls and copied Gate facts
outer=[x for x in (time_val(f'gate-all-{i}') for i in range(1,6)) if x is not None]
checks=collections.defaultdict(list); active=collections.defaultdict(list); gates=[]
for i in range(1,6):
  label=f'gate-all-{i}'; roots=out/'gate'/label
  copied=list(roots.glob('*/gate.log')) if roots.exists() else []
  # copied names have underscores: read files in child
  if not copied:
    for d in roots.glob('*') if roots.exists() else []:
      copied += list(d.glob('gate.log')) + list(d.glob('machine_run.json')) # tolerate old copy layout
  # actual copies machine_run etc, gate log file is 'gate.log'
  for gl in [p for p in roots.rglob('gate.log')] if roots.exists() else []:
    s=gl.read_text(errors='replace'); cl=gl.with_name('core.log'); cs=cl.read_text(errors='replace') if cl.exists() else ''
    sl=gl.with_name('scheduler.log'); ss=sl.read_text(errors='replace') if sl.exists() else ''
    facts={'label':label,'sourcePath':str(gl),'outerWallMs':time_val(label),'selection':re.search(r'selection: ([^\n]+)',s).group(1) if re.search(r'selection: ([^\n]+)',s) else None,'status':re.search(r'result: (\w+)',s).group(1) if re.search(r'result: (\w+)',s) else None}
    tm=re.search(r'elapsed-to-initial-result ([0-9.]+)ms \(candidate preparation ([0-9.]+)ms; adapter/setup ([0-9.]+)ms; Product Run ([0-9.]+)ms\)',s)
    if tm: facts.update(elapsedToInitialMs=float(tm.group(1)),candidatePreparationMs=float(tm.group(2)),adapterSetupMs=float(tm.group(3)),productRunMs=float(tm.group(4)))
    for m in re.finditer(r'\[CHECK:([^]]+)\].*?check\.finished durationMs=([0-9.]+)',cs): checks[m.group(1)].append(float(m.group(2)))
    # The bounded summary presents only top three admission delays; retain only these, never infer missing taskActive.
    for m in re.finditer(r'topAdmissionDelays\.\d+\.taskActiveMs=([0-9.]+) topAdmissionDelays\.\d+\.taskId="([^"]+)"', ss): active[m.group(2)].append(float(m.group(1)))
    gates.append(facts)
result={'source':str(out),'proxyOuterWallMs':{k:v for k,v in payload.items()},'gateOuterWallMs':vector(outer) if outer else {'n':0,'missing':True},'gateRuns':gates,'coreExecutionDurationMs':{k:vector(v) for k,v in sorted(checks.items())},'boundedTopAdmissionDelayTaskActiveMs':{k:vector(v) for k,v in sorted(active.items())},'limitations':['All vectors are empirical sample/median ratios, not p95, confidence bounds, full-Gate Check baselines, or a competition coefficient.','Payload proxies differ from Gate wrapper; lint proxy additionally uses default output rather than Gate JSON format.','core execution duration excludes preflight and admission waiting. taskActive is admitted-to-settled but only appears for scheduler summary top-admission-delay entries; absent tasks are unknown, not zero.']}
(out/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'gateOuterWallMs':result['gateOuterWallMs'],'proxyOuterWallMs':result['proxyOuterWallMs'],'gateRunCount':len(gates),'coreCheckCount':len(checks),'boundedTaskActiveCount':len(active)},indent=2))
