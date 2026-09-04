import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createProgressRenderer } from "./renderer.ts";
import { createWriter, settled, visibleTerminalScreen } from "./renderer.test-support.ts";

describe("Package Run progress terminal formatting", () => {
  it("renders an empty final TTY running region after zero-Check or fully settled progress", () => {
    const zero = createWriter({ isTTY: true });
    const zeroRenderer = createProgressRenderer(zero.writer);
    zeroRenderer.render({ kind: "prepared", totalChecks: 0 });
    zeroRenderer.render({
      kind: "final",
      checkDurations: [],
      counts: { failed: 0, notApplicable: 0, passed: 0, unavailable: 0 },
      elapsedMs: 0,
      execution: "completed"
    });

    assert.deepEqual(zero.writes, [
      "Vibe Check\ntotal 0 checks\n\nChecks:\n",
      "\nExecution summary:\n  execution: completed\n  total checks: 0\n  passed: 0\n  failed: 0\n  not applicable: 0\n  unavailable: 0\n  elapsed: 0ms\n  check durations:\n"
    ]);

    const completed = createWriter({ isTTY: true });
    const renderer = createProgressRenderer(completed.writer);
    renderer.render({ kind: "prepared", totalChecks: 2 });
    renderer.render({ kind: "started", checkId: "first", displayName: "First" });
    renderer.render({ kind: "started", checkId: "second", displayName: "Second" });
    renderer.render(settled("second", "Second", { status: "passed", data: {} }, 1));
    renderer.render(settled("first", "First", { status: "passed", data: {} }, 1));
    renderer.render({
      kind: "final",
      checkDurations: [],
      counts: { failed: 0, notApplicable: 0, passed: 2, unavailable: 0 },
      elapsedMs: 2,
      execution: "completed"
    });

    assert.equal(completed.writes.filter((write) => write === "\u001B[1A\u001B[2K").length, 4);
    assert.deepEqual(completed.writes.slice(-2), [
      "  [2/2] First | passed | 1ms\n",
      "\nExecution summary:\n  execution: completed\n  total checks: 2\n  passed: 2\n  failed: 0\n  not applicable: 0\n  unavailable: 0\n  elapsed: 2ms\n  check durations:\n"
    ]);
    assert.equal(completed.writes.at(-1)?.includes("running"), false);
    assert.deepEqual(visibleTerminalScreen(completed.writes), [
      "Vibe Check",
      "total 2 checks",
      "",
      "Checks:",
      "  [1/2] Second | passed | 1ms",
      "  [2/2] First | passed | 1ms",
      "",
      "Execution summary:",
      "  execution: completed",
      "  total checks: 2",
      "  passed: 2",
      "  failed: 0",
      "  not applicable: 0",
      "  unavailable: 0",
      "  elapsed: 2ms",
      "  check durations:"
    ]);
    assert.equal(
      visibleTerminalScreen(completed.writes).some((row) => row.includes("running")),
      false
    );
  });
});
