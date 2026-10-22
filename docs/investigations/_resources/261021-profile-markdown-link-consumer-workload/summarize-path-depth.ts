/** Read-only recomputation; exploratory timings stay separate from repeated confirmation. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const [directory] = process.argv.slice(2);
if (!directory) throw new Error("Pass the depth evidence directory");
const read = (file: string) => readFileSync(path.join(directory, file), "utf8");
const data = JSON.parse(read("depth-results.json"));
const identityBytes = read(existsSync(path.join(directory, "depth-bundle-identities.json"))
  ? "depth-bundle-identities.json" : "bundle-identities.json");
if (createHash("sha256").update(identityBytes).digest("hex") !== data.identities.bundleIdentitySha256) {
  throw new Error("Bundle identity mismatch");
}
function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i]! : (sorted[i - 1]! + sorted[i]!) / 2;
}
function stats(values: number[]) {
  const center = median(values);
  return { n: values.length, medianMs: center, minMs: Math.min(...values), maxMs: Math.max(...values),
    madMs: median(values.map(value => Math.abs(value - center))),
    inSixToEightSeconds: values.filter(value => value >= 6000 && value <= 8000).length };
}
for (const fixture of data.fixtures) {
  if (fixture.sourceCount !== 1824 || fixture.sourceBytes !== 3320000 || fixture.occurrenceCount !== 1193 ||
    fixture.logicalDirectCount !== 777 || fixture.directTargetNodesIntended !== 296 ||
    fixture.sourceTargetOverlapIntended !== 136 || fixture.targetOnlyFiles !== 130 ||
    fixture.targetOnlyDirectories !== 30 || fixture.firstSourcePath.split("/").length !== fixture.depth ||
    fixture.lastSourcePath.split("/").length !== fixture.depth) throw new Error("Fixture invariant failed");
}
for (const sample of data.samples) {
  const outcome = sample.outcome;
  if (outcome.status !== "passed" || outcome.data.findingCount !== 0 || outcome.data.sourceFileCount !== 1824 ||
    outcome.data.occurrenceCount !== 1193 || outcome.data.targetReadCount !== 777 ||
    sample.cacheState !== "hit" || sample.maxMarkdownBytes !== 1048576) throw new Error("Outcome invariant failed");
}
const groups = [...new Set(data.samples.filter((sample: any) => sample.mode === "plain")
  .map((sample: any) => `${sample.phase}/depth-${sample.fixtureDepth}`))] as string[];
const profiles = data.samples.filter((sample: any) => sample.mode === "trace").map((sample: any) => {
  const metrics = sample.profile.metrics;
  const calls = (key: string) => metrics[key]?.calls ?? 0;
  const ms = (key: string) => metrics[key]?.inclusiveMs ?? 0;
  const expectedComponents = (1824 + 160) * sample.fixtureDepth;
  if (calls("filesystem-probes.ts:rootContainedPathStatus") !== expectedComponents ||
    calls("filesystem-probes.ts:probeRootContainedPath") !== 1984 ||
    calls("filesystem-probes.ts:readRegularFile") !== 1856 ||
    calls("resolver-engine.ts:#observe") !== 296 ||
    calls("target-observation.ts:observeContainedEndpoint") !== 160 ||
    calls("target-observation.ts:readTargetFacts") !== 32 ||
    calls("markdown-parser.ts:parseMarkdownLinkFacts") !== 0 ||
    calls("session.ts:#readCacheFile") !== 1 ||
    sample.profile.counters.fileHandleReadCalls !== 3712 ||
    sample.profile.counters.fileHandleReturnedBytes !== 3320800) throw new Error("Profile invariant failed");
  const nativeMs = ms("execution.ts:executeMarkdownLinkValidation");
  const sourceMs = ms("source-traversal.ts:collectSourceReferences");
  return { depth: sample.fixtureDepth, publicRunMs: sample.elapsedMs, nativeMs,
    collectionMs: ms("collection.ts:collectProjectFiles"), sourceMs,
    resolverMs: ms("resolver-engine.ts:resolveAll"), sourceFraction: sourceMs / nativeMs,
    probeCalls: 1984, componentLstatCalls: expectedComponents,
    probeMs: ms("filesystem-probes.ts:probeRootContainedPath"),
    componentLstatMs: ms("filesystem-probes.ts:rootContainedPathStatus"),
    readRegularFileCalls: 1856, readRegularFileMs: ms("filesystem-probes.ts:readRegularFile"),
    cacheRestoreMs: ms("session.ts:#restore"), freshParseCalls: 0,
    cpu: sample.cpu, counters: sample.profile.counters };
});
console.log(JSON.stringify({
  scope: data.scope, startedAt: data.startedAt, finishedAt: data.updatedAt,
  plainSamples: data.samples.filter((sample: any) => sample.mode === "plain").length,
  profileSamples: profiles.length, allOutcomeAndProfileAssertionsPassed: true,
  groups: Object.fromEntries(groups.map(group => [group, stats(data.samples.filter((sample: any) =>
    sample.mode === "plain" && `${sample.phase}/depth-${sample.fixtureDepth}` === group).map((sample: any) => sample.elapsedMs))])),
  profiles
}, null, 2));
