"""Same frozen corpus, public functionMetrics -> run -> real Worker, 15 ABBA blocks."""
import subprocess,json,time,statistics,math,hashlib,pathlib,platform,os
base=pathlib.Path('/tmp/vibe-lizard-upgrade-20261011'); results=[]
evidence=base/'final-performance-guard'; evidence.mkdir(exist_ok=False)
manifest=json.loads((base/'evidence/corpus-manifest.json').read_text())
for x in manifest['paths']:
 assert hashlib.sha256((base/'corpus'/x['path']).read_bytes()).hexdigest()==x['sha256']
def source_identity(root):
 return [{'path':str(p.relative_to(root)), 'bytes':p.stat().st_size, 'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted((root/'src').rglob('*')) if p.is_file()]
source={side:source_identity(root) for side,root in [('before',base/'baseline'),('after',pathlib.Path('/workspace/vibe-check'))]}
metadata={'baseline':manifest['baseline'],'corpusFiles':len(manifest['paths']),'corpusBytes':sum(p['bytes'] for p in manifest['paths']),'os':platform.platform(),'cpu':subprocess.check_output(['bash','-c',"grep -m1 'model name' /proc/cpuinfo"],text=True).strip(),'cpuCount':os.cpu_count(),'runtime':subprocess.check_output(['mise','exec','--','node','--version'],text=True).strip(),'bun':subprocess.check_output(['mise','exec','--','bun','--version'],text=True).strip(),'configuration':{'patterns':'paths.json, exact frozen src paths','useDefaultExcludes':False,'allFourMaximums':1,'codeLinesLowComplexityAllowance':{'cyclomaticComplexityBelow':6,'maximum':1},'outputs':'machine/diagnostic/progress disabled','blocking':'default (false)'},'method':{'blocks':15,'order':['before','after','after','before'],'samplesPerSidePerTemperature':30,'coldStatistic':'whole fresh target wall including mise supervisor/Node startup','warmedStatistic':'second same-process public Run operation after one uncounted warmup','resources':'CPU/RSS not measured; no resource superiority claimed'},'sources':source}
(evidence/'measurement-identity.json').write_text(json.dumps(metadata,indent=2)+'\n')
for temperature in ['cold','warmed-operation']:
 for block in range(15):
  for side in ['before','after','after','before']:
   root=str(base/'baseline') if side=='before' else '/workspace/vibe-check'
   out=evidence/f'perf-{temperature}-{block}-{len(results)}.json'
   start=time.perf_counter();p=subprocess.run(['mise','exec','--','node',str(base/'product-driver.mjs'),root,str(base/'corpus'),str(out),temperature],capture_output=True,text=True,check=True);whole=time.perf_counter()-start
   row=json.loads(out.read_text()); assert row['runtime']==metadata['runtime']
   results.append(dict(side=side,block=block,temperature=temperature,wholeTargetWallMs=whole*1000,operationWallMs=row['wallMs'],selectedWallMs=whole*1000 if temperature=='cold' else row['wallMs'],runtime=row['runtime'],digest=row['digest']))
   ref=evidence/f'perf-{side}-{temperature}-facts.json'
   if not ref.exists():ref.write_text(json.dumps(row['facts'],indent=2)+'\n')
   assert row['facts']==json.loads(ref.read_text())
   out.unlink()
   (evidence/'performance-samples.json').write_text(json.dumps(results,indent=2)+'\n')
 summary={}
 for side in ['before','after']:
  rows=[r['selectedWallMs'] for r in results if r['side']==side and r['temperature']==temperature];summary[side]={'medianMs':statistics.median(rows),'p95Ms':sorted(rows)[math.ceil(.95*len(rows))-1],'samples':len(rows),'minMs':min(rows),'maxMs':max(rows)}
 summary['afterVsBeforeMedianPct']=(summary['after']['medianMs']/summary['before']['medianMs']-1)*100
 (evidence/f'{temperature}-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
 print(temperature,json.dumps(summary),flush=True)
for side,root in [('before',base/'baseline'),('after',pathlib.Path('/workspace/vibe-check'))]:assert source_identity(root)==source[side],f'{side} runtime source changed during measurements'
for x in manifest['paths']:assert hashlib.sha256((base/'corpus'/x['path']).read_bytes()).hexdigest()==x['sha256']
(evidence/'completed.json').write_text(json.dumps({'sourceStable':True,'corpusStable':True,'countedSamples':len(results)},indent=2)+'\n')
