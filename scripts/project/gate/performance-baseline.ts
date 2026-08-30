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
 * Advisory baselines collected on 2026-08-30 with five interleaved, sequential
 * invocations per profile. The threshold is the greater of p90 * 1.25 and
 * median * 1.5 so ordinary workstation noise remains non-blocking.
 */
export const PROJECT_GATE_PERFORMANCE_BASELINES: readonly ProjectGatePerformanceBaseline[] =
  Object.freeze([
    {
      medianMs: 8_160.6,
      p90Ms: 8_539.9,
      samplesMs: Object.freeze([8_046.2, 8_539.9, 8_129.6, 8_274.1, 8_160.6]),
      thresholdMs: 12_241,
      workload: Object.freeze({
        candidatePreparation: "reuse",
        declarativeFingerprint: "e443355505b751fa3e893c227575599c5cc19fe8594e9dc50189d41041784d66",
        profile: "required",
        runtime: Object.freeze({ architecture: "x64", bunVersion: "1.3.14", platform: "linux" })
      })
    },
    {
      medianMs: 14_328.4,
      p90Ms: 14_545.2,
      samplesMs: Object.freeze([14_545.2, 14_328.4, 14_100.9, 13_928, 14_446.2]),
      thresholdMs: 21_493,
      workload: Object.freeze({
        candidatePreparation: "reuse",
        declarativeFingerprint: "e443355505b751fa3e893c227575599c5cc19fe8594e9dc50189d41041784d66",
        profile: "full",
        runtime: Object.freeze({ architecture: "x64", bunVersion: "1.3.14", platform: "linux" })
      })
    }
  ]);
