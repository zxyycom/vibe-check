import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runCandidateBackedQuality } from "./locked-run.ts";

describe("candidate-backed quality workflow", () => {
  it("does not start the repository scan when candidate preparation fails", async () => {
    let scanStarted = false;

    const status = await runCandidateBackedQuality({
      prepareCandidate: async () => {
        throw new Error("fixture preparation failure");
      },
      runScan: async () => {
        scanStarted = true;
        return 0;
      }
    });

    assert.equal(status, 1);
    assert.equal(scanStarted, false);
  });
});
