import sys,json,time,hashlib,re
from pathlib import Path
ROOT=Path('/home/dev/.codex/worktrees/d20e/vibe-check');UP=Path('/tmp/vibe-lizard-1.24.0-308b1c3');sys.path.insert(0,str(UP))
import lizard
x=json.loads((ROOT/'docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json').read_text())
def run():
 m=[]
 for s in x['files']:
  for f in lizard.analyze_file.analyze_source_code(s['path'],s['source']).function_list:m.append({'ccn':f.cyclomatic_complexity,'endLine':f.end_line,'file':s['path'],'name':f.name,'nloc':f.nloc,'parameterCount':f.parameter_count,'startLine':f.start_line})
 return m
def dig(m):
 v=sorted(m,key=lambda z:(z['file'],z['startLine'],z['endLine'],z['name'],z['nloc'],-1 if z['ccn'] is None else z['ccn'],z['parameterCount']))
 return hashlib.sha256(json.dumps(v,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
orig=re._compiler.compile; events=[]
def w(*a,**kw):
 events.append({'pattern':str(a[0])[:120],'flags':a[1] if len(a)>1 else kw.get('flags',0)})
 return orig(*a,**kw)
re._compiler.compile=w
try:
 re.purge(); before=len(re._cache);t=time.monotonic_ns();first=run();firstMs=(time.monotonic_ns()-t)/1e6; firstComp=list(events);firstCache=len(re._cache)
 events.clear();t=time.monotonic_ns();second=run();secondMs=(time.monotonic_ns()-t)/1e6;secondComp=list(events);secondCache=len(re._cache)
finally: re._compiler.compile=orig
print(json.dumps({'reMaxCache':re._MAXCACHE,'cacheBeforeFirst':before,'first':{'ms':firstMs,'trueCompiles':len(firstComp),'cacheAfter':firstCache,'patterns':firstComp,'digest':dig(first)},'second':{'ms':secondMs,'trueCompiles':len(secondComp),'cacheAfter':secondCache,'patterns':secondComp,'digest':dig(second)},'metrics':len(first)},indent=2))
