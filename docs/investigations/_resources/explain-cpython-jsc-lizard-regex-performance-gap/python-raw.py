import re,json,time,hashlib,statistics,platform,sys
from pathlib import Path
ROOT=Path.cwd()
req=json.loads((ROOT/'docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json').read_text())
files=req['files']
syms=['<<=','>>=','||','&&','===','!==','==','!=','<=','>=','->','=>','++','--','+=','-=','+','-','*','/','*=','/=','^=','&=','|=','...']
add=r'|(?:#\w+)|(?:\$\w+)|(?:\w+\?)|`.*?`'
until=r'(?:\\\n|[^\n])*'
pat=(r'(?:'+r'\/\*.*?\*\/'+add+r"|(?:\d+')+\d+"+r"|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+"+r"|0b(?:[01]+')+[01]+"+r'|\w+'+r'|"(?:\\.|[^"\\])*"'+r"|'(?:\\.|[^'\\])*?'"+r'|\/\/'+until+r'|#|:=|::|\*\*'+r'|\<(?=(?:[^<>?]*\?)+[^<>]*\>)(?:[\w\s,.?]|(?:extends))+\>'+r'|'+r'|'.join(re.escape(s) for s in syms)+r'|\\\n|\n|[^\S\n]+|.)')
flags=re.M|re.S
compiled=re.compile(pat,flags)
def utf16(s,i):return len(s[:i].encode('utf-16-le'))//2
def guard(scanner):
 h=hashlib.sha256();count=chars=0
 for f in files:
  for m in scanner(f['source']):
   v=m.group(0);count+=1;chars+=len(v);h.update(v.encode());h.update(b'\0');h.update(str(utf16(f['source'],m.start())).encode());h.update(b'\0')
 return {'count':count,'chars':chars,'digest':h.hexdigest()}
def reused(s): return compiled.finditer(s)
def re_finditer(s): return re.finditer(pat,s,flags)
def compile_each(s): return re.compile(pat,flags).finditer(s)
expected=guard(reused)
for n,f in [('reFinditerCache',re_finditer),('compileEachCache',compile_each)]:
 got=guard(f)
 if got!=expected:raise AssertionError((n,got,expected))
def one(f):
 # Scan only: checksum is separately preflighted, and is intentionally outside timed interval.
 t=time.perf_counter_ns();n=sum(1 for x in files for _ in f(x['source']));ms=(time.perf_counter_ns()-t)/1e6
 if n!=expected['count']:raise AssertionError(n)
 return ms
def med(a):return statistics.median(a)
for f in (reused,re_finditer,compile_each):one(f)
order=[('compiledFinditer',reused),('reFinditerCache',re_finditer),('compileEachCache',compile_each)]
rows=[]
for b in range(5):
 for k in range(3):
  n,f=order[(b+k)%3];rows.append({'block':b+1,'variant':n,'ms':one(f)})
sumry={n:{'n':len(x:=[r['ms'] for r in rows if r['variant']==n]),'medianMs':med(x),'samplesMs':x} for n,_ in order}
print(json.dumps({'protocol':'Python raw upstream-pattern scan on same decoded 254-file request. All variants are semantically identical in Python. Guard hashes text plus converted UTF-16 start offsets, outside timing. re.finditer(pattern string, flags) and re.compile(pattern,flags) use CPython re cache after initial compile; compiledFinditer is explicit reuse.', 'python':sys.version,'implementation':platform.python_implementation(),'patternChars':len(pat),'flags':'MS','corpus':{'files':len(files),'utf8Bytes':1138778},'guard':expected,'summary':sumry,'rows':rows},indent=2))
