import { describe, it } from "node:test";

import {
  assertInheritedDependencyRead,
  assertUnavailableDependencyRead
} from "./run.test-support.ts";

describe("Package Run", () => {
  it("admits an unavailable dependency and exposes its read failure", async () => {
    await assertUnavailableDependencyRead();
    await assertInheritedDependencyRead();
  });
});
