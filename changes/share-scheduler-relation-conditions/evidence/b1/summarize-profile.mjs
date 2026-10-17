import { readFile, writeFile } from "node:fs/promises";
const rows=[];
for (const shape of ["multi","factored","deep"]) for(const variant of ["A","B"]) {
  const cpu=JSON.parse(await readFile(new URL(`profile-${variant}-${shape}-cpu.json`,import.meta.url)));
  const hit=new Map();
  for(const node of cpu.nodes) hit.set(node.callFrame.functionName,(hit.get(node.callFrame.functionName)??0)+(node.hitCount??0));
  const allocation=JSON.parse(await readFile(new URL(`profile-${variant}-${shape}-allocation.json`,import.meta.url)));
  const self=new Map(),owners=new Map(), traces=[];
  function walk(node, chain=[]) {
    const names=[...chain,node.callFrame.functionName];
    if(node.selfSize>0) {
      self.set(node.callFrame.functionName,(self.get(node.callFrame.functionName)??0)+node.selfSize);
      const path=names.join(" > ");
      let owner="other";
      if(path.includes("transitionRelationReady")) owner=path.includes("liveReadyHeads")?"discovery-prune":"discovery-other";
      else if(path.includes("transitionReadyFrontier")) owner=path.includes("liveReadyHeads")||path.includes("liveGroupHeads")?"frontier-prune":"frontier-other";
      else if(path.includes("compileRelationConditions"))owner="relation-compile";
      else if(names.includes("capture"))owner="collector-capture";
      else if(names.includes("SchedulerQueueMeasurements"))owner="collector-seed";
      owners.set(owner,(owners.get(owner)??0)+node.selfSize);
      traces.push({bytes:node.selfSize,path});
    }
    for(const child of node.children??[])walk(child,names);
  }
  walk(allocation.head);
  const row={variant,shape,samples:cpu.samples?.length,durationMs:(cpu.endTime-cpu.startTime)/1000,
    cpuTop:[...hit].sort((a,b)=>b[1]-a[1]).slice(0,18),allocationBytes:[...self.values()].reduce((a,b)=>a+b,0),
    allocationTop:[...self].sort((a,b)=>b[1]-a[1]).slice(0,15),owners:Object.fromEntries(owners),largestTraces:traces.sort((a,b)=>b.bytes-a.bytes).slice(0,12)};
  rows.push(row);console.log(JSON.stringify(row));
}
await writeFile(new URL("profile-summary.json",import.meta.url),JSON.stringify({method:"Node Inspector: 4 unprofiled warmups; CPU 12 trajectories 500us samples; allocation 6 trajectories 4096B samples incl collected objects; separate processes, not timing evidence",rows},null,2));
