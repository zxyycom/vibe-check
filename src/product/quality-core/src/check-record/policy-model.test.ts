import { describe, expect, test } from "bun:test";

import {
  GATE_NOT_EVALUATED_REASONS,
  GATE_RESULT_STATUSES,
  REFERENCE_EVIDENCE_STATUSES
} from "./policy-model.ts";

describe("check-record policy model", () => {
  test("exposes only the closed reference, gate, and not-evaluated states", () => {
    expect(REFERENCE_EVIDENCE_STATUSES).toEqual(["complete", "unavailable", "incomplete"]);
    expect(GATE_RESULT_STATUSES).toEqual(["disabled", "passed", "failed", "not-evaluated"]);
    expect(GATE_NOT_EVALUATED_REASONS).toEqual([
      "scan-incomplete",
      "no-eligible-input",
      "comparison-unavailable"
    ]);
  });
});
