import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CheckMessage, CheckOutcome, CheckVisibility } from "../../check/check.ts";
import { createProgressRenderer } from "./renderer.ts";
import { COUNTS, createWriter, settled } from "./renderer.test-support.ts";

describe("Package Run progress lifecycle presentation", () => {
  it("maintains a TTY-only running region and assigns completion ordinals by settlement order", () => {
    const output = createWriter({ isTTY: true });
    let nowMs = 0;
    const renderer = createProgressRenderer(output.writer, { now: () => nowMs });

    renderer.render({ kind: "prepared", totalChecks: 3 });
    renderer.render({
      kind: "started",
      checkId: "typescript",
      displayName: "TypeScript product lint"
    });
    nowMs = 2_500;
    renderer.render({ kind: "started", checkId: "network", displayName: "Network links" });
    nowMs = 5_000;
    renderer.refresh();
    renderer.render(settled("network", "Network links", { status: "passed", data: {} }, 2_500));

    assert.deepEqual(output.writes, [
      "Vibe Check\ntotal 3 checks\n\nChecks:\n",
      "  [1/3] TypeScript product lint | running\n",
      "\u001B[1A\u001B[2K",
      "  [1/3] TypeScript product lint | running\n",
      "  [2/3] Network links | running\n",
      "\u001B[1A\u001B[2K",
      "\u001B[1A\u001B[2K",
      "  [1/3] TypeScript product lint | running | 5s\n",
      "  [2/3] Network links | running | 2.5s\n",
      "\u001B[1A\u001B[2K",
      "\u001B[1A\u001B[2K",
      "  [1/3] Network links | passed | 2.5s\n",
      "  [2/3] TypeScript product lint | running | 5s\n"
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
  it("applies the settled visibility matrix consistently in plain and dumb terminals", () => {
    const cases: readonly Readonly<{
      readonly expected?: string;
      readonly messages?: readonly CheckMessage[];
      readonly name: string;
      readonly outcome: CheckOutcome;
      readonly visibility: CheckVisibility;
    }>[] = [
      {
        name: "always passed without messages",
        outcome: { status: "passed", data: {} },
        visibility: "always",
        expected: "  [1/1] always passed without messages | passed | 1ms\n"
      },
      {
        name: "attention passed without messages",
        outcome: { status: "passed", data: {} },
        visibility: "attention"
      },
      {
        name: "attention passed with messages",
        outcome: { status: "passed", data: {} },
        visibility: "attention",
        messages: [{ level: "info", code: "retained", message: "visible detail" }],
        expected:
          "  [1/1] attention passed with messages | passed | 1ms\n    [info] visible detail\n"
      },
      {
        name: "attention failed",
        outcome: { status: "failed", data: {} },
        visibility: "attention",
        expected: "  [1/1] attention failed | failed | 1ms\n"
      },
      {
        name: "attention not applicable",
        outcome: { status: "not-applicable", reason: { code: "excluded" } },
        visibility: "attention",
        expected: "  [1/1] attention not applicable | not-applicable | 1ms | excluded\n"
      },
      {
        name: "attention unavailable",
        outcome: { status: "unavailable", reason: { code: "unavailable" } },
        visibility: "attention",
        expected: "  [1/1] attention unavailable | unavailable | 1ms | unavailable\n"
      }
    ];

    for (const writerOptions of [{ isTTY: false }, { isTTY: true, term: "dumb" }]) {
      for (const testCase of cases) {
        const output = createWriter(writerOptions);
        const renderer = createProgressRenderer(output.writer);
        renderer.render({ kind: "prepared", totalChecks: 1 });
        renderer.render(
          settled(testCase.name, testCase.name, testCase.outcome, 1, {
            messages: testCase.messages,
            visibility: testCase.visibility
          })
        );

        assert.deepEqual(
          output.writes.slice(1),
          testCase.expected === undefined ? [] : [testCase.expected],
          `${JSON.stringify(writerOptions)}: ${testCase.name}`
        );
      }
    }
  });
  it("hides only attention passed rows after clearing TTY running rows and writes each visible block atomically", () => {
    const output = createWriter({ isTTY: true });
    const renderer = createProgressRenderer(output.writer);
    const hostileMessage = "notice\nline\rreturn\ttab\u001Bescape\u2028separator\u2029paragraph";

    renderer.render({ kind: "prepared", totalChecks: 5 });
    renderer.render({ kind: "started", checkId: "hidden", displayName: "Hidden" });
    renderer.render({ kind: "started", checkId: "message", displayName: "Message" });
    renderer.render({ kind: "started", checkId: "failed", displayName: "Failed" });
    renderer.render({ kind: "started", checkId: "not-applicable", displayName: "Not applicable" });
    renderer.render({ kind: "started", checkId: "unavailable", displayName: "Unavailable" });
    renderer.render(
      settled("hidden", "Hidden", { status: "passed", data: {} }, 1, { visibility: "attention" })
    );
    renderer.render(
      settled("message", "Message", { status: "passed", data: {} }, 1, {
        visibility: "attention",
        messages: [{ level: "warning", code: "private-code", message: hostileMessage }]
      })
    );
    renderer.render(
      settled("failed", "Failed", { status: "failed", data: {} }, 1, { visibility: "attention" })
    );
    renderer.render(
      settled(
        "not-applicable",
        "Not applicable",
        { status: "not-applicable", reason: { code: "excluded" } },
        1,
        { visibility: "attention" }
      )
    );
    renderer.render(
      settled(
        "unavailable",
        "Unavailable",
        { status: "unavailable", reason: { code: "unavailable" } },
        1,
        { visibility: "attention" }
      )
    );
    renderer.render({
      kind: "final",
      counts: { failed: 1, notApplicable: 1, passed: 2, unavailable: 1 },
      elapsedMs: 5,
      execution: "completed"
    });

    const settledBlock =
      "  [2/5] Message | passed | 1ms\n    [warning] notice\\nline\\rreturn\\ttab\\u001Bescape\\u2028separator\\u2029paragraph\n";
    const settledBlockIndex = output.writes.indexOf(settledBlock);
    assert.ok(settledBlockIndex > 1);
    assert.deepEqual(
      output.writes.slice(settledBlockIndex - 4, settledBlockIndex),
      Array(4).fill("\u001B[1A\u001B[2K")
    );
    assert.equal(output.writes[settledBlockIndex + 1], "  [3/5] Failed | running\n");
    assert.equal(output.writes.includes("  [1/5] Hidden | passed | 1ms\n"), false);
    assert.equal(output.writes.includes("  [3/5] Failed | failed | 1ms\n"), true);
    assert.equal(
      output.writes.includes("  [4/5] Not applicable | not-applicable | 1ms | excluded\n"),
      true
    );
    assert.equal(
      output.writes.includes("  [5/5] Unavailable | unavailable | 1ms | unavailable\n"),
      true
    );
    assert.equal(output.writes.at(-1)?.includes("  total checks: 5\n  passed: 2\n"), true);
    assert.equal(settledBlock.includes("private-code"), false);
    assert.equal(settledBlock.split("\n").length, 3);
  });
});
