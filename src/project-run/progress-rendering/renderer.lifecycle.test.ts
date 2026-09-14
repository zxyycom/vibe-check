import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CheckMessage, CheckOutcome } from "../../check/check.ts";
import { FLAG_CONDITION_NOT_MATCHED_CODE } from "../check-execution/flag-controls.ts";
import { createProgressRenderer } from "./renderer.ts";
import { COUNTS, createWriter, settled } from "./renderer.test-support.ts";

describe("Package Run progress lifecycle presentation", () => {
  it("maintains a TTY-only running region and assigns completion ordinals by settlement order", () => {
    const output = createWriter({ isTTY: true });
    let nowMs = 0;
    const renderer = createProgressRenderer(output.writer, { now: () => nowMs });

    renderer.render({ kind: "prepared", quietPassOmissionConfiguredCount: 0, totalChecks: 3 });
    renderer.render({
      kind: "started",
      omitQuietPassedRow: false,
      checkId: "typescript",
      displayName: "TypeScript product lint"
    });
    nowMs = 2_500;
    renderer.render({
      kind: "started",
      omitQuietPassedRow: false,
      checkId: "network",
      displayName: "Network links"
    });
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
  it("keeps plain and dumb-terminal output append-only without running rows", () => {
    for (const writerOptions of [{ isTTY: false }, { isTTY: true, term: "dumb" }]) {
      const output = createWriter(writerOptions);
      const renderer = createProgressRenderer(output.writer);

      renderer.render({ kind: "prepared", quietPassOmissionConfiguredCount: 0, totalChecks: 1 });
      renderer.render({
        kind: "started",
        omitQuietPassedRow: false,
        checkId: "links",
        displayName: "Network links"
      });
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
  it("applies quiet-pass omission and unnumbered retained rows consistently in plain and dumb terminals", () => {
    const cases: readonly Readonly<{
      readonly expected?: string;
      readonly messages?: readonly CheckMessage[];
      readonly name: string;
      readonly outcome: CheckOutcome;
      readonly omitQuietPassedRow: boolean;
    }>[] = [
      {
        name: "ordinary passed without accepted detail",
        outcome: { status: "passed", data: {} },
        omitQuietPassedRow: false,
        expected: "  [1/1] ordinary passed without accepted detail | passed | 1ms\n"
      },
      {
        name: "quiet passed without accepted detail",
        outcome: { status: "passed", data: {} },
        omitQuietPassedRow: true
      },
      {
        name: "quiet policy passed with messages",
        outcome: { status: "passed", data: {} },
        omitQuietPassedRow: true,
        messages: [{ level: "info", code: "retained", message: "visible detail" }],
        expected:
          "  · quiet policy passed with messages | passed | 1ms\n    [info] visible detail\n"
      },
      {
        name: "quiet policy failed",
        outcome: { status: "failed", data: {} },
        omitQuietPassedRow: true,
        expected: "  · quiet policy failed | failed | 1ms\n"
      },
      {
        name: "quiet policy not applicable",
        outcome: { status: "not-applicable", reason: { code: "excluded" } },
        omitQuietPassedRow: true,
        expected: "  · quiet policy not applicable | not-applicable | 1ms | excluded\n"
      },
      {
        name: "quiet policy unavailable",
        outcome: { status: "unavailable", reason: { code: "unavailable" } },
        omitQuietPassedRow: true,
        expected: "  · quiet policy unavailable | unavailable | 1ms | unavailable\n"
      }
    ];

    for (const writerOptions of [{ isTTY: false }, { isTTY: true, term: "dumb" }]) {
      for (const testCase of cases) {
        const output = createWriter(writerOptions);
        const renderer = createProgressRenderer(output.writer);
        renderer.render({ kind: "prepared", quietPassOmissionConfiguredCount: 1, totalChecks: 1 });
        renderer.render(
          settled(testCase.name, testCase.name, testCase.outcome, 1, {
            messages: testCase.messages,
            omitQuietPassedRow: testCase.omitQuietPassedRow
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
  it("clears quiet-pass running rows and retains unnumbered outcome blocks atomically", () => {
    const output = createWriter({ isTTY: true });
    const renderer = createProgressRenderer(output.writer);
    const hostileMessage = "notice\nline\rreturn\ttab\u001Bescape\u2028separator\u2029paragraph";

    renderer.render({ kind: "prepared", quietPassOmissionConfiguredCount: 5, totalChecks: 5 });
    renderer.render({
      kind: "started",
      omitQuietPassedRow: true,
      checkId: "hidden",
      displayName: "Hidden"
    });
    renderer.render({
      kind: "started",
      omitQuietPassedRow: true,
      checkId: "message",
      displayName: "Message"
    });
    renderer.render({
      kind: "started",
      omitQuietPassedRow: true,
      checkId: "failed",
      displayName: "Failed"
    });
    renderer.render({
      kind: "started",
      omitQuietPassedRow: true,
      checkId: "not-applicable",
      displayName: "Not applicable"
    });
    renderer.render({
      kind: "started",
      omitQuietPassedRow: true,
      checkId: "unavailable",
      displayName: "Unavailable"
    });
    renderer.render(
      settled("hidden", "Hidden", { status: "passed", data: {} }, 1, { omitQuietPassedRow: true })
    );
    renderer.render(
      settled("message", "Message", { status: "passed", data: {} }, 1, {
        omitQuietPassedRow: true,
        messages: [{ level: "warning", code: "private-code", message: hostileMessage }]
      })
    );
    renderer.render(
      settled("failed", "Failed", { status: "failed", data: {} }, 1, { omitQuietPassedRow: true })
    );
    renderer.render(
      settled(
        "not-applicable",
        "Not applicable",
        { status: "not-applicable", reason: { code: "excluded" } },
        1,
        { omitQuietPassedRow: true }
      )
    );
    renderer.render(
      settled(
        "unavailable",
        "Unavailable",
        { status: "unavailable", reason: { code: "unavailable" } },
        1,
        { omitQuietPassedRow: true }
      )
    );
    renderer.render({
      kind: "final",
      counts: { failed: 1, notApplicable: 1, passed: 2, unavailable: 1 },
      elapsedMs: 5,
      execution: "completed"
    });

    const settledBlock =
      "  · Message | passed | 1ms\n    [warning] notice\\nline\\rreturn\\ttab\\u001Bescape\\u2028separator\\u2029paragraph\n";
    const settledBlockIndex = output.writes.indexOf(settledBlock);
    assert.ok(settledBlockIndex > 1);
    assert.deepEqual(
      output.writes.slice(settledBlockIndex - 4, settledBlockIndex),
      Array(4).fill("\u001B[1A\u001B[2K")
    );
    assert.equal(output.writes[settledBlockIndex + 1], "  · Failed | running\n");
    assert.equal(output.writes.includes("  [1/5] Hidden | passed | 1ms\n"), false);
    assert.equal(output.writes.includes("  · Failed | failed | 1ms\n"), true);
    assert.equal(
      output.writes.includes("  · Not applicable | not-applicable | 1ms | excluded\n"),
      true
    );
    assert.equal(
      output.writes.includes("  · Unavailable | unavailable | 1ms | unavailable\n"),
      true
    );
    assert.equal(output.writes.at(-1)?.includes("  total checks: 5\n  passed: 2\n"), true);
    assert.equal(settledBlock.includes("private-code"), false);
    assert.equal(settledBlock.split("\n").length, 3);
  });
  it("reports configured policy separately from actual omissions and groups flag mismatches first", () => {
    const output = createWriter();
    const renderer = createProgressRenderer(output.writer);

    renderer.render({ kind: "prepared", quietPassOmissionConfiguredCount: 2, totalChecks: 3 });
    renderer.render(
      settled("quiet", "Quiet", { status: "passed", data: { retained: "final only" } }, 1, {
        omitQuietPassedRow: true
      })
    );
    renderer.render(
      settled(
        "flagged",
        "Flagged",
        { status: "not-applicable", reason: { code: FLAG_CONDITION_NOT_MATCHED_CODE } },
        null,
        { omitQuietPassedRow: true }
      )
    );
    renderer.render({ kind: "flag-control-completed" });
    renderer.render(settled("ordinary", "Ordinary", { status: "passed", data: {} }, 1));
    renderer.render({
      kind: "final",
      counts: { failed: 0, notApplicable: 1, passed: 2, unavailable: 0 },
      elapsedMs: 3,
      execution: "completed"
    });

    assert.deepEqual(output.writes, [
      "Vibe Check\ntotal 3 checks · 2 configured for quiet-pass omission\n\nChecks:\n",
      "  The following check did not run because the run flags did not match its condition:\n    - Flagged\n",
      "  [3/3] Ordinary | passed | 1ms\n",
      "\nExecution summary:\n  execution: completed\n  total checks: 3\n  passed: 2\n  failed: 0\n  not applicable: 1\n  unavailable: 0\n  quiet-pass rows omitted: 1\n  elapsed: 3ms\n"
    ]);
  });
});
