import re,json,time,hashlib,statistics,sys
from pathlib import Path
files=json.loads((Path.cwd() / 'docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json').read_text())['files'];syms=['<<=','>>=','||','&&','===','!==','==','!=','<=','>=','->','=>','++','--','+=','-=','+','-','*','/','*=','/=','^=','&=','|=','...'];add=r'|(?:#\w+)|(?:\$\w+)|(?:\w+\?)|`.*?`';until=r'(?:\\\n|[^\n])*';generic=r'<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]|(?:extends))+>';p=(r'(?:'+r'\/\*.*?\*\/'+add+r"|(?:\d+')+\d+"+r"|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+"+r"|0b(?:[01]+')+[01]+"+r'|\w+'+r'|"(?:\\.|[^"\\])*"'+r"|'(?:\\.|[^'\\])*?'"+r'|\/\/'+until+r'|#|:=|::|\*\*|'+generic+r'|'+r'|'.join(re.escape(s) for s in syms)+r'|\\\n|\n|[^\S\n]+|.)');r=re.compile(p,re.M|re.S)
def off(s,i):return len(s[:i].encode('utf-16-le'))//2
def guard():
 h=hashlib.sha256();n=c=0
 for f in files:
  for m in r.finditer(f['source']):v=m.group();n+=1;c+=len(v);h.update(v.encode());h.update(b'\0');h.update(str(off(f['source'],m.start())).encode());h.update(b'\0')
 return {'count':n,'chars':c,'digest':h.hexdigest()}
g=guard()
def countOnly():return sum(1 for f in files for _ in r.finditer(f['source']))
def fields():return sum(len(m.group())+m.start() for f in files for m in r.finditer(f['source']))
def one(f):
 t=time.perf_counter_ns();x=f();ms=(time.perf_counter_ns()-t)/1e6
 if f is countOnly:assert x==g['count']
 return ms
for f in(countOnly,fields):one(f)
rows=[]
for b in range(12):
 for n,f in (('countOnly',countOnly),('fields',fields)) if b%2 else (('fields',fields),('countOnly',countOnly)):rows.append({'block':b+1,'variant':n,'ms':one(f)})
def med(x):return statistics.median(x)
summary={n:{'medianMs':med(x:=[z['ms']for z in rows if z['variant']==n]),'samplesMs':x}for n in ('countOnly','fields')};print(json.dumps({'runtime':{'python':sys.version},'protocol':'compiled upstream pattern + finditer; guard preflight hashes raw text+convertedUTF16 start but excluded; countOnly loop counter; fields len(m.group())+m.start().','guard':g,'summary':summary,'rows':rows},indent=2))
