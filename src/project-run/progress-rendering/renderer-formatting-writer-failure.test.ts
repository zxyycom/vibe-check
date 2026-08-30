import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createProgressRenderer } from "./renderer.ts";

describe("Package Run progress terminal formatting", () => {
  it("propagates writer failures without swallowing them or attempting later writes", () => {
    let writes = 0;
    const renderer = createProgressRenderer({
      color: false,
      isTTY: false,
      term: undefined,
      write: (): void => {
        writes += 1;
        throw new Error("stream closed");
      }
    });

    assert.throws(() => renderer.render({ kind: "prepared", totalChecks: 1 }), /stream closed/);
    assert.equal(writes, 1);
  });
});
