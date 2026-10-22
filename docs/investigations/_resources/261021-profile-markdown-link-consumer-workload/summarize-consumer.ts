/** Recompute only the native consumer-workload results; repository Gate evidence is not an input. */
import { readFileSync } from "node:fs";
import path from "node:path";

const [directory] = process.argv.slice(2);
if (!directory) throw new Error("Pass the consumer evidence directory");
const read = (file: string) => JSON.parse(readFileSync(path.join(directory, file), "utf8"));
const data = read("consumer-results.json");
const capacity = read("consumer-capacity-results.json");
function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[index]! : (sorted[index - 1]! + sorted[index]!) / 2;
}
function stats(values: number[]) {
  const center = median(values);
  return { n: values.length, medianMs: center, madMs: median(values.map(value => Math.abs(value - center))),
    minMs: Math.min(...values), maxMs: Math.max(...values) };
}
const groups = [...new Set(data.samples.filter((sample: any) => sample.mode === "plain")
  .map((sample: any) => `${sample.fixture}/${sample.state}`))] as string[];
const profiles = data.samples.filter((sample: any) => sample.mode === "trace");
for (const sample of [...data.samples, ...capacity.samples]) {
  if (sample.outcome.status !== "passed" || sample.outcome.data.findingCount !== 0) throw new Error("Unexpected outcome");
}
const hit = profiles.find((sample: any) => sample.fixture === "sparse-1824" && sample.state === "hit");
const partial = profiles.find((sample: any) => sample.state === "two-misses");
const deep = profiles.find((sample: any) => sample.fixture === "deep-1824");
const calls = (sample: any, name: string) => sample.profile.metrics[name]?.calls ?? 0;
if (calls(hit, "resolver-engine.ts:#observe") !== 296 ||
  calls(hit, "filesystem-probes.ts:rootContainedPathStatus") !== 7936 ||
  calls(deep, "filesystem-probes.ts:rootContainedPathStatus") !== 19840 ||
  calls(partial, "markdown-parser.ts:parseMarkdownLinkFacts") !== 2 ||
  calls(hit, "markdown-parser.ts:parseMarkdownLinkFacts") !== 0) throw new Error("Profile/count assertion failed");
const ratios = Array.from({ length: 6 }, (_, index) => {
  const pair = capacity.samples.filter((sample: any) => sample.mode === "plain" && sample.round === index + 1);
  return pair.find((sample: any) => sample.cap === 131072).elapsedMs / pair.find((sample: any) => sample.cap === 1048576).elapsedMs;
});
console.log(JSON.stringify({ scope: "Native markdownLinkValidation only; synthetic consumer workload, not a site or Gate benchmark",
  timedPlainSamples: data.samples.filter((sample: any) => sample.mode === "plain").length + capacity.samples.filter((sample: any) => sample.mode === "plain").length,
  profileSamples: profiles.length + capacity.samples.filter((sample: any) => sample.mode === "trace").length,
  groups: Object.fromEntries(groups.map(group => [group, stats(data.samples.filter((sample: any) => sample.mode === "plain" && `${sample.fixture}/${sample.state}` === group).map((sample: any) => sample.elapsedMs))])),
  capacity: {
    default: stats(capacity.samples.filter((sample: any) => sample.mode === "plain" && sample.cap === 1048576).map((sample: any) => sample.elapsedMs)),
    smaller: stats(capacity.samples.filter((sample: any) => sample.mode === "plain" && sample.cap === 131072).map((sample: any) => sample.elapsedMs)),
    pairedRatios: ratios, medianPairedRatio: median(ratios), smallerFasterPairs: ratios.filter(ratio => ratio < 1).length
  },
  profileAssertionsPassed: true,
  baseline: { publicSingleCheckRunMs: hit.elapsedMs,
    nativeExecuteMs: hit.profile.metrics["execution.ts:executeMarkdownLinkValidation"].inclusiveMs,
    sourcePhaseMs: hit.profile.metrics["source-traversal.ts:collectSourceReferences"].inclusiveMs,
    resolverPhaseMs: hit.profile.metrics["resolver-engine.ts:resolveAll"].inclusiveMs,
    sourceFractionOfNativeExecute: hit.profile.metrics["source-traversal.ts:collectSourceReferences"].inclusiveMs / hit.profile.metrics["execution.ts:executeMarkdownLinkValidation"].inclusiveMs,
    counters: hit.profile.counters }, profiles
}, null, 2));
