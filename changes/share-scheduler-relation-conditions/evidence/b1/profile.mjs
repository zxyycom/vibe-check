import { Session } from "node:inspector";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";
import { fixture, coreWorkload } from "./workloads.mjs";
const [variant, shape, kind = "cpu"] = process.argv.slice(2);
const api = await import(`./${variant}.mjs`);
const spec = fixture(shape, 1024);
for (let i = 0; i < 4; i++) coreWorkload(api, spec);
globalThis.gc?.();
const session = new Session(); session.connect();
const post = promisify(session.post).bind(session);
let result;
if (kind === "cpu") {
  await post("Profiler.enable"); await post("Profiler.setSamplingInterval", { interval: 500 }); await post("Profiler.start");
  for (let i = 0; i < 12; i++) coreWorkload(api, spec);
  result = (await post("Profiler.stop")).profile;
} else {
  await post("HeapProfiler.enable");
  await post("HeapProfiler.startSampling", { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  for (let i = 0; i < 6; i++) coreWorkload(api, spec);
  result = (await post("HeapProfiler.stopSampling")).profile;
}
session.disconnect();
await writeFile(new URL(`profile-${variant}-${shape}-${kind}.json`, import.meta.url), JSON.stringify(result));
console.log(`${variant} ${shape} ${kind} done`);
