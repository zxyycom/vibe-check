import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createProgressRenderer } from "./renderer.ts";
import { createWriter, settled } from "./renderer.test-support.ts";

describe("Package Run progress terminal formatting", () => {
  it("formats every terminal status with measured duration or not run and only the safe reason code", () => {
    const output = createWriter();
    const renderer = createProgressRenderer(output.writer);
    renderer.render({ kind: "prepared", totalChecks: 4 });
    renderer.render(settled("passed", "Passed", { status: "passed", data: {} }, 10));
    renderer.render(settled("failed", "Failed", { status: "failed", data: {} }, 1_000));
    renderer.render(
      settled(
        "not-applicable",
        "Not applicable",
        { status: "not-applicable", reason: { code: "project-disabled" } },
        0
      )
    );
    renderer.render(
      settled(
        "unavailable",
        "Unavailable",
        {
          status: "unavailable",
          reason: { code: "prerequisite-unavailable", checkIds: ["failed"] }
        },
        null
      )
    );

    assert.deepEqual(output.writes.slice(1), [
      "  [1/4] Passed | passed | 10ms\n",
      "  [2/4] Failed | failed | 1s\n",
      "  [3/4] Not applicable | not-applicable | 0ms | project-disabled\n",
      "  [4/4] Unavailable | unavailable | not run | prerequisite-unavailable\n"
    ]);
    assert.equal(output.writes.join("").includes('failed"]'), false);

    const unsafePlain = createWriter();
    const unsafePlainRenderer = createProgressRenderer(unsafePlain.writer);
    unsafePlainRenderer.render({ kind: "prepared", totalChecks: 1 });
    unsafePlainRenderer.render(
      settled(
        "unsafe",
        "Unsafe\nlabel\u001B[31m",
        { status: "unavailable", reason: { code: "bad\rreason\u001B[0m" } },
        null
      )
    );

    assert.equal(unsafePlain.writes[1]?.includes("\u001B"), false);
    assert.equal(unsafePlain.writes[1]?.split("\n").length, 2);
    assert.equal(unsafePlain.writes[1]?.includes("Unsafe\\nlabel\\u001B[31m"), true);
    assert.equal(unsafePlain.writes[1]?.includes("bad\\rreason\\u001B[0m"), true);
  });
});
