import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { validateMachinePublicationSetV4 } from "../../machine-output/v4/validation.ts";
import { run } from "../../project-run/run.ts";
import { maintenanceReminders } from "./maintenance-reminders.ts";
import {
  commit,
  definition,
  onlyOutcome,
  repository
} from "./maintenance-reminders.test-support.ts";

describe("maintenance reminders", () => {
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
            machinePublication: { directory: "machine", enabled: true },
            progressRendering: { enabled: false }
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
