import { benchmarkRoot, currentHarnessPath, portHarnessPath } from "./benchmark-context.ts";
import { canonicalDigest, canonicalMetrics } from "./canonical.ts";
import { REQUIRED_ABBA_BLOCKS, type BenchmarkMode } from "./contract.ts";
import { assertStableOutputDigest } from "./sampling.ts";
import { childValue, runTarget } from "./target-evidence.ts";
import { writeRequest, type WorkloadFile } from "./workload.ts";

interface CurrentDecompositionInput {
  readonly files: readonly WorkloadFile[];
  readonly mode: BenchmarkMode;
  readonly outputDirectory: string;
}

interface CurrentSampleInput {
  readonly ordinal: number;
  readonly preflightDigest: string;
  readonly requestPath: string;
}

export function runCurrentDecomposition(input: CurrentDecompositionInput) {
  const requestPath = writeRequest(input.outputDirectory, "current-decomposition-request.json", {
    files: input.files,
    rootDir: benchmarkRoot
  });
  const preflight = childValue(
    runTarget([process.execPath, currentHarnessPath, requestPath]),
    "current Product preflight"
  );
  const preflightDigest = canonicalDigest(canonicalMetrics(preflight.metrics));
  const corePreflight = childValue(
    runTarget([process.execPath, portHarnessPath, requestPath]),
    "C direct port preflight"
  );
  assertStableOutputDigest(
    preflightDigest,
    canonicalDigest(canonicalMetrics(corePreflight.metrics)),
    "C direct port preflight"
  );
  const samples = collectCurrentSamples({
    count: input.mode === "full" ? REQUIRED_ABBA_BLOCKS * 2 : 2,
    preflightDigest,
    requestPath
  });
  return Object.freeze({
    layer: "C current Product decomposition",
    preflight: Object.freeze({
      outputDigest: preflightDigest,
      directPortFacadeHarnessMs: corePreflight.operationWallMs ?? null,
      stages: preflight.stages ?? {}
    }),
    samples: Object.freeze(samples),
    status: "current-only; no historical equivalence claim"
  });
}

function collectCurrentSamples(input: {
  readonly count: number;
  readonly preflightDigest: string;
  readonly requestPath: string;
}): object[] {
  const samples: object[] = [];
  for (let ordinal = 1; ordinal <= input.count; ordinal += 1) {
    samples.push(
      currentSample({
        ordinal,
        preflightDigest: input.preflightDigest,
        requestPath: input.requestPath
      })
    );
  }
  return samples;
}

function currentSample(input: CurrentSampleInput): object {
  const observed = runTarget([process.execPath, currentHarnessPath, input.requestPath]);
  const value = childValue(observed, `current Product sample ${input.ordinal}`);
  const outputDigest = canonicalDigest(canonicalMetrics(value.metrics));
  assertStableOutputDigest(
    input.preflightDigest,
    outputDigest,
    `C current Product sample ${input.ordinal}`
  );
  const core = childValue(
    runTarget([process.execPath, portHarnessPath, input.requestPath]),
    `C direct port sample ${input.ordinal}`
  );
  assertStableOutputDigest(
    input.preflightDigest,
    canonicalDigest(canonicalMetrics(core.metrics)),
    `C direct port sample ${input.ordinal}`
  );
  if (core.operationWallMs === undefined) {
    throw new Error(`C direct port sample ${input.ordinal} emitted no operation duration`);
  }
  return Object.freeze({
    ordinal: input.ordinal,
    observedWallMs: observed.wallMs,
    operationWallMs: value.operationWallMs ?? null,
    outputDigest,
    sessionDiagnostics: Object.freeze({ resource: observed.resource }),
    stageScopes: Object.freeze({
      ...(value.stageScopes ?? {}),
      directPortFacadeHarnessMs:
        "separate process operation diagnostic; it includes port-facade output mapping and is not additive"
    }),
    stages: Object.freeze({
      ...(value.stages ?? {}),
      directPortFacadeHarnessMs: core.operationWallMs
    })
  });
}
