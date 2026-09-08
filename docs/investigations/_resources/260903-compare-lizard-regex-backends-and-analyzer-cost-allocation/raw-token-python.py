import sys,json,hashlib,time
from pathlib import Path
if len(sys.argv) != 2: raise SystemExit('usage: raw-token-python.py <request.json>')
sys.path.insert(0,'/tmp/vibe-lizard-1.24.0-308b1c3')
from lizard_languages.typescript import TypeScriptReader
r=json.loads(Path(sys.argv[1]).read_text())
def f():
 a=[]
 for x in r['files']: a.extend(TypeScriptReader.generate_tokens(x['source']))
 return a
def g(a):
 h=hashlib.sha256();chars=0
 for t in a:h.update(t.encode());h.update(b'\0');chars+=len(t)
 return {'digest':h.hexdigest(),'count':len(a),'chars':chars}
w=f();t=time.monotonic_ns();o=f();ms=(time.monotonic_ns()-t)/1e6
if g(w)!=g(o):raise RuntimeError('drift')
print(json.dumps({'ms':ms,**g(o),'python':sys.version}))
