import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { run } from "../../project-run/run.ts";
import { maintenanceReminders, type MaintenanceReminder } from "./maintenance-reminders.ts";
import { definition, onlyOutcome } from "./maintenance-reminders.test-support.ts";
import { MaintenanceReminderMeasurementSession } from "./measurement.ts";

const BASE = "a".repeat(40);
const MIDDLE = "b".repeat(40);
const HEAD = "c".repeat(40);

type GitResponse = Readonly<{ readonly stdout?: string; readonly failed?: boolean }>;
type GitPlan = Readonly<Record<string, readonly GitResponse[]>>;
type GitCall = Readonly<{ readonly command: string; readonly args: readonly string[] }>;

function scriptedGit(plan: GitPlan = {}): string {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-maintenance-reuse-"));
  writeFileSync(
    join(root, "responses.json"),
    JSON.stringify({
      [`rev-parse:HEAD^{commit}`]: [{ stdout: `${HEAD}\n` }],
      [`rev-parse:${HEAD}^{commit}`]: [{ stdout: `${HEAD}\n` }],
      [`rev-parse:${MIDDLE}^{commit}`]: [{ stdout: `${MIDDLE}\n` }],
      [`rev-parse:${BASE}^{commit}`]: [{ stdout: `${BASE}\n` }],
      "rev-list:HEAD": [{ stdout: `${HEAD}\n${MIDDLE}\n${BASE}\n` }],
      [`diff-tree:${HEAD}`]: [{ stdout: "2\t0\ttracked.txt\n" }],
      [`diff-tree:${MIDDLE}`]: [{ stdout: "1\t2\ttracked.txt\n" }],
      ...plan
    })
  );
  writeFileSync(join(root, "calls.json"), "[]");
  const program = `
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
const command = basename(process.argv[1]);
const args = process.argv.slice(2);
const calls = JSON.parse(readFileSync("calls.json", "utf8"));
const key = command + ":" + args.at(-1);
const prior = calls.filter(call => call.command + ":" + call.args.at(-1) === key).length;
calls.push({ command, args });
writeFileSync("calls.json", JSON.stringify(calls));
const responses = JSON.parse(readFileSync("responses.json", "utf8"))[key];
if (!responses) throw new Error("Unexpected Git command: " + key);
const response = responses[Math.min(prior, responses.length - 1)];
if (response.failed) process.exitCode = 1;
else process.stdout.write(response.stdout ?? "");
`;
  for (const command of ["rev-parse", "rev-list", "diff-tree"]) {
    writeFileSync(join(root, command), program);
  }
  return root;
}

function calls(root: string): readonly GitCall[] {
  const parsed: unknown = JSON.parse(readFileSync(join(root, "calls.json"), "utf8"));
  assert.ok(Array.isArray(parsed));
  return parsed.map((candidate: unknown): GitCall => {
    assert.ok(typeof candidate === "object" && candidate !== null);
    assert.ok("command" in candidate && typeof candidate.command === "string");
    assert.ok("args" in candidate && Array.isArray(candidate.args));
    const args = candidate.args.map((argument: unknown): string => {
      assert.ok(typeof argument === "string");
      return argument;
    });
    return { command: candidate.command, args };
  });
}

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
      const root = scriptedGit(variant.plan);
      try {
        const entries = [
          reminder("deep-failure", BASE, "enforcing"),
          reminder("shallow-success", MIDDLE),
          reminder("deep-recovery", BASE),
          reminder("deep-repeat", BASE)
        ];
        const completed = await evaluate(root, entries);
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
        assert.deepEqual(completed.outcome, expected);
        assert.deepEqual(completed.result.checkMessages, [
          {
            checkId: "maintenance-reminders",
            code: "maintenance-reminder-unavailable",
            level: "error",
            message: `deep-failure: Review deep-failure (${variant.reason})`
          }
        ]);
        assert.deepEqual(maintenanceReminders(entries).parseData(expected.data), expected.data);
        assert.equal(
          calls(root).filter(
            (call) =>
              call.command === variant.retryCommand && call.args.at(-1) === variant.retryTarget
          ).length,
          2
        );
        assert.equal(
          calls(root).filter((call) => call.command === "diff-tree" && call.args.at(-1) === BASE)
            .length,
          0
        );
      } finally {
        rmSync(root, { force: true, recursive: true });
      }
    }
  });
});
