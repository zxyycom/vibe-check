import cProfile, pstats, io, json, hashlib, os, platform, re, sys, time
from pathlib import Path

ROOT=Path('/home/dev/.codex/worktrees/d20e/vibe-check')
UP=Path('/tmp/vibe-lizard-1.24.0-308b1c3')
REQ=ROOT/'docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json'
OUT=Path('/tmp/vibe-check-python-lizard-real-ts-profile')
EXPECTED_REQ='71029f6bf4f38e14f9ebae4923822dda751b9a2101da68fab8bde6f882c90a4d'
EXPECTED_DIGEST='29ff7a0e1535889e4055dd04989e70c6f925d08d745509b24f202744d5735ec6'

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def canon(metrics):
  fields=('ccn','endLine','file','name','nloc','parameterCount','startLine')
  v=[{k:m[k] for k in fields}|{'file':m['file'].replace('\\','/')} for m in metrics]
  v.sort(key=lambda m:(m['file'],m['startLine'],m['endLine'],m['name'],m['nloc'],-1 if m['ccn'] is None else m['ccn'],m['parameterCount']))
  return v
def digest(metrics): return hashlib.sha256(json.dumps(canon(metrics),separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
request=json.loads(REQ.read_text())
assert sha(REQ)==EXPECTED_REQ
assert len(request['files'])==254
assert all(x['path'].endswith('.ts') for x in request['files'])

sys.path.insert(0,str(UP))
import lizard
from lizard import FileInfoBuilder
from lizard_languages import get_reader_for
from lizard_languages.code_reader import CodeReader
from lizard_ext.version import version

analyzer=lizard.analyze_file
processors=analyzer.processors

def normal():
  ms=[]
  for source in request['files']:
    info=analyzer.analyze_source_code(source['path'],source['source'])
    for f in info.function_list:
      ms.append({'ccn':f.cyclomatic_complexity,'endLine':f.end_line,'file':source['path'],'name':f.name,'nloc':f.nloc,'parameterCount':f.parameter_count,'startLine':f.start_line})
  return ms

# Direct copy of the upstream body after reader resolution; it retains the normal processor and reader state-machine pipeline.
reader_by_path={source['path']: get_reader_for(source['path']) for source in request['files']}
assert all(reader_by_path.values())
def pre_resolved_direct():
  ms=[]
  for source in request['files']:
    context=FileInfoBuilder(source['path'])
    reader=reader_by_path[source['path']](context)
    tokens=reader.generate_tokens(source['source'])
    try:
      for processor in processors:
        tokens=processor(tokens,reader)
      for _ in reader(tokens,reader):
        pass
    except RecursionError:
      raise
    for f in context.fileinfo.function_list:
      ms.append({'ccn':f.cyclomatic_complexity,'endLine':f.end_line,'file':source['path'],'name':f.name,'nloc':f.nloc,'parameterCount':f.parameter_count,'startLine':f.start_line})
  return ms

baseline=normal()
assert len(baseline)==2222 and digest(baseline)==EXPECTED_DIGEST
assert canon(pre_resolved_direct())==canon(baseline)

# Warm each path as the benchmark does, then compare normal versus identical core with reader classes already resolved.
def timed(fn):
  t=time.monotonic_ns(); value=fn(); return (time.monotonic_ns()-t)/1e6,value
normal(); pre_resolved_direct()
norm_ms,norm=timed(normal)
direct_ms,direct=timed(pre_resolved_direct)
assert digest(norm)==EXPECTED_DIGEST and digest(direct)==EXPECTED_DIGEST

# CProfiler of one measured normal operation after warmup. Dump full stats and selected callers/callees.
normal()
pr=cProfile.Profile(); pr.enable(); prof_metrics=normal(); pr.disable()
assert digest(prof_metrics)==EXPECTED_DIGEST
pr.dump_stats(str(OUT/'normal-second-operation.pstats'))
s=io.StringIO(); st=pstats.Stats(pr,stream=s).strip_dirs().sort_stats('cumulative'); st.print_stats(140); (OUT/'normal-cprofile-cumulative.txt').write_text(s.getvalue())
s=io.StringIO(); st=pstats.Stats(pr,stream=s).strip_dirs().sort_stats('tottime'); st.print_stats(140); (OUT/'normal-cprofile-tottime.txt').write_text(s.getvalue())

# Exact reader selection and regex API/true-compiler instrumentation on warmed second normal operation.
# re._compiler.compile is invoked only after CPython's re cache misses; this counts actual compiler entries, not re.compile API calls.
sel={'getReaderCalls':0,'getReaderNs':0,'matchFilenameCalls':0,'matchFilenameNs':0,'regexCompileApiCalls':0,'regexCompileApiNs':0,'trueCompilerCalls':0,'trueCompilerNs':0}
orig_get=lizard.get_reader_for
orig_match=CodeReader.match_filename.__func__
orig_compile=re.compile
compiler=getattr(re,'_compiler',None)
orig_true=compiler.compile if compiler is not None else None

def get_wrap(filename):
  t=time.monotonic_ns()
  try: return orig_get(filename)
  finally:
    sel['getReaderCalls']+=1; sel['getReaderNs']+=time.monotonic_ns()-t

def match_wrap(cls,filename):
  t=time.monotonic_ns()
  try: return orig_match(cls,filename)
  finally:
    sel['matchFilenameCalls']+=1; sel['matchFilenameNs']+=time.monotonic_ns()-t

def compile_wrap(*a,**kw):
  t=time.monotonic_ns()
  try: return orig_compile(*a,**kw)
  finally:
    sel['regexCompileApiCalls']+=1; sel['regexCompileApiNs']+=time.monotonic_ns()-t

def true_wrap(*a,**kw):
  t=time.monotonic_ns()
  try: return orig_true(*a,**kw)
  finally:
    sel['trueCompilerCalls']+=1; sel['trueCompilerNs']+=time.monotonic_ns()-t

lizard.get_reader_for=get_wrap
CodeReader.match_filename=classmethod(match_wrap)
re.compile=compile_wrap
if orig_true: compiler.compile=true_wrap
try:
  # Warm cache/pipeline under wrappers but discard counts.
  normal()
  for k in tuple(sel): sel[k]=0
  instrument_ms,instrument_metrics=timed(normal)
  assert digest(instrument_metrics)==EXPECTED_DIGEST
finally:
  lizard.get_reader_for=orig_get
  CodeReader.match_filename=classmethod(orig_match)
  re.compile=orig_compile
  if orig_true: compiler.compile=orig_true

# Static selection distribution shows reader's source-order location for real .ts paths.
from lizard_languages import languages
classes=languages()
positions=[]
for x in request['files']:
  matches=[i+1 for i,cls in enumerate(classes) if cls.match_filename(x['path'])]
  positions.append({'path':x['path'],'firstMatchPosition':matches[0] if matches else None,'allMatchPositions':matches,'reader':reader_by_path[x['path']].__name__})

# Pstats selected function groups; pstats keys include (filename,line,name). Aggregate primitive calls, total and cumulative seconds.
stats=pr.getstats()
def group(pred):
  rec=[x for x in stats if pred(x.code)]
  return {'functionEntries':len(rec),'primitiveCalls':sum(x.callcount-x.reccallcount for x in rec),'totalCalls':sum(x.callcount for x in rec),'inlineSeconds':sum(x.inlinetime for x in rec),'cumulativeSeconds':sum(x.totaltime for x in rec),'functions':[str(x.code) for x in rec]}
def name(code): return getattr(code,'co_name',str(code))
def file(code): return getattr(code,'co_filename','')
groups={
 'readerSelection':group(lambda c:name(c) in {'get_reader_for','match_filename','compile_file_extension_re'}),
 'regexPythonApi':group(lambda c:file(c).endswith('/re/__init__.py') or name(c) in {'compile','_compile'}),
 'tokenGeneration':group(lambda c:'lizard_languages' in file(c) and ('generate_tokens' in name(c) or name(c) in {'_generate_tokens','create_token'})),
 'processors':group(lambda c:file(c).endswith('lizard.py') and name(c) in {'token_counter','line_counter','condition_counter','function_stack','comment_counter','preprocessor','function_statement_counter'}),
 'stateMachine':group(lambda c:'lizard_languages' in file(c) and name(c) not in {'generate_tokens','_generate_tokens','create_token','match_filename','compile_file_extension_re'}),
 'canonicalMapping':group(lambda c:file(c)==__file__ and name(c) in {'normal','pre_resolved_direct','canon','digest'}),
}
result={
 'identity':{'request':str(REQ),'requestSha256':sha(REQ),'upstream':str(UP),'upstreamCommit':os.popen(f'git -C {UP} rev-parse HEAD').read().strip(),'pythonVersion':sys.version,'pythonExecutable':sys.executable,'lizardVersion':version,'lizardModule':lizard.__file__,'pygmentsVersion':__import__('pygments').__version__,'scriptSha256':sha(__file__)},
 'scope':{'input':'same 254 decoded .ts source strings','metrics':2222,'canonicalDigest':EXPECTED_DIGEST,'timerIncludes':'reader selection, analyzer, function-metric projection','timerExcludes':'request JSON parse, file read/decode, process startup; direct pre-resolved excludes selection','normalOperationMs':norm_ms,'preResolvedDirectOperationMs':direct_ms,'instrumentedNormalOperationMs':instrument_ms},
 'outputGuard':{'normalDigest':digest(norm),'preResolvedDigest':digest(direct),'instrumentedDigest':digest(instrument_metrics),'equal':all(digest(x)==EXPECTED_DIGEST for x in [norm,direct,instrument_metrics])},
 'readerSelection':sel,
 'readerDistribution':{'readerClasses':len(classes),'allTs':all(x['reader']=='TypeScriptReader' for x in positions),'firstMatchPositions':sorted(set(x['firstMatchPosition'] for x in positions)),'firstFive':positions[:5]},
 'cProfileGroups':groups,
 'notes':{'regexTrueCompileDefinition':'calls to CPython re._compiler.compile while running the timed second operation; API calls to re.compile may be cache hits','overlap':'cProfile group cumulative time overlaps across generator pipeline and must not be summed into wall time'}
}
(OUT/'evidence.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
