import { describe, it } from "node:test";

import { assertPublishedRunIntegration } from "./check-facts-publication.test-support.ts";
import {
  assertAggregationFailureBoundaries,
  assertDefaultAndCustomAggregation
} from "./check-facts-aggregation.test-support.ts";
import { assertEffectiveFlagSelectionAggregation } from "./check-facts-effective-selection.test-support.ts";

describe("Package Run Check facts integration", () => {
  it("derives a default strict aggregate and accepts a synchronous custom aggregate", async () => {
    await assertDefaultAndCustomAggregation();
    await assertAggregationFailureBoundaries();
    await assertPublishedRunIntegration();
  });

  it("reuses effective flag selection for custom aggregation", async () => {
    await assertEffectiveFlagSelectionAggregation();
  });
});
