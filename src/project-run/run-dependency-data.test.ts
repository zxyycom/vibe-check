import { describe, it } from "node:test";

import { assertInheritedDependencyList } from "./run-dependency-data.test-support.ts";

import {
  assertInheritedDependencyRead,
  assertUnavailableDependencyRead
} from "./run.test-support.ts";

describe("Package Run", () => {
  it("observes an unavailable Check and exposes its read failure", async () => {
    await assertUnavailableDependencyRead();
    await assertInheritedDependencyRead();
    await assertInheritedDependencyList();
  });
});
