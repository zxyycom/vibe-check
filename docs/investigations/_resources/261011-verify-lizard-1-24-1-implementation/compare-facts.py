"""Compare complete public Check outcomes and Records; do not conflate IDs with locations."""
import json,pathlib,collections
base=pathlib.Path('/tmp/vibe-lizard-upgrade-20261011/final-performance-guard')
before=json.loads((base/'perf-before-cold-facts.json').read_text());after=json.loads((base/'perf-after-cold-facts.json').read_text())
assert before==json.loads((base/'perf-before-warmed-operation-facts.json').read_text())
assert after==json.loads((base/'perf-after-warmed-operation-facts.json').read_text())
def keyed(facts):
 rows={(r['checkId'],r['id']):r for r in facts['records']}
 assert len(rows)==len(facts['records']), 'duplicate Record identity'
 return rows
b=keyed(before);a=keyed(after)
removed=[b[k] for k in sorted(b.keys()-a.keys())];added=[a[k] for k in sorted(a.keys()-b.keys())]
changed=[{'before':b[k],'after':a[k]} for k in sorted(a.keys()&b.keys()) if a[k]!=b[k]]
counts=lambda rows:dict(sorted(collections.Counter(r['data']['metric'] for r in rows).items()))
diff={'checks':{'before':before['checks'],'after':after['checks']},'summary':{'beforeRecords':len(b),'afterRecords':len(a),'unchangedRecords':sum(a[k]==b[k] for k in a.keys()&b.keys()),'removed':len(removed),'added':len(added),'changed':len(changed),'removedByMetric':counts(removed),'addedByMetric':counts(added),'changedByMetric':counts([r['after'] for r in changed])},'removed':removed,'added':added,'changed':changed}
(base/'output-difference.json').write_text(json.dumps(diff,indent=2)+'\n')
print(json.dumps(diff['summary'],indent=2))
