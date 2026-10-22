import { describe, it } from "node:test";

import { assertFinalizationPriority } from "./execution-lifecycle.test-support.ts";

describe("Markdown Link terminal I/O lifecycle", () => {
  it("awaits Worker exit and prioritizes cancellation, original failure and close failure before publication", () => {
    assertFinalizationPriority();
  });
});
