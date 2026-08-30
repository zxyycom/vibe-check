import assert from "node:assert/strict";
import { renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { run } from "../../project-run/run.ts";
import { maintenanceReminders } from "./maintenance-reminders.ts";
import {
  commit,
  definition,
  git,
  onlyOutcome,
  repository
} from "./maintenance-reminders.test-support.ts";

describe("maintenance reminders", () => {
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
});
