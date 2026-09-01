import type { ProjectGateProfile } from "./catalog.ts";

/** The runtime identity under which one Gate performance workload was measured. */
export interface ProjectGatePerformanceRuntime {
  readonly architecture: string;
  readonly bunVersion: string;
  readonly platform: string;
}

/** A reproducible standard Gate workload whose elapsed samples may be compared. */
export interface ProjectGatePerformanceWorkload {
  readonly candidatePreparation: "reuse";
  readonly declarativeFingerprint: string;
  readonly profile: ProjectGateProfile;
  readonly runtime: ProjectGatePerformanceRuntime;
}

/**
 * Auditable advisory evidence for one standard Gate workload. Samples remain raw so
 * threshold changes can be reviewed against the measurement distribution.
 */
export interface ProjectGatePerformanceBaseline {
  readonly medianMs: number;
  readonly p90Ms: number;
  readonly samplesMs: readonly number[];
  readonly thresholdMs: number;
  readonly workload: ProjectGatePerformanceWorkload;
}

/**
 * Advisory baselines collected on 2026-09-01 with five interleaved, sequential
 * invocations per profile. The threshold is the greater of p90 * 1.25 and
 * median * 1.5 so ordinary workstation noise remains non-blocking.
 */
export const PROJECT_GATE_PERFORMANCE_BASELINES: readonly ProjectGatePerformanceBaseline[] =
  Object.freeze([
    {
      medianMs: 8_558.9,
      p90Ms: 9_179.6,
      samplesMs: Object.freeze([9_179.6, 8_558.9, 8_214.5, 9_062.2, 8_539.2]),
      thresholdMs: 12_839,
      workload: Object.freeze({
        candidatePreparation: "reuse",
        declarativeFingerprint: "35f41c18d236e833261e413f680747fd59e54a0cbd28d01057e99bccdd9dec2b",
        profile: "required",
        runtime: Object.freeze({ architecture: "x64", bunVersion: "1.3.14", platform: "linux" })
      })
    },
    {
      medianMs: 13_888.5,
      p90Ms: 15_516.6,
      samplesMs: Object.freeze([15_516.6, 14_032.8, 13_831, 13_716.9, 13_888.5]),
      thresholdMs: 20_833,
      workload: Object.freeze({
        candidatePreparation: "reuse",
        declarativeFingerprint: "35f41c18d236e833261e413f680747fd59e54a0cbd28d01057e99bccdd9dec2b",
        profile: "full",
        runtime: Object.freeze({ architecture: "x64", bunVersion: "1.3.14", platform: "linux" })
      })
    }
  ]);
