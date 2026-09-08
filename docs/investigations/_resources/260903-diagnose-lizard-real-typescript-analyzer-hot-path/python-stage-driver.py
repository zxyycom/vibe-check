import sys,time,json,hashlib,statistics,math
from pathlib import Path
ROOT=Path('/home/dev/.codex/worktrees/d20e/vibe-check'); UP=Path('/tmp/vibe-lizard-1.24.0-308b1c3'); REQ=ROOT/'docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json'; sys.path.insert(0,str(UP))
import lizard
from lizard import FileInfoBuilder
from lizard_languages import get_reader_for
request=json.loads(REQ.read_text()); analyzer=lizard.analyze_file; processors=analyzer.processors
fields=('ccn','endLine','file','name','nloc','parameterCount','startLine')
def metrics_from_infos(infos):
 m=[]
 for source,info in zip(request['files'],infos):
  for f in info.function_list: m.append({'ccn':f.cyclomatic_complexity,'endLine':f.end_line,'file':source['path'],'name':f.name,'nloc':f.nloc,'parameterCount':f.parameter_count,'startLine':f.start_line})
 return m
def dig(ms):
 v=[{k:m[k] for k in fields} for m in ms];v.sort(key=lambda m:(m['file'],m['startLine'],m['endLine'],m['name'],m['nloc'],-1 if m['ccn'] is None else m['ccn'],m['parameterCount']));return hashlib.sha256(json.dumps(v,separators=(',',':')).encode()).hexdigest()
def normal_infos(): return [analyzer.analyze_source_code(x['path'],x['source']) for x in request['files']]
rb={x['path']:get_reader_for(x['path']) for x in request['files']}
def direct_infos():
 result=[]
 for x in request['files']:
  context=FileInfoBuilder(x['path']);reader=rb[x['path']](context);tokens=reader.generate_tokens(x['source'])
  for p in processors:tokens=p(tokens,reader)
  for _ in reader(tokens,reader):pass
  result.append(context.fileinfo)
 return result
expected='29ff7a0e1535889e4055dd04989e70c6f925d08d745509b24f202744d5735ec6'
for fn in (normal_infos,direct_infos):assert dig(metrics_from_infos(fn()))==expected
infos=normal_infos();assert dig(metrics_from_infos(infos))==expected
# warm both implementations, then 25 blocks ABBA/BAAB. File analysis only (projection separate).
normal_infos();direct_infos()
obs=[]
def once(label,fn):
 t=time.monotonic_ns();x=fn();elapsed=(time.monotonic_ns()-t)/1e6;assert dig(metrics_from_infos(x))==expected;obs.append({'condition':label,'analyzeInfosMs':elapsed})
for b in range(12):
 order=(('normal',normal_infos),('direct',direct_infos),('direct',direct_infos),('normal',normal_infos)) if b%2==0 else (('direct',direct_infos),('normal',normal_infos),('normal',normal_infos),('direct',direct_infos))
 for item in order:once(*item)
# map same already analyzed outputs 100 times; it is stage-only, not analysis.
maps=[]
for _ in range(100):
 t=time.monotonic_ns();m=metrics_from_infos(infos);maps.append((time.monotonic_ns()-t)/1e6);assert dig(m)==expected
# canonical sort+digest is proof guard, which official op excludes, measured separately.
canons=[]
for _ in range(100):
 t=time.monotonic_ns();assert dig(metrics_from_infos(infos))==expected;canons.append((time.monotonic_ns()-t)/1e6)
def sm(xs):
 s=sorted(xs);q=lambda p:s[int((len(s)-1)*p)] if len(s)>1 else s[0]
 return {'n':len(xs),'medianMs':statistics.median(xs),'p10Ms':q(.1),'p90Ms':q(.9),'minMs':min(xs),'maxMs':max(xs)}
N=[x['analyzeInfosMs'] for x in obs if x['condition']=='normal'];D=[x['analyzeInfosMs'] for x in obs if x['condition']=='direct']
blocks=[]
for b in range(12):
 a=obs[b*4:b*4+4];n=[x['analyzeInfosMs'] for x in a if x['condition']=='normal'];d=[x['analyzeInfosMs'] for x in a if x['condition']=='direct']; blocks.append({'block':b+1,'normalGeomeanMs':math.sqrt(n[0]*n[1]),'directGeomeanMs':math.sqrt(d[0]*d[1]),'directDividedByNormal':math.sqrt(d[0]*d[1])/math.sqrt(n[0]*n[1])})
result={'protocol':'one Python 3.12.13 process; same decoded request; both warmed once; 12 ABBA/BAAB blocks, 24 samples each; normal uses upstream analyze_source_code; direct is byte-for-byte pipeline after pre-resolved upstream reader class. All results guard 2222 metric digest.', 'outputDigest':expected,'normalAnalyzeOnlyMs':sm(N),'preResolvedDirectAnalyzeOnlyMs':sm(D),'blocks':blocks,'directDividedByNormalMedian':statistics.median([b['directDividedByNormal'] for b in blocks]),'mappingOnlyMs':sm(maps),'mappingWithCanonicalSortDigestMs':sm(canons),'sourceBytes':sum(len(x['source'].encode()) for x in request['files'])}
print(json.dumps(result,indent=2))
