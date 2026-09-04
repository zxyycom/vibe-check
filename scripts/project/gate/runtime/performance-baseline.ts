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
  readonly profile: "full" | "required";
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
 * Advisory baselines collected on 2026-09-02 with five interleaved, sequential
 * learned-critical-path invocations per profile. The threshold is the greater of p90 * 1.25 and
 * median * 1.5 so ordinary workstation noise remains non-blocking.
 */
export const PROJECT_GATE_PERFORMANCE_BASELINES: readonly ProjectGatePerformanceBaseline[] =
  Object.freeze([
    {
      medianMs: 11_205.7,
      p90Ms: 14_943.4,
      samplesMs: Object.freeze([10_739.5, 12_186.6, 14_943.4, 11_205.7, 9_345.3]),
      thresholdMs: 18_680,
      workload: Object.freeze({
        candidatePreparation: "reuse",
        declarativeFingerprint: "4a76afb8bedd38e01c3c4c5f9ddb716d49e3d0a5d4cb425059168cc8c9079141",
        profile: "required",
        runtime: Object.freeze({ architecture: "x64", bunVersion: "1.3.14", platform: "linux" })
      })
    },
    {
      medianMs: 17_581.6,
      p90Ms: 32_950.2,
      samplesMs: Object.freeze([16_666.3, 16_435.8, 32_950.2, 18_262.4, 17_581.6]),
      thresholdMs: 41_188,
      workload: Object.freeze({
        candidatePreparation: "reuse",
        declarativeFingerprint: "4a76afb8bedd38e01c3c4c5f9ddb716d49e3d0a5d4cb425059168cc8c9079141",
        profile: "full",
        runtime: Object.freeze({ architecture: "x64", bunVersion: "1.3.14", platform: "linux" })
      })
    }
  ]);
