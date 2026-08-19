import { describe, it } from "node:test";

import { assertGeneratedContractMaterials } from "./publication-v3.contract-materials.test-support.ts";

describe("machine publication v3 contract", () => {
  it("generates canonical schema and example candidates that validate independently", () =>
    assertGeneratedContractMaterials());
});
