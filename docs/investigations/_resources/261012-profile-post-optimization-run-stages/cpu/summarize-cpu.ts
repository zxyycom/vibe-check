/** Offline parser of native Bun profiles. Whole-process sampling, not Run-only CPU.
 * Inclusive frame percentages overlap and must never be added. Named target unions
 * count each sample once; native freeze leaves retain their parent call context.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fileSha256 } from "../source-identity.ts";
interface Frame {
  readonly functionName: string;
  readonly url: string;
  readonly lineNumber: number;
  readonly columnNumber: number;
}
interface ProfileNode {
  readonly id: number;
  readonly frame: Frame;
  readonly children: readonly number[];
}
interface NativeProfile {
  readonly nodes: readonly ProfileNode[];
  readonly samples: readonly number[];
  readonly timeDeltas: readonly number[];
  readonly startTime: number;
  readonly endTime: number;
}
interface Attribution {
  readonly frame: Frame;
  selfSamples: number;
  inclusiveSamples: number;
  selfIntervalUs: number;
  inclusiveIntervalUs: number;
}
interface Target {
  readonly name: string;
  readonly pathSuffix: string;
  readonly isR05Observation: boolean;
  readonly isGraphPreparation: boolean;
}
const targets: readonly Target[] = [
  {
    name: "snapshotSchedulerState",
    pathSuffix: "/task-scheduler/execution-state.ts",
    isR05Observation: true,
    isGraphPreparation: false
  },
  {
    name: "schedulerInspectionForCore",
    pathSuffix: "/admission-core/projection.ts",
    isR05Observation: true,
    isGraphPreparation: false
  },
  {
    name: "decisionContext",
    pathSuffix: "/task-scheduler/scheduler-decision-inspection.ts",
    isR05Observation: true,
    isGraphPreparation: false
  },
  {
    name: "summarizeSchedulerBlockers",
    pathSuffix: "/task-scheduler/scheduler-blocker-summary.ts",
    isR05Observation: true,
    isGraphPreparation: false
  },
  {
    name: "effectiveMaxParallelFor",
    pathSuffix: "/task-scheduler/scheduler-decision-inspection.ts",
    isR05Observation: true,
    isGraphPreparation: false
  },
  {
    name: "decideScheduler",
    pathSuffix: "/task-scheduler/scheduler-decision.ts",
    isR05Observation: false,
    isGraphPreparation: false
  },
  {
    name: "prepareTaskGraph",
    pathSuffix: "/task-scheduler/graph.ts",
    isR05Observation: false,
    isGraphPreparation: true
  },
  {
    name: "planStaticCheckGraph",
    pathSuffix: "/check-execution/plan.ts",
    isR05Observation: false,
    isGraphPreparation: true
  },
  {
    name: "compilePreparedAdmissionGraph",
    pathSuffix: "/admission-core/compiled-graph.ts",
    isR05Observation: false,
    isGraphPreparation: false
  }
];
function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return candidate !== null && typeof candidate === "object" && !Array.isArray(candidate);
}
function finiteNumber(candidate: unknown): candidate is number {
  return typeof candidate === "number" && Number.isFinite(candidate);
}
function positiveId(candidate: unknown): candidate is number {
  return finiteNumber(candidate) && Number.isSafeInteger(candidate) && candidate > 0;
}
function parseNumbers(candidate: unknown, name: string, ids: boolean): readonly number[] {
  if (!Array.isArray(candidate)) throw new Error(`Expected ${name} array`);
  const entries: readonly unknown[] = candidate;
  const numbers: number[] = [];
  for (const entry of entries) {
    if (!finiteNumber(entry) || entry < 0 || (ids && !positiveId(entry)))
      throw new Error(`Invalid ${name} entry`);
    numbers.push(entry);
  }
  return numbers;
}
function parseProfile(path: string): NativeProfile {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.nodes) ||
    !finiteNumber(parsed.startTime) ||
    !finiteNumber(parsed.endTime) ||
    parsed.endTime <= parsed.startTime
  )
    throw new Error(`Invalid native profile: ${path}`);
  const nodes: ProfileNode[] = [];
  const candidates: readonly unknown[] = parsed.nodes;
  for (const candidate of candidates) {
    if (!isRecord(candidate) || !positiveId(candidate.id) || !isRecord(candidate.callFrame))
      throw new Error("Invalid profile node");
    const frame = candidate.callFrame;
    if (
      typeof frame.functionName !== "string" ||
      typeof frame.url !== "string" ||
      !finiteNumber(frame.lineNumber) ||
      !finiteNumber(frame.columnNumber)
    )
      throw new Error("Invalid native call frame");
    nodes.push({
      id: candidate.id,
      frame: {
        functionName: frame.functionName,
        url: frame.url,
        lineNumber: frame.lineNumber,
        columnNumber: frame.columnNumber
      },
      children:
        candidate.children === undefined ? [] : parseNumbers(candidate.children, "children", true)
    });
  }
  const samples = parseNumbers(parsed.samples, "samples", true);
  const timeDeltas = parseNumbers(parsed.timeDeltas, "timeDeltas", false);
  if (samples.length === 0 || samples.length !== timeDeltas.length)
    throw new Error("Samples/deltas differ");
  return { nodes, samples, timeDeltas, startTime: parsed.startTime, endTime: parsed.endTime };
}
function emptyAttribution(frame: Frame): Attribution {
  return { frame, selfSamples: 0, inclusiveSamples: 0, selfIntervalUs: 0, inclusiveIntervalUs: 0 };
}
function matches(frame: Frame, target: Target): boolean {
  return frame.functionName === target.name && frame.url.endsWith(target.pathSuffix);
}
function analyze(path: string) {
  const profile = parseProfile(path);
  const nodeById = new Map(profile.nodes.map((node) => [node.id, node]));
  if (nodeById.size !== profile.nodes.length) throw new Error("Duplicate node ID");
  const parentById = new Map<number, number>();
  for (const node of profile.nodes) {
    for (const child of node.children) {
      if (!nodeById.has(child) || parentById.has(child))
        throw new Error("Invalid or multiply-parented child");
      parentById.set(child, node.id);
    }
  }
  function stackFor(id: number): readonly ProfileNode[] {
    const stack: ProfileNode[] = [];
    const visited = new Set<number>();
    let current: number | undefined = id;
    while (current !== undefined) {
      if (visited.has(current)) throw new Error("Cycle in sampled stack");
      visited.add(current);
      const node = nodeById.get(current);
      if (node === undefined) throw new Error("Unknown sampled node");
      stack.push(node);
      current = parentById.get(current);
    }
    return stack;
  }
  const byFrame = new Map<string, Attribution>();
  const byLeaf = new Map<number, Attribution>();
  const byTarget = new Map(
    targets.map((target) => [
      target.name,
      emptyAttribution({
        functionName: target.name,
        url: target.pathSuffix,
        lineNumber: -1,
        columnNumber: -1
      })
    ])
  );
  let r05ObservationSamples = 0;
  let r05ObservationIntervalUs = 0;
  let graphPreparationSamples = 0;
  let graphPreparationIntervalUs = 0;
  let intervalTotalUs = 0;
  for (const [index, sample] of profile.samples.entries()) {
    const intervalUs = profile.timeDeltas[index];
    if (intervalUs === undefined) throw new Error("Missing delta");
    intervalTotalUs += intervalUs;
    const stack = stackFor(sample);
    const leaf = stack[0];
    if (leaf === undefined) throw new Error("No sampled leaf");
    const leafAttribution = byLeaf.get(sample) ?? emptyAttribution(leaf.frame);
    leafAttribution.selfSamples += 1;
    leafAttribution.selfIntervalUs += intervalUs;
    byLeaf.set(sample, leafAttribution);
    const seenFrames = new Set<string>();
    for (const [depth, node] of stack.entries()) {
      const key = JSON.stringify(node.frame);
      if (seenFrames.has(key)) continue;
      seenFrames.add(key);
      const attribution = byFrame.get(key) ?? emptyAttribution(node.frame);
      attribution.inclusiveSamples += 1;
      attribution.inclusiveIntervalUs += intervalUs;
      if (depth === 0) {
        attribution.selfSamples += 1;
        attribution.selfIntervalUs += intervalUs;
      }
      byFrame.set(key, attribution);
    }
    let isR05Observation = false;
    let isGraphPreparation = false;
    for (const target of targets) {
      if (!stack.some((node) => matches(node.frame, target))) continue;
      const attribution = byTarget.get(target.name);
      if (attribution === undefined) throw new Error("Missing target attribution");
      attribution.inclusiveSamples += 1;
      attribution.inclusiveIntervalUs += intervalUs;
      if (matches(leaf.frame, target)) {
        attribution.selfSamples += 1;
        attribution.selfIntervalUs += intervalUs;
      }
      if (target.isR05Observation) isR05Observation = true;
      if (target.isGraphPreparation) isGraphPreparation = true;
    }
    if (isR05Observation) {
      r05ObservationSamples += 1;
      r05ObservationIntervalUs += intervalUs;
    }
    if (isGraphPreparation) {
      graphPreparationSamples += 1;
      graphPreparationIntervalUs += intervalUs;
    }
  }
  function row(attribution: Attribution) {
    return {
      ...attribution,
      selfSamplePercent: (100 * attribution.selfSamples) / profile.samples.length,
      inclusiveSamplePercent: (100 * attribution.inclusiveSamples) / profile.samples.length,
      selfIntervalPercent: (100 * attribution.selfIntervalUs) / intervalTotalUs,
      inclusiveIntervalPercent: (100 * attribution.inclusiveIntervalUs) / intervalTotalUs
    };
  }
  const selfTotals = [...byFrame.values()].reduce(
    (total, attribution) => total + attribution.selfSamples,
    0
  );
  if (selfTotals !== profile.samples.length)
    throw new Error("Self attribution did not partition samples");
  return {
    profile: path,
    profileSha256: fileSha256(path),
    nodes: profile.nodes.length,
    sampleCount: profile.samples.length,
    profilerWallRangeUs: profile.endTime - profile.startTime,
    attributedSampleIntervalUs: intervalTotalUs,
    targets: [...byTarget.values()].map(row),
    r05ObservationUnion: {
      samples: r05ObservationSamples,
      samplePercent: (100 * r05ObservationSamples) / profile.samples.length,
      attributedIntervalUs: r05ObservationIntervalUs,
      intervalPercent: (100 * r05ObservationIntervalUs) / intervalTotalUs
    },
    graphPreparationUnion: {
      samples: graphPreparationSamples,
      samplePercent: (100 * graphPreparationSamples) / profile.samples.length,
      attributedIntervalUs: graphPreparationIntervalUs,
      intervalPercent: (100 * graphPreparationIntervalUs) / intervalTotalUs
    },
    topSelfFrames: [...byFrame.values()]
      .sort((left, right) => right.selfSamples - left.selfSamples)
      .slice(0, 25)
      .map(row),
    topInclusiveFrames: [...byFrame.values()]
      .sort((left, right) => right.inclusiveSamples - left.inclusiveSamples)
      .slice(0, 25)
      .map(row),
    topSelfCallContexts: [...byLeaf.entries()]
      .sort((left, right) => right[1].selfSamples - left[1].selfSamples)
      .slice(0, 15)
      .map(([nodeId, attribution]) => ({
        nodeId,
        frame: attribution.frame,
        selfSamples: attribution.selfSamples,
        selfIntervalUs: attribution.selfIntervalUs,
        selfSamplePercent: (100 * attribution.selfSamples) / profile.samples.length,
        selfIntervalPercent: (100 * attribution.selfIntervalUs) / intervalTotalUs,
        stackLeafToRoot: stackFor(nodeId).map((node) => node.frame)
      }))
  };
}
const cpuRoot = fileURLToPath(new URL("./", import.meta.url));
const summaries = ["independent", "chain"].map((shape) => ({
  shape,
  ...analyze(resolve(cpuRoot, `${shape}-512.cpuprofile`))
}));
writeFileSync(
  resolve(cpuRoot, "summary.json"),
  JSON.stringify(
    {
      protocol: "whole-process-bun-cpu-profile-context-v1",
      generatedAt: new Date().toISOString(),
      analyzerSha256: fileSha256(fileURLToPath(import.meta.url)),
      sampling:
        "Bun1.3.14 --cpu-prof, default1000us, N512, three warmup and nine measured complete Runs, one process per shape",
      scope:
        "Entire process includes imports/source hashing/defineConfig/assertions/digest/warmups/stdout; async ancestry can be incomplete; NOT Run-only CPU, exact CPU time, allocation or a before/after comparison",
      attribution:
        "Self leaf counts partition all samples; inclusive counts include descendants and overlap. Target union counts any matching named R05 observation ancestry once. timeDeltas weighted attribution is an approximate observed interval measure, not precise CPU milliseconds. Native freeze attribution needs its enclosing stack, not the intrinsic name alone.",
      summaries
    },
    null,
    2
  ) + "\n"
);
console.log(
  JSON.stringify(
    summaries.map((summary) => ({
      shape: summary.shape,
      samples: summary.sampleCount,
      r05Observation: summary.r05ObservationUnion,
      graphPreparation: summary.graphPreparationUnion,
      targets: summary.targets
    })),
    null,
    2
  )
);
