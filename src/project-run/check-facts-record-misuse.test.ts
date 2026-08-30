import { describe, it } from "node:test";

import {
  assertAcceptedAuthorReasonMessage,
  assertCancellationRetainsPriorMessages,
  assertInvalidCallbackOutcomes,
  assertInvalidRecordUseIsContained
} from "./check-facts-record-misuse.test-support.ts";

describe("Package Run Check facts integration", () => {
  it("contains invalid callback outcomes and Record misuse in the owning Check", async () => {
    await assertInvalidCallbackOutcomes();
    await assertAcceptedAuthorReasonMessage();
    await assertInvalidRecordUseIsContained();
    await assertCancellationRetainsPriorMessages();
  });
});
