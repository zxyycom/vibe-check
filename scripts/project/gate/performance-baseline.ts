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
 * Advisory baselines collected on 2026-08-29 with five interleaved, sequential
 * invocations per profile. The threshold is the greater of p90 * 1.25 and
 * median * 1.5 so ordinary workstation noise remains non-blocking.
 */
export const PROJECT_GATE_PERFORMANCE_BASELINES: readonly ProjectGatePerformanceBaseline[] =
  Object.freeze([
    {
      medianMs: 8_539.4,
      p90Ms: 14_673,
      samplesMs: Object.freeze([9_278.3, 14_673, 8_539.4, 8_426, 8_362.3]),
      thresholdMs: 18_342,
      workload: Object.freeze({
        candidatePreparation: "reuse",
        declarativeFingerprint: "fade9566d1846608820c4db3181eb6f37ac1e3d923e8b969342cbea69eb2d538",
        profile: "required",
        runtime: Object.freeze({ architecture: "x64", bunVersion: "1.3.14", platform: "linux" })
      })
    },
    {
      medianMs: 17_297,
      p90Ms: 23_195.2,
      samplesMs: Object.freeze([23_195.2, 16_219.4, 17_297, 18_005.7, 14_029]),
      thresholdMs: 28_994,
      workload: Object.freeze({
        candidatePreparation: "reuse",
        declarativeFingerprint: "fade9566d1846608820c4db3181eb6f37ac1e3d923e8b969342cbea69eb2d538",
        profile: "full",
        runtime: Object.freeze({ architecture: "x64", bunVersion: "1.3.14", platform: "linux" })
      })
    }
  ]);
