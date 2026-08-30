import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { run } from "../../project-run/run.ts";
import { maintenanceReminders } from "./maintenance-reminders.ts";
import {
  commit,
  definition,
  onlyOutcome,
  repository
} from "./maintenance-reminders.test-support.ts";

describe("maintenance reminders", () => {
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
});
