import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CheckOutcome } from "../definition/custom-check.ts";
import { createProgressRenderer, type ProgressFeedback, type ProgressWriter } from "./progress.ts";

const COUNTS = Object.freeze({ failed: 1, notApplicable: 1, passed: 1, unavailable: 1 });

function createWriter(input: Readonly<Partial<Omit<ProgressWriter, "write">>> = {}) {
  const writes: string[] = [];
  const writer: ProgressWriter = {
    color: input.color ?? false,
    isTTY: input.isTTY ?? false,
    term: input.term,
    write: (content: string): void => {
      writes.push(content);
    }
  };
  return { writes, writer };
}

function settled(
  checkId: string,
  displayName: string,
  outcome: CheckOutcome,
  durationMs: number | null
): ProgressFeedback {
  return { kind: "settled", checkId, displayName, durationMs, outcome };
}

/** A minimal independent terminal model for the cursor operations this renderer emits. */
function visibleTerminalScreen(writes: readonly string[]): readonly string[] {
  const rows = [""];
  let column = 0;
  let row = 0;
  const ensureRow = (): void => {
    while (rows.length <= row) rows.push("");
  };
  for (const write of writes) {
    for (let index = 0; index < write.length; index += 1) {
      if (write.startsWith("\u001B[1A", index)) {
        row = Math.max(0, row - 1);
        index += 3;
      } else if (write.startsWith("\u001B[2K", index)) {
        ensureRow();
        rows[row] = "";
        index += 3;
      } else if (write[index] === "\n") {
        row += 1;
        column = 0;
        ensureRow();
      } else {
        ensureRow();
        const current = rows[row] ?? "";
        rows[row] = `${current.slice(0, column)}${write[index]}${current.slice(column + 1)}`;
        column += 1;
      }
    }
  }
  let lastVisible = rows.length - 1;
  while (lastVisible >= 0 && rows[lastVisible] === "") lastVisible -= 1;
  return rows.slice(0, lastVisible + 1);
}

describe("Package Run progress lifecycle presentation", () => {
  it("maintains a TTY-only running region and assigns completion ordinals by settlement order", () => {
    const output = createWriter({ isTTY: true });
    const renderer = createProgressRenderer(output.writer);

    renderer.render({ kind: "prepared", totalChecks: 3 });
    renderer.render({
      kind: "started",
      checkId: "typescript",
      displayName: "TypeScript product lint"
    });
    renderer.render({ kind: "started", checkId: "network", displayName: "Network links" });
    renderer.render(settled("network", "Network links", { status: "passed", data: {} }, 2_500));

    assert.deepEqual(output.writes, [
      "Vibe Check\ntotal 3 checks\n\nChecks:\n",
      "  [1/3] TypeScript product lint | running\n",
      "\u001B[1A\u001B[2K",
      "  [1/3] TypeScript product lint | running\n",
      "  [2/3] Network links | running\n",
      "\u001B[1A\u001B[2K",
      "\u001B[1A\u001B[2K",
      "  [1/3] Network links | passed | 2.5s\n",
      "  [2/3] TypeScript product lint | running\n"
    ]);
  });

  it("keeps plain and dumb-terminal output append-only and settled-only", () => {
    for (const writerOptions of [{ isTTY: false }, { isTTY: true, term: "dumb" }]) {
      const output = createWriter(writerOptions);
      const renderer = createProgressRenderer(output.writer);

      renderer.render({ kind: "prepared", totalChecks: 1 });
      renderer.render({ kind: "started", checkId: "links", displayName: "Network links" });
      renderer.render(settled("links", "Network links", { status: "passed", data: {} }, 2_500));
      renderer.render({
        kind: "final",
        counts: { ...COUNTS, failed: 0, notApplicable: 0, unavailable: 0 },
        elapsedMs: 2_500,
        execution: "completed"
      });

      assert.deepEqual(output.writes, [
        "Vibe Check\ntotal 1 checks\n\nChecks:\n",
        "  [1/1] Network links | passed | 2.5s\n",
        "\nExecution summary:\n  execution: completed\n  total checks: 1\n  passed: 1\n  failed: 0\n  not applicable: 0\n  unavailable: 0\n  elapsed: 2.5s\n"
      ]);
      assert.equal(output.writes.join("").includes("\u001B"), false);
    }
  });

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

  it("uses ANSI status color only for color-capable TTY writers", () => {
    const colorTTY = createWriter({ color: true, isTTY: true });
    const renderer = createProgressRenderer(colorTTY.writer);
    renderer.render({ kind: "prepared", totalChecks: 1 });
    renderer.render({ kind: "started", checkId: "failed", displayName: "Failed" });
    renderer.render(settled("failed", "Failed", { status: "failed", data: {} }, 1));

    assert.deepEqual(colorTTY.writes.slice(1), [
      "  [1/1] Failed | \u001B[2mrunning\u001B[0m\n",
      "\u001B[1A\u001B[2K",
      "  [1/1] Failed | \u001B[31mfailed\u001B[0m | 1ms\n"
    ]);

    const plain = createWriter({ color: true, isTTY: false });
    const plainRenderer = createProgressRenderer(plain.writer);
    plainRenderer.render({ kind: "prepared", totalChecks: 1 });
    plainRenderer.render(settled("failed", "Failed", { status: "failed", data: {} }, 1));
    assert.equal(plain.writes.join("").includes("\u001B"), false);

    const unsafeTTY = createWriter({ isTTY: true });
    const unsafeTTYRenderer = createProgressRenderer(unsafeTTY.writer);
    unsafeTTYRenderer.render({ kind: "prepared", totalChecks: 1 });
    unsafeTTYRenderer.render({
      kind: "started",
      checkId: "unsafe",
      displayName: "Unsafe\nlabel\u001B[31m"
    });
    unsafeTTYRenderer.render(
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
  });

  it("renders an empty final TTY running region after zero-Check or fully settled progress", () => {
    const zero = createWriter({ isTTY: true });
    const zeroRenderer = createProgressRenderer(zero.writer);
    zeroRenderer.render({ kind: "prepared", totalChecks: 0 });
    zeroRenderer.render({
      kind: "final",
      counts: { failed: 0, notApplicable: 0, passed: 0, unavailable: 0 },
      elapsedMs: 0,
      execution: "completed"
    });

    assert.deepEqual(zero.writes, [
      "Vibe Check\ntotal 0 checks\n\nChecks:\n",
      "\nExecution summary:\n  execution: completed\n  total checks: 0\n  passed: 0\n  failed: 0\n  not applicable: 0\n  unavailable: 0\n  elapsed: 0ms\n"
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
      counts: { failed: 0, notApplicable: 0, passed: 2, unavailable: 0 },
      elapsedMs: 2,
      execution: "completed"
    });

    assert.equal(completed.writes.filter((write) => write === "\u001B[1A\u001B[2K").length, 4);
    assert.deepEqual(completed.writes.slice(-2), [
      "  [2/2] First | passed | 1ms\n",
      "\nExecution summary:\n  execution: completed\n  total checks: 2\n  passed: 2\n  failed: 0\n  not applicable: 0\n  unavailable: 0\n  elapsed: 2ms\n"
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
      "  elapsed: 2ms"
    ]);
    assert.equal(
      visibleTerminalScreen(completed.writes).some((row) => row.includes("running")),
      false
    );
  });

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
