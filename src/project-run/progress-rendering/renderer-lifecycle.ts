import type {
  ProgressClock,
  ProgressFeedback,
  ProgressRenderer,
  ProgressWriter
} from "./renderer.ts";
import {
  formatFlagConditionNotMatchedBlock,
  formatFinalSummary,
  formatRunningRow,
  formatSettledBlock,
  isFlagConditionNotMatchedFeedback,
  shouldPresentSettledFeedback
} from "./renderer-formatting.ts";

interface RunningCheck {
  readonly checkId: string;
  readonly displayName: string;
  readonly startedAtMs: number;
  elapsedMs: number | null;
}

/** Maintains the mutable lifecycle state and the TTY-only running terminal region. */
export class ProgressRendererController implements ProgressRenderer {
  readonly refreshesRunningRegion: boolean;

  private readonly clock: ProgressClock;
  private readonly writer: ProgressWriter;
  private completedCount = 0;
  private readonly flagConditionNotMatchedDisplayNames: string[] = [];
  private preparedTotal: number | undefined;
  private renderedRunningRows = 0;
  private readonly running: RunningCheck[] = [];
  private readonly usesColor: boolean;

  constructor(writer: ProgressWriter, clock: ProgressClock) {
    this.writer = writer;
    this.clock = clock;
    this.refreshesRunningRegion = writer.isTTY && writer.term?.toLowerCase() !== "dumb";
    this.usesColor = this.refreshesRunningRegion && writer.color;
  }

  refresh(): void {
    if (!this.refreshesRunningRegion || this.running.length === 0) return;
    this.requirePrepared();
    this.eraseRunningRegion();
    this.updateRunningDurations(this.clock.now());
    this.redrawRunningRegion();
  }

  render(feedback: ProgressFeedback): void {
    switch (feedback.kind) {
      case "prepared":
        this.prepare(feedback.totalChecks);
        return;
      case "flag-control-completed":
        this.completeFlagControl();
        return;
      case "started":
        this.start(feedback);
        return;
      case "settled":
        this.settle(feedback);
        return;
      case "final":
        this.finish(feedback);
    }
  }

  private prepare(totalChecks: number): void {
    if (this.preparedTotal !== undefined) throw new Error("Progress feedback was prepared twice");
    this.preparedTotal = totalChecks;
    this.writer.write(`Vibe Check\ntotal ${totalChecks} checks\n\nChecks:\n`);
  }

  private start(feedback: Extract<ProgressFeedback, { readonly kind: "started" }>): void {
    if (!this.refreshesRunningRegion) return;
    this.requirePrepared();
    this.eraseRunningRegion();
    this.running.push({
      checkId: feedback.checkId,
      displayName: feedback.displayName,
      elapsedMs: null,
      startedAtMs: this.clock.now()
    });
    this.redrawRunningRegion();
  }

  private settle(feedback: Extract<ProgressFeedback, { readonly kind: "settled" }>): void {
    const totalChecks = this.requirePrepared();
    if (this.refreshesRunningRegion) this.eraseRunningRegion();
    this.completedCount += 1;
    this.removeRunningCheck(feedback.checkId);
    if (isFlagConditionNotMatchedFeedback(feedback)) {
      this.flagConditionNotMatchedDisplayNames.push(feedback.displayName);
    } else if (shouldPresentSettledFeedback(feedback)) {
      this.writer.write(
        formatSettledBlock({
          completionOrdinal: this.completedCount,
          displayName: feedback.displayName,
          durationMs: feedback.durationMs,
          messages: feedback.messages,
          outcome: feedback.outcome,
          records: feedback.records,
          totalChecks,
          usesColor: this.usesColor
        })
      );
    }
    if (this.refreshesRunningRegion) this.redrawRunningRegion();
  }

  private finish(feedback: Extract<ProgressFeedback, { readonly kind: "final" }>): void {
    this.requirePrepared();
    if (this.running.length > 0) {
      throw new Error("Progress feedback finalized while Checks are still running");
    }
    this.flushFlagConditionNotMatchedChecks();
    this.writer.write(formatFinalSummary(feedback));
  }

  private completeFlagControl(): void {
    this.requirePrepared();
    this.flushFlagConditionNotMatchedChecks();
  }

  private flushFlagConditionNotMatchedChecks(): void {
    const firstDisplayName = this.flagConditionNotMatchedDisplayNames[0];
    if (firstDisplayName === undefined) return;
    this.writer.write(
      formatFlagConditionNotMatchedBlock([
        firstDisplayName,
        ...this.flagConditionNotMatchedDisplayNames.slice(1)
      ])
    );
    this.flagConditionNotMatchedDisplayNames.length = 0;
  }

  private eraseRunningRegion(): void {
    for (let index = 0; index < this.renderedRunningRows; index += 1) {
      this.writer.write("\u001B[1A\u001B[2K");
    }
    this.renderedRunningRows = 0;
  }

  private redrawRunningRegion(): void {
    const totalChecks = this.requirePrepared();
    for (const [index, check] of this.running.entries()) {
      this.writer.write(
        formatRunningRow({
          displayIndex: this.completedCount + index + 1,
          displayName: check.displayName,
          elapsedMs: check.elapsedMs,
          totalChecks
        })
      );
    }
    this.renderedRunningRows = this.running.length;
  }

  private removeRunningCheck(checkId: string): void {
    const index = this.running.findIndex((check) => check.checkId === checkId);
    if (index >= 0) this.running.splice(index, 1);
  }

  private updateRunningDurations(refreshedAtMs: number): void {
    for (const check of this.running) {
      const elapsedMs = refreshedAtMs - check.startedAtMs;
      check.elapsedMs = Number.isFinite(elapsedMs) && elapsedMs >= 0 ? elapsedMs : 0;
    }
  }

  private requirePrepared(): number {
    if (this.preparedTotal === undefined) {
      throw new Error("Progress feedback arrived before preparation");
    }
    return this.preparedTotal;
  }
}
