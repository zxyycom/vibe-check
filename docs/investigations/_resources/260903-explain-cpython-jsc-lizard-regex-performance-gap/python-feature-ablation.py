import re,json,time,hashlib,statistics,sys,platform
from pathlib import Path
ROOT=Path.cwd(); files=json.loads((ROOT/'docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json').read_text())['files']
syms=['<<=','>>=','||','&&','===','!==','==','!=','<=','>=','->','=>','++','--','+=','-=','+','-','*','/','*=','/=','^=','&=','|=','...'];add=r'|(?:#\w+)|(?:\$\w+)|(?:\w+\?)|`.*?`';until=r'(?:\\\n|[^\n])*';generic=r'<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]|(?:extends))+>'
current=(r'(?:'+r'\/\*.*?\*\/'+add+r"|(?:\d+')+\d+"+r"|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+"+r"|0b(?:[01]+')+[01]+"+r'|\w+'+r'|"(?:\\.|[^"\\])*"'+r"|'(?:\\.|[^'\\])*?'"+r'|\/\/'+until+r'|#|:=|::|\*\*'+r'|'+generic+r'|'+r'|'.join(re.escape(s) for s in syms)+r'|\\\n|\n|[^\S\n]+|.)')
no_generic=current.replace('|'+generic,'');ascii_word=current.replace(r'|\w+',r'|[A-Za-z0-9_]+');no_strings=current.replace(r'|"(?:\\.|[^"\\])*"','').replace(r"|'(?:\\.|[^'\\])*?'",'')
patterns={'current':current,'asciiWord':ascii_word,'noGeneric':no_generic,'noQuotedStrings':no_strings};flags=re.M|re.S
def utf16(s,i):return len(s[:i].encode('utf-16-le'))//2
def scan(p):
 r=re.compile(p,flags)
 for f in files:yield from ((f['source'],m) for m in r.finditer(f['source']))
def guard(p):
 h=hashlib.sha256();n=c=0
 for s,m in scan(p):v=m.group(0);n+=1;c+=len(v);h.update(v.encode());h.update(b'\0');h.update(str(utf16(s,m.start())).encode());h.update(b'\0')
 return {'count':n,'chars':c,'digest':h.hexdigest()}
def one(p):
 t=time.perf_counter_ns();n=c=0
 for s,m in scan(p):n+=1;c+=len(m.group(0))
 return {'ms':(time.perf_counter_ns()-t)/1e6,'count':n,'chars':c}
# Check guards before timing. They establish exact raw output only where values coincide.
guards={n:guard(p) for n,p in patterns.items()}
for p in patterns.values():one(p)
names=list(patterns);rows=[]
for b in range(8):
 for k in range(len(names)):
  n=names[(b+k)%len(names)]; rows.append({'block':b+1,'variant':n,**one(patterns[n])})
def med(x):return statistics.median(x)
summary={n:{'patternChars':len(patterns[n]),'medianMs':med([r['ms'] for r in rows if r['variant']==n]),'samplesMs':[r['ms'] for r in rows if r['variant']==n],**guards[n]} for n in names}
print(json.dumps({'protocol':'CPython raw pattern ablation; same decoded request; variants except current deliberately alter regex semantics. Guard hashes text plus converted UTF-16 start and is excluded from timing. One warmup/variant then 8 cyclic orders.', 'python':sys.version,'implementation':platform.python_implementation(),'summary':summary,'rows':rows},indent=2))
