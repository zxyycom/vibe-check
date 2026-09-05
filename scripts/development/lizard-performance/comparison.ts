import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { BenchmarkArguments } from "./arguments.ts";
import { benchmarkRoot, driverSnapshotPaths } from "./benchmark-context.ts";
import { machineMetadata, repositoryGit } from "./benchmark-identity.ts";
import { runAnalyzerOnly } from "./analyzer-only.ts";
import { canonicalDigest } from "./canonical.ts";
import {
  BENCHMARK_ID,
  REQUIRED_ABBA_BLOCKS,
  type BenchmarkLayer,
  type WorkloadManifest
} from "./contract.ts";
import { runCurrentDecomposition } from "./current-decomposition.ts";
import { runHistoricalProduct } from "./historical-product.ts";
import { record } from "./evidence-shapes.ts";
import { isSupportedSupervisorPlatform } from "./target-evidence.ts";
import {
  fileSnapshotDigest,
  readManifest,
  readSources,
  sourceDigest,
  type WorkloadFile
} from "./workload.ts";

interface ComparisonInputs {
  readonly manifest: WorkloadManifest;
  readonly manifestSources: readonly WorkloadFile[];
  readonly productFiles: readonly WorkloadFile[];
}

interface EvidenceIdentity {
  readonly benchmarkId: string;
  readonly driverSnapshotDigest: string;
  readonly dirty: string;
  readonly head: string;
  readonly manifestDigest: string;
  readonly sourceDigest: string;
  readonly worktree: string;
}

export function runComparison(args: BenchmarkArguments): void {
  mkdirSync(args.outputDirectory, { recursive: true });
  const inputs = loadComparisonInputs();
  const evidence = formComparisonEvidence(args, inputs);
  writeComparisonEvidence(args.outputDirectory, evidence);
  console.log(`Wrote developer benchmark evidence: ${args.outputDirectory}`);
}

function loadComparisonInputs(): ComparisonInputs {
  const manifest = readManifest();
  const manifestSources = readSources(manifest.analyzerSourcePaths);
  const productFiles = readSources(manifest.productSourcePaths);
  return Object.freeze({ manifest, manifestSources, productFiles });
}

function formComparisonEvidence(args: BenchmarkArguments, inputs: ComparisonInputs) {
  const identity = comparisonIdentity(inputs.manifest, inputs.manifestSources);
  const layers = collectLayerEvidence(args, inputs);
  return Object.freeze({
    identity,
    layers: Object.freeze(layers),
    machine: machineMetadata(),
    mode: args.mode,
    temperature: args.temperature,
    protocol: Object.freeze({
      abbaBlocks: args.mode === "full" ? REQUIRED_ABBA_BLOCKS : 1,
      cold: "Each counted sample is a fresh direct-child target process after untimed equality preflight.",
      warm:
        args.temperature === "cold"
          ? "not run"
          : "Each counted operation follows one uncounted same-process analysis. RSS remains a whole target/session diagnostic, not a per-operation peak.",
      practicalEquivalenceBand: [0.95, 1.05],
      resource:
        "CPU is Linux wait4 target plus reaped descendants; RSS is max single process RSS, never a tree aggregate."
    })
  });
}

function comparisonIdentity(
  manifest: WorkloadManifest,
  manifestSources: readonly WorkloadFile[]
): EvidenceIdentity {
  return Object.freeze({
    benchmarkId: BENCHMARK_ID,
    driverSnapshotDigest: fileSnapshotDigest(driverSnapshotPaths),
    dirty: repositoryGit("status", "--porcelain"),
    head: repositoryGit("rev-parse", "HEAD"),
    manifestDigest: canonicalDigest(manifest),
    sourceDigest: sourceDigest(manifestSources),
    worktree: benchmarkRoot
  });
}

function collectLayerEvidence(args: BenchmarkArguments, inputs: ComparisonInputs): object[] {
  return args.layers.map((layer) => collectRequestedLayer(layer, args, inputs));
}

function collectRequestedLayer(
  layer: BenchmarkLayer,
  args: BenchmarkArguments,
  inputs: ComparisonInputs
): object {
  if (!isSupportedSupervisorPlatform(process.platform)) return unsupportedSupervisorLayer(layer);
  try {
    return executeLayer(layer, args, inputs);
  } catch (error) {
    return failedLayer(layer, error);
  }
}

function unsupportedSupervisorLayer(layer: BenchmarkLayer) {
  return Object.freeze({
    layer,
    reason:
      "The wait4 supervisor is validated only on Linux; no CPU/RSS or timing evidence was collected.",
    status: "not-comparable"
  });
}

function executeLayer(
  layer: BenchmarkLayer,
  args: BenchmarkArguments,
  inputs: ComparisonInputs
): object {
  if (layer === "analyzer-only") {
    return runAnalyzerOnly({
      lizard124Source: args.lizard124Source,
      manifest: inputs.manifest,
      mode: args.mode,
      outputDirectory: args.outputDirectory,
      temperature: args.temperature
    });
  }
  if (layer === "current-decomposition") {
    return runCurrentDecomposition({
      files: inputs.productFiles,
      mode: args.mode,
      outputDirectory: args.outputDirectory
    });
  }
  return runHistoricalProduct({
    files: inputs.productFiles,
    historicalWorktree: args.historicalWorktree,
    lizard123: args.lizard123,
    mode: args.mode,
    outputDirectory: args.outputDirectory,
    temperature: args.temperature
  });
}

function failedLayer(layer: BenchmarkLayer, error: unknown) {
  return Object.freeze({
    layer,
    reason: error instanceof Error ? error.message : String(error),
    status: "failed"
  });
}

function writeComparisonEvidence(
  outputDirectory: string,
  evidence: {
    readonly identity: { readonly head: string; readonly sourceDigest: string };
    readonly layers: readonly unknown[];
    readonly mode: string;
  }
): void {
  writeFileSync(
    resolve(outputDirectory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`
  );
  writeFileSync(resolve(outputDirectory, "summary.md"), renderSummary(evidence));
}

function renderSummary(evidence: {
  readonly identity: { readonly head: string; readonly sourceDigest: string };
  readonly layers: readonly unknown[];
  readonly mode: string;
}): string {
  return `# Lizard / TypeScript performance evidence

- Mode: \`${evidence.mode}\`
- HEAD: \`${evidence.identity.head}\` (worktree state is recorded in JSON)
- Source snapshot SHA-256: \`${evidence.identity.sourceDigest}\`

The machine-readable evidence is \`evidence.json\`; raw samples remain there rather than being duplicated here. A/B/C remain distinct; a missing A result is not replaced by B or C.

${evidence.layers.map(renderLayerSummary).join("\n")}
`;
}

function renderLayerSummary(layer: unknown): string {
  const value = record(layer);
  if (value === undefined) return "- invalid layer evidence";
  const name = typeof value.layer === "string" ? value.layer : "unknown layer";
  const status = typeof value.status === "string" ? value.status : "unknown";
  const workloads = Array.isArray(value.workloads) ? `; workloads: ${value.workloads.length}` : "";
  const reason = typeof value.reason === "string" ? `; ${value.reason}` : "";
  return `- ${name}: ${status}${workloads}${reason}`;
}
