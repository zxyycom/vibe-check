import sys,time,json,hashlib,statistics,math,platform
from pathlib import Path
if len(sys.argv) != 2: raise SystemExit('usage: python-stage-breakdown.py <request.json>')
UP=Path('/tmp/vibe-lizard-1.24.0-308b1c3'); sys.path.insert(0,str(UP))
import lizard
from lizard import FileInfoBuilder
from lizard_languages import get_reader_for
from lizard_languages.typescript import TypeScriptReader
req=json.loads(Path(sys.argv[1]).read_text()); EXPECT='29ff7a0e1535889e4055dd04989e70c6f925d08d745509b24f202744d5735ec6'
fields=('ccn','endLine','file','name','nloc','parameterCount','startLine')
def project(infos):
 o=[]
 for f,info in zip(req['files'],infos):
  for x in info.function_list:o.append({'ccn':x.cyclomatic_complexity,'endLine':x.end_line,'file':f['path'],'name':x.name,'nloc':x.nloc,'parameterCount':x.parameter_count,'startLine':x.start_line})
 v=sorted(o,key=lambda x:(x['file'],x['startLine'],x['endLine'],x['name'],x['nloc'],-1 if x['ccn'] is None else x['ccn'],x['parameterCount']))
 d=hashlib.sha256(json.dumps(v,separators=(',',':')).encode()).hexdigest()
 if len(o)!=2222 or d!=EXPECT:raise RuntimeError(f'metric drift {len(o)} {d}')
 return o
def normal(): return project([lizard.analyze_file.analyze_source_code(f['path'],f['source']) for f in req['files']])
reader_class={f['path']:get_reader_for(f['path']) for f in req['files']}
def direct():
 r=[]
 for f in req['files']:
  c=FileInfoBuilder(f['path']); reader=reader_class[f['path']](c); tokens=reader.generate_tokens(f['source'])
  for p in lizard.analyze_file.processors: tokens=p(tokens,reader)
  for _ in reader(tokens,reader):pass
  r.append(c.fileinfo)
 return project(r)
def infos():
 r=[]
 for f in req['files']:
  c=FileInfoBuilder(f['path']);reader=TypeScriptReader(c);tokens=reader.generate_tokens(f['source'])
  for p in lizard.analyze_file.processors:tokens=p(tokens,reader)
  for _ in reader(tokens,reader):pass
  r.append(c.fileinfo)
 return r
def raw():
 h=hashlib.sha256();n=chars=0
 for f in req['files']:
  for t in TypeScriptReader.generate_tokens(f['source']):h.update(t.encode());h.update(b'\0');n+=1;chars+=len(t)
 return {'digest':h.hexdigest(),'count':n,'chars':chars}
def sm(a):
 s=sorted(a); q=lambda p:s[round((len(s)-1)*p)]
 return {'n':len(a),'medianMs':statistics.median(a),'p10Ms':q(.1),'p90Ms':q(.9),'minMs':min(a),'maxMs':max(a)}
def once(fn):
 t=time.monotonic_ns();v=fn();return ((time.monotonic_ns()-t)/1e6,v)
bn=normal();bd=direct();cached=infos();project(cached);br=raw()
# runtime is warmed for each comparable condition.
for f in (normal,direct,raw,lambda:project(cached)):f()
rows=[]
for block in range(1,16):
 order=(('normal',normal),('direct',direct),('direct',direct),('normal',normal)) if block%2 else (('direct',direct),('normal',normal),('normal',normal),('direct',direct))
 for label,fn in order:
  ms,v=once(fn);rows.append({'group':'normal-v-direct','block':block,'label':label,'ms':ms})
 order=(('raw',raw),('project',lambda:project(cached)),('project',lambda:project(cached)),('raw',raw)) if block%2 else (('project',lambda:project(cached)),('raw',raw),('raw',raw),('project',lambda:project(cached)))
 for label,fn in order:
  ms,v=once(fn)
  if label=='raw' and v!=br:raise RuntimeError('token drift')
  rows.append({'group':'raw-v-project','block':block,'label':label,'ms':ms})
by=lambda label:[x['ms'] for x in rows if x['label']==label]
blocks=[]
for b in range(1,16):
 ns=[x['ms'] for x in rows if x['group']=='normal-v-direct' and x['block']==b and x['label']=='normal'];ds=[x['ms'] for x in rows if x['group']=='normal-v-direct' and x['block']==b and x['label']=='direct'];ng=math.sqrt(ns[0]*ns[1]);dg=math.sqrt(ds[0]*ds[1]);blocks.append({'block':b,'normalGeomeanMs':ng,'directGeomeanMs':dg,'directDivNormal':dg/ng})
print(json.dumps({'runtime':{'python':sys.version,'lizard':lizard.__version__ if hasattr(lizard,'__version__') else '1.24.0'},'corpus':{'files':len(req['files']),'bytes':sum(len(x['source'].encode()) for x in req['files'])},'metricGuard':{'count':2222,'digest':EXPECT},'tokenGuard':br,'statistics':{'normalFullAndProjection':sm(by('normal')),'directCoreAndProjection':sm(by('direct')),'rawTypeScriptTokenGeneration':sm(by('raw')),'projectionFromCachedFullInfos':sm(by('project'))},'pairedNormalDirect':blocks,'rawRows':[x for x in rows if x['group']=='raw-v-project'],'normalDirectRows':[x for x in rows if x['group']=='normal-v-direct']}))
