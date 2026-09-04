import { describe, it } from "node:test";

import { assertPublishedRunIntegration } from "./check-facts-publication.test-support.ts";
import {
  assertAggregationPolicyMatrix,
  assertEffectiveFlagSelectionAggregation,
  assertInvalidAggregationSelections,
  assertRawAndSelectedAggregate
} from "./check-facts-aggregation.test-support.ts";

describe("Package Run Check facts integration", () => {
  it("publishes raw facts and derives an aggregate only from explicit selected statuses", async () => {
    await assertRawAndSelectedAggregate();
    await assertAggregationPolicyMatrix();
    await assertInvalidAggregationSelections();
    await assertPublishedRunIntegration();
  });

  it("reuses effective flag selection for explicit aggregation", async () => {
    await assertEffectiveFlagSelectionAggregation();
  });
});
