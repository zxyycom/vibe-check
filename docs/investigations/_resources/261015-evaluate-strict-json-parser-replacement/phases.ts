import assert from "node:assert/strict";
import { loadWorkloads } from "./corpus.ts";
import { momoaPhases } from "./momoa-control.ts";
import { nativePhases } from "./native-iterative-prototype.ts";

interface PhaseSample {
  readonly decodeMs: number;
  readonly parseMs: number;
  readonly projectionMs: number;
  readonly duplicateMs?: number;
  readonly duplicate: boolean;
}

const packPath = process.argv[2];
assert.ok(packPath !== undefined);
for (let round = 0; round < 4; round += 1) {
  for (const workload of loadWorkloads(packPath).slice(0, 2)) {
    for (const mode of round % 2 === 0 ? ["momoa", "native"] : ["native", "momoa"]) {
      const totals = { decodeMs: 0, parseMs: 0, duplicateMs: 0, projectionMs: 0 };
      for (const bytes of workload.documents) {
        const phases: PhaseSample = mode === "momoa" ? momoaPhases(bytes) : nativePhases(bytes);
        totals.decodeMs += phases.decodeMs;
        totals.parseMs += phases.parseMs;
        totals.projectionMs += phases.projectionMs;
        if ("duplicateMs" in phases) totals.duplicateMs += phases.duplicateMs;
        assert.equal(phases.duplicate, false);
      }
      console.log(
        JSON.stringify({
          mode,
          workload: workload.id,
          round,
          warmup: round === 0,
          runtime: process.version,
          bun: process.versions.bun ?? null,
          ...totals
        })
      );
    }
  }
}
