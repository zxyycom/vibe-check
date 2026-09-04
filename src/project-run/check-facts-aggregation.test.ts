import { describe, it } from "node:test";

import { assertPublishedRunIntegration } from "./check-facts-publication.test-support.ts";
import {
  assertAggregationPolicyMatrix,
  assertInvalidAggregationSelections,
  assertRawAndSelectedAggregate
} from "./check-facts-aggregation.test-support.ts";
import { assertEffectiveFlagSelectionAggregation } from "./check-facts-effective-selection.test-support.ts";

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
