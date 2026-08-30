import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { Check } from "../../check/check.ts";
import { run } from "../../project-run/run.ts";
import { maintenanceReminders } from "./maintenance-reminders.ts";
import {
  FULL_BASE,
  commit,
  definition,
  onlyOutcome,
  repository
} from "./maintenance-reminders.test-support.ts";

function historyFailureGitExecutable(root: string, revListProgram: string): string {
  writeFileSync(join(root, "rev-parse"), `process.stdout.write("${FULL_BASE}\\n");\n`, "utf8");
  writeFileSync(join(root, "rev-list"), revListProgram, "utf8");
  return process.execPath;
}

describe("maintenance reminders", () => {
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
});
