import re,json,time,hashlib,statistics,sys
from pathlib import Path
files=json.loads((Path.cwd() / 'docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json').read_text())['files'];syms=['<<=','>>=','||','&&','===','!==','==','!=','<=','>=','->','=>','++','--','+=','-=','+','-','*','/','*=','/=','^=','&=','|=','...'];add=r'|(?:#\w+)|(?:\$\w+)|(?:\w+\?)|`.*?`';until=r'(?:\\\n|[^\n])*';generic=r'<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]|(?:extends))+>';current=(r'(?:'+r'\/\*.*?\*\/'+add+r"|(?:\d+')+\d+"+r"|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+"+r"|0b(?:[01]+')+[01]+"+r'|\w+'+r'|"(?:\\.|[^"\\])*"'+r"|'(?:\\.|[^'\\])*?'"+r'|\/\/'+until+r'|#|:=|::|\*\*'+r'|'+generic+r'|'+r'|'.join(re.escape(s) for s in syms)+r'|\\\n|\n|[^\S\n]+|.)');main=current.replace('|'+generic,'');flags=re.M|re.S;rc=re.compile(current,flags);rm=re.compile(main,flags);rg=re.compile(generic,flags)
def combined(s):yield from rc.finditer(s)
def staged(s):
 i=0
 while i<len(s):
  if s[i]=='<':
   m=rg.match(s,i)
   if m:yield m;i=m.end();continue
  m=rm.match(s,i)
  if not m or m.end()==i:raise RuntimeError(i)
  yield m;i=m.end()
def off(s,i):return len(s[:i].encode('utf-16-le'))//2
def guard(fn):
 h=hashlib.sha256();n=c=0
 for f in files:
  for m in fn(f['source']):v=m.group();n+=1;c+=len(v);h.update(v.encode());h.update(b'\0');h.update(str(off(f['source'],m.start())).encode());h.update(b'\0')
 return {'count':n,'chars':c,'digest':h.hexdigest()}
a,b=guard(combined),guard(staged);assert a==b,(a,b)
def one(fn):
 t=time.perf_counter_ns();n=0
 for f in files:
  for _ in fn(f['source']):n+=1
 assert n==a['count'];return(time.perf_counter_ns()-t)/1e6
one(combined);one(staged);rows=[]
for block in range(12):
 for n,f in ((('combined',combined),('stagedAtLt',staged)) if block%2 else (('stagedAtLt',staged),('combined',combined))):rows.append({'block':block+1,'variant':n,'ms':one(f)})
def med(x):return statistics.median(x)
x=[r['ms']for r in rows if r['variant']=='combined'];y=[r['ms']for r in rows if r['variant']=='stagedAtLt'];print(json.dumps({'protocol':'CPython exact-output stage control: generic regex invoked only at scanner position <; otherwise no-generic main uses re.match at current position. Same guard is text+converted UTF-16 start. Diagnostic control only.', 'python':sys.version,'guard':a,'combined':{'medianMs':med(x),'samplesMs':x},'stagedAtLt':{'medianMs':med(y),'samplesMs':y},'stagedDividedByCombinedMedian':med(y)/med(x),'rows':rows},indent=2))
