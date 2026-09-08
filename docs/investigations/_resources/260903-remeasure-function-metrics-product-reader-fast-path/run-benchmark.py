import datetime, hashlib, json, os, platform, subprocess, sys, time
base=sys.argv[1]
before=f'{base}/before'; after=f'{base}/after'; driver=f'{base}/product-driver.ts'; paths=f'{base}/corpus-paths.json'
def call(module_root, label, block, ordinal):
    command=['bun',driver,'--module-root',module_root,'--corpus-root',before,'--paths',paths,'--warmup']
    observed_start=time.monotonic_ns()
    completed=subprocess.run(command,capture_output=True,text=True,check=True)
    observed_ms=(time.monotonic_ns()-observed_start)/1_000_000
    value=json.loads(completed.stdout)
    value.update({'block':block,'condition':label,'ordinal':ordinal,'observedWallMs':observed_ms,'stderr':completed.stderr})
    return value
preflight_before=call(before,'before-original-facade',0,0)
preflight_after=call(after,'after-reader-fast-path',0,0)
if preflight_before['snapshotDigest'] != preflight_after['snapshotDigest']:
    raise SystemExit('output equality preflight failed')
samples=[]; ordinal=0
for block in range(1,16):
    order=(('before-original-facade',before),('after-reader-fast-path',after),('after-reader-fast-path',after),('before-original-facade',before)) if block % 2 else (('after-reader-fast-path',after),('before-original-facade',before),('before-original-facade',before),('after-reader-fast-path',after))
    for label,root in order:
        ordinal += 1
        sample=call(root,label,block,ordinal)
        if sample['snapshotDigest'] != preflight_before['snapshotDigest']:
            raise SystemExit(f"sample {ordinal} output drift")
        samples.append(sample)
        print(f"block={block} ordinal={ordinal} condition={label} operationWallMs={sample['operationWallMs']:.3f}",flush=True)
def command_stdout(command):
    return subprocess.run(command,capture_output=True,text=True,check=True).stdout.strip()
evidence={
  'schemaVersion':1,
  'benchmark':'full-product-function-metrics-adjacent-revision-remeasure',
  'formedAt':datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z'),
  'identity':{
    'beforeRevision':command_stdout(['git','-C',before,'rev-parse','HEAD']),
    'afterRevision':command_stdout(['git','-C',after,'rev-parse','HEAD']),
    'beforeTree':command_stdout(['git','-C',before,'rev-parse','HEAD^{tree}']),
    'afterTree':command_stdout(['git','-C',after,'rev-parse','HEAD^{tree}']),
    'driverSha256':hashlib.sha256(open(driver,'rb').read()).hexdigest(),
    'corpusManifestSha256':json.load(open(f'{base}/corpus-manifest.json'))['manifestSha256'],
  },
  'environment':{
    'bunVersion':command_stdout(['bun','--version']),
    'kernel':platform.platform(),
    'machine':platform.machine(),
    'cpuModel':next((line.split(':',1)[1].strip() for line in open('/proc/cpuinfo') if line.startswith('model name')),None),
    'cpuCount':os.cpu_count(),
  },
  'protocol':{
    'corpusRootRevision':'e2bad65dde89d07c48413fae4c6167746e10708',
    'corpusClassification':'real tracked repository Product runtime source, not synthetic representative fixtures',
    'corpusPathCount':len(json.load(open(paths))),
    'timingScope':'fresh Bun target with one uncounted same-process complete Product warmup; operationWallMs surrounds a second public Product run',
    'includedPath':'defineConfig/functionMetrics/run -> explicit path collection/admission -> bounded read/decode -> Worker -> Product adapter -> port facade -> analysis -> finding records -> settlement snapshot',
    'schedule':'15 blocks; odd ABBA and even BAAB; two samples per condition per block',
    'equalityGuard':'preflight and every counted sample require exact JSON.stringify(snapshot) SHA-256 equality against before preflight',
    'preflight':{'before':preflight_before,'after':preflight_after}
  },
  'samples':samples
}
json.dump(evidence,open(f'{base}/evidence.json','w'),indent=2)
