import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  createDeclarativeFingerprint,
  defineConfig,
  normalizeProjectDefinition,
  type Check,
  type CheckExecutionContext
} from "../../definition/project-definition.ts";
import { maintenanceReminders, type MaintenanceReminderOptions } from "./maintenance-reminders.ts";
import { validateMachinePublicationSetV4 } from "../../output/machine-v4/validation.ts";
import type { ProgressWriter } from "../../run/progress.ts";
import { executeValidatedRun } from "../../run/invocation.ts";
import { run } from "../../run/run.ts";

const EFFECTS_DISABLED = Object.freeze({
  cache: Object.freeze({ enabled: false }),
  output: Object.freeze({ enabled: false }),
  progress: Object.freeze({ enabled: false })
});

const FULL_BASE = "a".repeat(40);

function definition(
  check: Check,
  effects: Readonly<{
    readonly cache: Readonly<{ readonly enabled: boolean }>;
    readonly output: Readonly<{ readonly directory?: string; readonly enabled: boolean }>;
    readonly progress: Readonly<{ readonly enabled: boolean }>;
  }> = EFFECTS_DISABLED
) {
  return defineConfig({ checks: [check], effects });
}

function git(root: string, args: readonly string[]): string {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function repository(): string {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-maintenance-reminders-"));
  git(root, ["init"]);
  git(root, ["config", "diff.renames", "false"]);
  git(root, ["config", "user.email", "vibe-check@example.test"]);
  git(root, ["config", "user.name", "Vibe Check"]);
  return root;
}

function commit(root: string, message: string): string {
  git(root, ["add", "--all"]);
  git(root, ["commit", "--no-gpg-sign", "-m", message]);
  return git(root, ["rev-parse", "HEAD"]);
}

function onlyOutcome(result: Awaited<ReturnType<typeof run>>) {
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") throw new Error("Maintenance reminder Run did not complete");
  assert.equal(result.snapshot.checks.length, 1);
  return Object.freeze({ outcome: result.snapshot.checks[0].outcome, result });
}

function capturedProgressWriter(): Readonly<{
  readonly writes: string[];
  readonly writer: ProgressWriter;
}> {
  const writes: string[] = [];
  return {
    writes,
    writer: {
      color: false,
      isTTY: false,
      term: undefined,
      write: (content: string): void => {
        writes.push(content);
      }
    }
  };
}

describe("maintenance reminders", () => {
  it("constructs one fixed Check, validates full composed policy, and fingerprints entries", async () => {
    const first = maintenanceReminders([
      {
        id: "docs-review",
        baseCommit: FULL_BASE,
        limits: { commits: 10 },
        message: "Review documentation"
      }
    ]);
    const second = maintenanceReminders([
      {
        id: "docs-review",
        baseCommit: FULL_BASE,
        limits: { commits: 11 },
        message: "Review documentation"
      }
    ]);
    const sha256Base = maintenanceReminders([
      {
        id: "sha256-history",
        baseCommit: "b".repeat(64),
        limits: { commits: 1 },
        message: "Accept a full SHA-256 object ID"
      }
    ]);

    assert.deepEqual(
      {
        checkId: first.checkId,
        displayName: first.displayName,
        git: first.options.git,
        hasChecks: Object.hasOwn(first, "checks"),
        visibility: first.visibility
      },
      {
        checkId: "maintenance-reminders",
        displayName: "Maintenance reminders",
        git: { executable: "git" },
        hasChecks: false,
        visibility: "attention"
      }
    );
    assert.notEqual(
      createDeclarativeFingerprint(normalizeProjectDefinition(definition(first)).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(definition(second)).declarative)
    );
    assert.doesNotThrow(() => normalizeProjectDefinition(definition(sha256Base)));

    const validEntry = first.options.entries[0];
    const invalidOptions = [
      {
        entries: [
          {
            ...validEntry,
            limits: {}
          }
        ],
        git: first.options.git
      },
      {
        entries: [
          validEntry,
          {
            ...validEntry,
            message: "A duplicate ID"
          }
        ],
        git: first.options.git
      },
      {
        entries: [
          {
            ...validEntry,
            baseCommit: "not-a-full-commit"
          }
        ],
        git: first.options.git
      },
      {
        entries: [
          {
            ...validEntry,
            limits: { commits: 0 }
          }
        ],
        git: first.options.git
      },
      {
        entries: [
          {
            ...validEntry,
            message: ""
          }
        ],
        git: first.options.git
      },
      {
        entries: [
          {
            ...validEntry,
            mode: "blocking"
          }
        ],
        git: first.options.git
      },
      {
        entries: [
          {
            ...validEntry,
            unknown: true
          }
        ],
        git: first.options.git
      },
      {
        entries: [validEntry],
        git: { executable: "" }
      }
    ];
    for (const options of invalidOptions) {
      const invalid = { ...first, options } as Check;
      const invalidResult = await run(definition(invalid));
      assert.equal(invalidResult.kind, "completed");
      if (invalidResult.kind === "completed") {
        assert.deepEqual(invalidResult.snapshot.checks[0]?.outcome, {
          status: "unavailable",
          reason: { code: "invalid-options" }
        });
        assert.deepEqual(invalidResult.checkDurations, [
          { checkId: "maintenance-reminders", durationMs: null }
        ]);
      }
    }
  });

  it("measures committed first-parent activity while ignoring worktree changes and folds due entries", async () => {
    const root = repository();
    try {
      const notes = join(root, "notes.txt");
      writeFileSync(notes, "base\n", "utf8");
      const base = commit(root, "base");
      writeFileSync(notes, "base\nfirst\n", "utf8");
      commit(root, "first");
      writeFileSync(notes, "base\nfirst\nsecond\nthird\n", "utf8");
      const head = commit(root, "second");
      writeFileSync(notes, "base\nfirst\nsecond\nthird\nuncommitted\n", "utf8");

      const result = await run(
        definition(
          maintenanceReminders([
            {
              id: "at-limit",
              baseCommit: base,
              limits: { changedLines: 3, commits: 2 },
              message: "At the configured limit"
            },
            {
              id: "docs-review",
              baseCommit: base,
              limits: { commits: 1 },
              message: "Review documentation"
            },
            {
              id: "optimization-audit",
              baseCommit: base,
              limits: { changedLines: 2 },
              message: "Audit optimization quality",
              mode: "enforcing"
            }
          ])
        ),
        { projectRoot: root }
      );
      const completed = onlyOutcome(result);
      assert.deepEqual(completed.outcome, {
        status: "failed",
        data: {
          entries: [
            {
              assessment: "clear",
              baseCommit: base,
              changedLines: 3,
              commitCount: 2,
              exceeded: [],
              headCommit: head,
              id: "at-limit",
              mode: "advisory"
            },
            {
              assessment: "due",
              baseCommit: base,
              changedLines: 3,
              commitCount: 2,
              exceeded: ["commits"],
              headCommit: head,
              id: "docs-review",
              mode: "advisory"
            },
            {
              assessment: "due",
              baseCommit: base,
              changedLines: 3,
              commitCount: 2,
              exceeded: ["changed-lines"],
              headCommit: head,
              id: "optimization-audit",
              mode: "enforcing"
            }
          ]
        }
      });
      assert.deepEqual(completed.result.snapshot.records, []);
      assert.deepEqual(completed.result.checkMessages, [
        {
          checkId: "maintenance-reminders",
          code: "maintenance-reminder-due",
          level: "warning",
          message: "docs-review: Review documentation"
        },
        {
          checkId: "maintenance-reminders",
          code: "maintenance-reminder-due",
          level: "error",
          message: "optimization-audit: Audit optimization quality"
        }
      ]);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("uses first-parent merge diffs, reverts, binary and rename activity", async () => {
    const root = repository();
    try {
      const tracked = join(root, "tracked.txt");
      writeFileSync(tracked, "base\n", "utf8");
      const base = commit(root, "base");
      writeFileSync(join(root, "asset.bin"), Buffer.from([0, 1, 2, 3]));
      commit(root, "binary");
      const renamed = join(root, "renamed.txt");
      renameSync(tracked, renamed);
      commit(root, "rename");

      const main = git(root, ["branch", "--show-current"]);
      git(root, ["checkout", "-b", "feature"]);
      writeFileSync(join(root, "feature.txt"), "one\ntwo\nthree\nfour\n", "utf8");
      const featureCommit = commit(root, "feature");
      git(root, ["checkout", main]);
      writeFileSync(join(root, "main.txt"), "main\n", "utf8");
      commit(root, "main");
      git(root, ["merge", "--no-ff", "--no-edit", "feature"]);
      const merge = git(root, ["rev-parse", "HEAD"]);
      git(root, ["revert", "--no-edit", "-m", "1", merge]);
      const head = git(root, ["rev-parse", "HEAD"]);

      const result = await run(
        definition(
          maintenanceReminders([
            {
              id: "exact-history",
              baseCommit: base,
              limits: { changedLines: 11, commits: 5 },
              message: "Exact history"
            },
            {
              id: "merged-history",
              baseCommit: base,
              limits: { changedLines: 10, commits: 4 },
              message: "Review merged activity",
              mode: "enforcing"
            },
            {
              id: "feature-base",
              baseCommit: featureCommit,
              limits: { commits: 1 },
              message: "Feature base must stay on the first-parent chain"
            }
          ])
        ),
        { projectRoot: root }
      );
      const completed = onlyOutcome(result);
      assert.deepEqual(completed.outcome, {
        status: "failed",
        data: {
          entries: [
            {
              assessment: "clear",
              baseCommit: base,
              changedLines: 11,
              commitCount: 5,
              exceeded: [],
              headCommit: head,
              id: "exact-history",
              mode: "advisory"
            },
            {
              assessment: "due",
              baseCommit: base,
              changedLines: 11,
              commitCount: 5,
              exceeded: ["commits", "changed-lines"],
              headCommit: head,
              id: "merged-history",
              mode: "enforcing"
            },
            {
              assessment: "unavailable",
              baseCommit: featureCommit,
              changedLines: null,
              commitCount: null,
              exceeded: [],
              headCommit: head,
              id: "feature-base",
              mode: "advisory",
              reason: "base-not-first-parent-ancestor"
            }
          ]
        }
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("classifies Git history failures as complete advisory or enforcing assessments", async () => {
    const root = repository();
    try {
      writeFileSync(join(root, "base.txt"), "base\n", "utf8");
      const base = commit(root, "base");
      const advisory = maintenanceReminders([
        {
          id: "advisory-unavailable",
          baseCommit: base,
          limits: { commits: 1 },
          message: "Check advisory history"
        }
      ]);
      const enforcing = maintenanceReminders([
        {
          id: "enforcing-unavailable",
          baseCommit: base,
          limits: { commits: 1 },
          message: "Check enforcing history",
          mode: "enforcing"
        }
      ]);

      const withGitExecutable = (check: typeof advisory, executable: string): Check => ({
        ...check,
        options: {
          ...check.options,
          git: { executable }
        }
      });
      const advisoryResult = onlyOutcome(
        await run(definition(withGitExecutable(advisory, "vibe-check-missing-git")), {
          projectRoot: root
        })
      );
      const enforcingResult = onlyOutcome(
        await run(definition(withGitExecutable(enforcing, "vibe-check-missing-git")), {
          projectRoot: root
        })
      );

      assert.deepEqual(advisoryResult.outcome, {
        status: "passed",
        data: {
          entries: [
            {
              assessment: "unavailable",
              baseCommit: base,
              changedLines: null,
              commitCount: null,
              exceeded: [],
              headCommit: null,
              id: "advisory-unavailable",
              mode: "advisory",
              reason: "head-unavailable"
            }
          ]
        }
      });
      assert.deepEqual(advisoryResult.result.checkMessages, [
        {
          checkId: "maintenance-reminders",
          code: "maintenance-reminder-unavailable",
          level: "warning",
          message: "advisory-unavailable: Check advisory history (head-unavailable)"
        }
      ]);
      assert.equal(enforcingResult.outcome.status, "failed");
      assert.deepEqual(enforcingResult.result.checkMessages, [
        {
          checkId: "maintenance-reminders",
          code: "maintenance-reminder-unavailable",
          level: "error",
          message: "enforcing-unavailable: Check enforcing history (head-unavailable)"
        }
      ]);

      const historyCommandFailure = onlyOutcome(
        await run(
          definition(
            withGitExecutable(
              advisory,
              historyFailureGitExecutable(root, "process.exitCode = 1;\n")
            )
          ),
          { projectRoot: root }
        )
      );
      assert.deepEqual(historyCommandFailure.outcome, {
        status: "passed",
        data: {
          entries: [
            {
              assessment: "unavailable",
              baseCommit: base,
              changedLines: null,
              commitCount: null,
              exceeded: [],
              headCommit: null,
              id: "advisory-unavailable",
              mode: "advisory",
              reason: "first-parent-history-unavailable"
            }
          ]
        }
      });

      const malformedHistory = onlyOutcome(
        await run(
          definition(
            withGitExecutable(
              enforcing,
              historyFailureGitExecutable(root, 'process.stdout.write("not-a-commit\\n");\n')
            )
          ),
          { projectRoot: root }
        )
      );
      assert.deepEqual(malformedHistory.outcome, {
        status: "failed",
        data: {
          entries: [
            {
              assessment: "unavailable",
              baseCommit: base,
              changedLines: null,
              commitCount: null,
              exceeded: [],
              headCommit: null,
              id: "enforcing-unavailable",
              mode: "enforcing",
              reason: "first-parent-history-invalid"
            }
          ]
        }
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("renders due reminders through progress and retains their message readback", async () => {
    const root = repository();
    try {
      writeFileSync(join(root, "base.txt"), "base\n", "utf8");
      const base = commit(root, "base");
      writeFileSync(join(root, "base.txt"), "base\nnext\n", "utf8");
      commit(root, "next");
      writeFileSync(join(root, "base.txt"), "base\nnext\nfinal\n", "utf8");
      commit(root, "final");
      const output = capturedProgressWriter();
      const result = await executeValidatedRun(
        definition(
          maintenanceReminders([
            {
              id: "progress-review",
              baseCommit: base,
              limits: { commits: 1 },
              message: "Review the progress-visible reminder"
            }
          ]),
          {
            cache: { enabled: false },
            output: { enabled: false },
            progress: { enabled: true }
          }
        ),
        { projectRoot: root },
        [],
        { progressWriterFactory: () => output.writer }
      );
      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.deepEqual(result.checkMessages, [
        {
          checkId: "maintenance-reminders",
          code: "maintenance-reminder-due",
          level: "warning",
          message: "progress-review: Review the progress-visible reminder"
        }
      ]);
      assert.match(output.writes.join(""), /Maintenance reminders \| passed/);
      assert.match(
        output.writes.join(""),
        /\[warning] progress-review: Review the progress-visible reminder/
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("keeps cancellation as a whole-Check unavailable boundary", async () => {
    const root = repository();
    try {
      const check = maintenanceReminders([
        {
          id: "cancelled-review",
          baseCommit: FULL_BASE,
          limits: { commits: 1 },
          message: "Review after cancellation"
        }
      ]);
      const controller = new AbortController();
      controller.abort();
      const context: CheckExecutionContext<MaintenanceReminderOptions> = {
        dependencies: {
          get: () => ({ ok: false, error: { code: "dependency-not-declared", checkId: "" } })
        },
        options: check.options,
        project: {
          cache: { directory: "cache", enabled: false, reportActivity: () => undefined },
          changedFiles: [],
          flags: [],
          root
        },
        records: { report: () => undefined },
        signal: controller.signal
      };
      assert.notEqual(check.execution, undefined);
      if (check.execution === undefined)
        throw new Error("maintenance reminders must be executable");
      assert.deepEqual(
        await check.execution({
          ...context,
          options: { ...check.options, git: { executable: "" } },
          signal: new AbortController().signal
        }),
        { status: "unavailable", reason: { code: "invalid-options" } }
      );
      assert.deepEqual(await check.execution(context), {
        status: "unavailable",
        reason: { code: "execution-cancelled" }
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("publishes one generic final-data Check row without Records or messages", async () => {
    const root = repository();
    try {
      writeFileSync(join(root, "base.txt"), "base\n", "utf8");
      const base = commit(root, "base");
      writeFileSync(join(root, "base.txt"), "base\nnext\n", "utf8");
      commit(root, "next");
      writeFileSync(join(root, "base.txt"), "base\nnext\nfinal\n", "utf8");
      const head = commit(root, "final");
      const result = await run(
        definition(
          maintenanceReminders([
            {
              id: "published-review",
              baseCommit: base,
              limits: { commits: 1 },
              message: "Review published maintenance"
            }
          ]),
          {
            cache: { enabled: false },
            output: { directory: "machine", enabled: true },
            progress: { enabled: false }
          }
        ),
        { projectRoot: root }
      );
      const completed = onlyOutcome(result);
      assert.deepEqual(completed.outcome, {
        status: "passed",
        data: {
          entries: [
            {
              assessment: "due",
              baseCommit: base,
              changedLines: 2,
              commitCount: 2,
              exceeded: ["commits"],
              headCommit: head,
              id: "published-review",
              mode: "advisory"
            }
          ]
        }
      });
      assert.deepEqual(completed.result.snapshot.records, []);
      assert.deepEqual(completed.result.checkMessages, [
        {
          checkId: "maintenance-reminders",
          code: "maintenance-reminder-due",
          level: "warning",
          message: "published-review: Review published maintenance"
        }
      ]);

      const runJson = readFileSync(join(root, "machine", "run.json"), "utf8");
      const recordsNdjson = readFileSync(join(root, "machine", "records.ndjson"), "utf8");
      const machine = validateMachinePublicationSetV4({
        recordsNdjson: Buffer.from(recordsNdjson),
        runJson: Buffer.from(runJson)
      });
      assert.equal(machine.ok, true, machine.ok ? "" : machine.diagnostic.message);
      if (!machine.ok) return;
      assert.deepEqual(machine.value.run.checks, [
        {
          checkId: "maintenance-reminders",
          displayName: "Maintenance reminders",
          outcome: completed.outcome
        }
      ]);
      assert.deepEqual(machine.value.records, []);
      assert.doesNotMatch(
        runJson,
        /maintenance-reminder-due|Review published maintenance|messages|visibility/
      );
      assert.equal(recordsNdjson, "");
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

function historyFailureGitExecutable(root: string, revListProgram: string): string {
  writeFileSync(join(root, "rev-parse"), `process.stdout.write("${FULL_BASE}\\n");\n`, "utf8");
  writeFileSync(join(root, "rev-list"), revListProgram, "utf8");
  return process.execPath;
}
