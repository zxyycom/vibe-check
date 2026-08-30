import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createProgressRenderer } from "./renderer.ts";
import { createWriter, settled } from "./renderer.test-support.ts";

describe("Package Run progress terminal formatting", () => {
  it("uses ANSI color only for message level labels on color-capable TTY writers", () => {
    const colorTTY = createWriter({ color: true, isTTY: true });
    const renderer = createProgressRenderer(colorTTY.writer);
    renderer.render({ kind: "prepared", totalChecks: 1 });
    renderer.render({ kind: "started", checkId: "failed", displayName: "Failed" });
    renderer.render(
      settled("failed", "Failed", { status: "failed", data: {} }, 1, {
        messages: [
          { level: "info", code: "details", message: "information" },
          { level: "warning", code: "warning", message: "caution" },
          { level: "error", code: "error", message: "failure" }
        ]
      })
    );

    assert.deepEqual(colorTTY.writes.slice(1), [
      "  [1/1] Failed | running\n",
      "\u001B[1A\u001B[2K",
      "  [1/1] Failed | failed | 1ms\n    [\u001B[36minfo\u001B[0m] information\n    [\u001B[33mwarning\u001B[0m] caution\n    [\u001B[31merror\u001B[0m] failure\n"
    ]);

    const plain = createWriter({ color: true, isTTY: false });
    const plainRenderer = createProgressRenderer(plain.writer);
    plainRenderer.render({ kind: "prepared", totalChecks: 1 });
    plainRenderer.render(
      settled("failed", "Failed", { status: "failed", data: {} }, 1, {
        messages: [{ level: "error", code: "failure", message: "failure" }]
      })
    );
    assert.equal(plain.writes.join("").includes("\u001B"), false);

    assertTTYTerminalTextIsEscaped();
  });
});
function assertTTYTerminalTextIsEscaped(): void {
  const unsafeTTY = createWriter({ isTTY: true });
  const renderer = createProgressRenderer(unsafeTTY.writer);
  renderer.render({ kind: "prepared", totalChecks: 1 });
  renderer.render({
    kind: "started",
    checkId: "unsafe",
    displayName: "Unsafe\nlabel\u001B[31m"
  });
  renderer.render(
    settled(
      "unsafe",
      "Unsafe\nlabel\u001B[31m",
      { status: "unavailable", reason: { code: "bad\rreason\u001B[0m" } },
      null
    )
  );

  assert.equal(unsafeTTY.writes[1]?.includes("\u001B"), false);
  assert.equal(unsafeTTY.writes[1]?.split("\n").length, 2);
  assert.equal(unsafeTTY.writes[1]?.includes("Unsafe\\nlabel\\u001B[31m"), true);
  assert.equal(unsafeTTY.writes[3]?.includes("\u001B"), false);
  assert.equal(unsafeTTY.writes[3]?.split("\n").length, 2);
  assert.equal(unsafeTTY.writes[3]?.includes("bad\\rreason\\u001B[0m"), true);
}
