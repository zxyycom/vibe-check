import type { CheckMessage, CheckOutcome, CheckVisibility } from "../../check/check.ts";
import { ProgressRendererController } from "./renderer-lifecycle.ts";

export interface ProgressWriter {
  readonly color: boolean;
  readonly isTTY: boolean;
  readonly term: string | undefined;
  close?(): void;
  write(content: string): void;
}

export type ProgressFeedback = Readonly<
  | {
      readonly kind: "prepared";
      readonly totalChecks: number;
    }
  | {
      readonly kind: "flag-control-completed";
    }
  | {
      readonly kind: "started";
      readonly checkId: string;
      readonly displayName: string;
    }
  | {
      readonly kind: "settled";
      readonly checkId: string;
      readonly displayName: string;
      readonly outcome: CheckOutcome;
      readonly durationMs: number | null;
      readonly visibility: CheckVisibility;
      readonly messages: readonly CheckMessage[];
    }
  | {
      readonly kind: "final";
      readonly execution: "cancelled" | "completed";
      readonly counts: ProgressOutcomeCounts;
      readonly elapsedMs: number;
      /** Ordered full summary; `null` means that Check never executed. */
      readonly checkDurations: readonly Readonly<{
        readonly checkId: string;
        readonly durationMs: number | null;
      }>[];
    }
>;

export interface ProgressOutcomeCounts {
  readonly failed: number;
  readonly notApplicable: number;
  readonly passed: number;
  readonly unavailable: number;
}

export interface ProgressRenderer {
  refresh(): void;
  readonly refreshesRunningRegion: boolean;
  render(feedback: ProgressFeedback): void;
}

export interface ProgressClock {
  now(): number;
}

const SYSTEM_PROGRESS_CLOCK: ProgressClock = Object.freeze({ now: () => performance.now() });

/** Product-private lifecycle presentation with one owner for feedback and its writer. */
export function createProgressRenderer(
  writer: ProgressWriter,
  clock: ProgressClock = SYSTEM_PROGRESS_CLOCK
): ProgressRenderer {
  const controller = new ProgressRendererController(writer, clock);
  return Object.freeze({
    refreshesRunningRegion: controller.refreshesRunningRegion,
    refresh: (): void => controller.refresh(),
    render: (feedback: ProgressFeedback): void => controller.render(feedback)
  });
}
