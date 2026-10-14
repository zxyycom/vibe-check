import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import { run } from "../../project-run/run.ts";
import {
  maintenanceReminders,
  type MaintenanceReminder,
  type ReminderEvaluation
} from "./maintenance-reminders.ts";
import { definition, onlyOutcome } from "./maintenance-reminders.test-support.ts";
import { MaintenanceReminderMeasurementSession } from "./measurement.ts";
import { completedResult } from "./assessment-results.ts";
import {
  BASE,
  MIDDLE,
  HEAD,
  scriptedGit,
  calls,
  scriptedGitTransport,
  type GitPlan
} from "./measurement-reuse.test-support.ts";

function reminder(id: string, baseCommit: string, mode: "advisory" | "enforcing" = "advisory") {
  return {
    id,
    baseCommit,
    limits: { commits: Number.MAX_SAFE_INTEGER },
    message: `Review ${id}`,
    mode
  } satisfies MaintenanceReminder;
}

function measured(
  entry: MaintenanceReminder,
  counts: { readonly commitCount: number; readonly changedLines: number }
) {
  return {
    assessment: "clear",
    baseCommit: entry.baseCommit,
    changedLines: counts.changedLines,
    commitCount: counts.commitCount,
    exceeded: [],
    headCommit: HEAD,
    id: entry.id,
    mode: entry.mode
  };
}

async function evaluate(root: string, entries: readonly MaintenanceReminder[]) {
  const check = maintenanceReminders(entries);
  const composed = {
    ...check,
    options: { ...check.options, git: { executable: process.execPath } }
  };
  return onlyOutcome(await run(definition(composed), { projectRoot: root }));
}

describe("maintenance reminders", () => {
  it("reuses successful overlapping measurements only within one execution and observes cancellation on reuse", async () => {
    const root = scriptedGit({
      // A repeated history commit retains its first position as the baseline.
      "rev-list:HEAD": [{ stdout: `${HEAD}\n${MIDDLE}\n${BASE}\n${MIDDLE}\n` }]
    });
    try {
      const scenarios = [
        { entry: reminder("middle-first", MIDDLE), commitCount: 1, changedLines: 2 },
        { entry: reminder("base-first", BASE), commitCount: 2, changedLines: 5 },
        { entry: reminder("head-base", HEAD), commitCount: 0, changedLines: 0 },
        { entry: reminder("base-repeat", BASE.toUpperCase()), commitCount: 2, changedLines: 5 },
        { entry: reminder("middle-repeat", MIDDLE), commitCount: 1, changedLines: 2 }
      ];
      const entries = scenarios.map((scenario) => scenario.entry);
      const check = maintenanceReminders(entries);
      const composed = {
        ...check,
        options: { ...check.options, git: { executable: process.execPath } }
      };
      const config = definition(composed);
      const expected = {
        status: "passed",
        data: {
          entries: scenarios.map(({ entry, ...counts }) => measured(entry, counts))
        }
      };
      for (let execution = 0; execution < 2; execution += 1) {
        const completed = onlyOutcome(await run(config, { projectRoot: root }));
        assert.deepEqual(completed.outcome, expected);
        assert.deepEqual(completed.result.checkMessages, []);
        assert.deepEqual(completed.result.snapshot.records, []);
        assert.ok("data" in completed.outcome);
        assert.deepEqual(check.parseData(completed.outcome.data), expected.data);
      }
      const expectedCalls = [
        { command: "rev-parse", args: ["--verify", "HEAD^{commit}"] },
        { command: "rev-list", args: ["--first-parent", "HEAD"] },
        { command: "rev-parse", args: ["--verify", `${MIDDLE}^{commit}`] },
        { command: "diff-tree", args: ["--no-commit-id", "--numstat", "-r", `${HEAD}^`, HEAD] },
        { command: "rev-parse", args: ["--verify", `${BASE}^{commit}`] },
        { command: "diff-tree", args: ["--no-commit-id", "--numstat", "-r", `${MIDDLE}^`, MIDDLE] },
        { command: "rev-parse", args: ["--verify", `${HEAD}^{commit}`] }
      ];
      assert.deepEqual(calls(root), [...expectedCalls, ...expectedCalls]);

      const controller = new AbortController();
      const session = new MaintenanceReminderMeasurementSession({
        executable: process.execPath,
        history: { commits: [HEAD, MIDDLE, BASE], headCommit: HEAD },
        projectRoot: root,
        signal: controller.signal
      });
      const entry = reminder("cancelled-reuse", BASE);
      assert.equal((await session.measure(entry)).kind, "succeeded");
      const beforeCancellation = calls(root);
      controller.abort();
      assert.deepEqual(await session.measure(entry), { kind: "cancelled" });
      assert.deepEqual(calls(root), beforeCancellation);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("retries failed measurement steps while retaining usable shorter prefixes and ordered assessments", async () => {
    const variants: readonly Readonly<{
      readonly plan: GitPlan;
      readonly reason: string;
      readonly retryCommand: string;
      readonly retryTarget: string;
      readonly shallowLines?: number;
      readonly deepLines?: number;
    }>[] = [
      {
        plan: { [`rev-parse:${BASE}^{commit}`]: [{ failed: true }, { stdout: `${BASE}\n` }] },
        reason: "base-commit-unavailable",
        retryCommand: "rev-parse",
        retryTarget: `${BASE}^{commit}`
      },
      {
        plan: {
          [`rev-parse:${BASE}^{commit}`]: [{ stdout: "invalid\n" }, { stdout: `${BASE}\n` }]
        },
        reason: "base-commit-unavailable",
        retryCommand: "rev-parse",
        retryTarget: `${BASE}^{commit}`
      },
      {
        plan: {
          [`rev-parse:${BASE}^{commit}`]: [
            { stdout: `${"d".repeat(40)}\n` },
            { stdout: `${BASE}\n` }
          ]
        },
        reason: "base-not-first-parent-ancestor",
        retryCommand: "rev-parse",
        retryTarget: `${BASE}^{commit}`
      },
      {
        plan: { [`diff-tree:${HEAD}`]: [{ failed: true }, { stdout: "2\t0\ttracked.txt\n" }] },
        reason: "numstat-unavailable",
        retryCommand: "diff-tree",
        retryTarget: HEAD
      },
      {
        plan: { [`diff-tree:${MIDDLE}`]: [{ failed: true }, { stdout: "1\t2\ttracked.txt\n" }] },
        reason: "numstat-unavailable",
        retryCommand: "diff-tree",
        retryTarget: MIDDLE
      },
      {
        plan: {
          [`diff-tree:${MIDDLE}`]: [
            { stdout: "invalid\t0\ttracked.txt\n" },
            { stdout: "1\t2\ttracked.txt\n" }
          ]
        },
        reason: "numstat-invalid",
        retryCommand: "diff-tree",
        retryTarget: MIDDLE
      },
      {
        plan: {
          [`diff-tree:${HEAD}`]: [{ stdout: `${Number.MAX_SAFE_INTEGER}\t0\ttracked.txt\n` }],
          [`diff-tree:${MIDDLE}`]: [
            { stdout: "1\t0\ttracked.txt\n" },
            { stdout: "-\t-\tasset.bin\n" }
          ]
        },
        reason: "numstat-invalid",
        retryCommand: "diff-tree",
        retryTarget: MIDDLE,
        shallowLines: Number.MAX_SAFE_INTEGER,
        deepLines: Number.MAX_SAFE_INTEGER
      }
    ];
    for (const variant of variants) {
      const entries = [
        reminder("deep-failure", BASE, "enforcing"),
        reminder("shallow-success", MIDDLE),
        reminder("deep-recovery", BASE),
        reminder("deep-repeat", BASE)
      ];

      const [failure, shallow, recovery, repeat] = entries;
      assert.ok(
        failure !== undefined &&
          shallow !== undefined &&
          recovery !== undefined &&
          repeat !== undefined
      );
      const expected = {
        status: "failed",
        data: {
          entries: [
            {
              assessment: "unavailable",
              baseCommit: BASE,
              changedLines: null,
              commitCount: null,
              exceeded: [],
              headCommit: HEAD,
              id: failure.id,
              mode: failure.mode,
              reason: variant.reason
            },
            measured(shallow, { commitCount: 1, changedLines: variant.shallowLines ?? 2 }),
            measured(recovery, { commitCount: 2, changedLines: variant.deepLines ?? 5 }),
            measured(repeat, { commitCount: 2, changedLines: variant.deepLines ?? 5 })
          ]
        }
      };
      const expectedMessages = [
        {
          code: "maintenance-reminder-unavailable",
          level: "error" as const,
          message: `deep-failure: Review deep-failure (${variant.reason})`
        }
      ];
      const transport = scriptedGitTransport(variant.plan);
      const session = new MaintenanceReminderMeasurementSession({
        executeGitCommand: transport.execute,
        executable: "git",
        history: { commits: [HEAD, MIDDLE, BASE], headCommit: HEAD },
        projectRoot: process.cwd(),
        signal: new AbortController().signal
      });
      const evaluations: ReminderEvaluation[] = [];
      for (const entry of entries) {
        const measurement = await session.measure(entry);
        assert.equal(measurement.kind, "succeeded");
        if (measurement.kind !== "succeeded") throw new Error("measurement cancelled");
        evaluations.push(measurement.value);
      }
      const assessmentResult = completedResult(evaluations);
      assert.deepEqual(assessmentResult, { ...expected, messages: expectedMessages });
      // One failed-command/recovery case still exercises the real default transport and full Run.
      if (variant === variants[0]) {
        const root = scriptedGit(variant.plan);
        try {
          const completed = await evaluate(root, entries);
          assert.deepEqual(completed.outcome, expected);
          assert.deepEqual(
            completed.result.checkMessages,
            expectedMessages.map((message) => ({ checkId: "maintenance-reminders", ...message }))
          );
          assert.equal(
            calls(root).filter(
              (call) => call.command === "rev-parse" && call.args.at(-1) === `${BASE}^{commit}`
            ).length,
            2
          );
          assert.deepEqual(completed.result.snapshot.records, []);
        } finally {
          rmSync(root, { force: true, recursive: true });
        }
      }
      assert.ok("data" in assessmentResult);
      assert.deepEqual(
        maintenanceReminders(entries).parseData(assessmentResult.data),
        expected.data
      );
      assert.equal(
        transport.calls.filter(
          (call) =>
            call.command === variant.retryCommand && call.args.at(-1) === variant.retryTarget
        ).length,
        2
      );
      assert.equal(
        transport.calls.filter((call) => call.command === "diff-tree" && call.args.at(-1) === BASE)
          .length,
        0
      );
    }
  });
});
