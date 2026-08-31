import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { CheckExecutionContext } from "../../check/check.ts";
import { executeValidatedRun } from "../../project-run/invocation.ts";
import { maintenanceReminders, type MaintenanceReminderOptions } from "./maintenance-reminders.ts";
import {
  FULL_BASE,
  capturedProgressWriter,
  commit,
  definition,
  repository
} from "./maintenance-reminders.test-support.ts";

describe("maintenance reminders", () => {
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
            machinePublication: { enabled: false },
            progressRendering: { enabled: true }
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
          get: () => ({ ok: false, error: { code: "dependency-not-declared", checkId: "" } }),
          list: () => Object.freeze([])
        },
        options: check.options,
        project: {
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
        {
          status: "unavailable",
          reason: { code: "invalid-options" },
          messages: [
            {
              code: "invalid-options",
              level: "error",
              message:
                "maintenanceReminders options are invalid; recreate the Check with maintenanceReminders(entries) or restore its complete resolved options."
            }
          ]
        }
      );
      assert.deepEqual(await check.execution(context), {
        status: "unavailable",
        reason: { code: "execution-cancelled" },
        messages: [
          {
            code: "execution-cancelled",
            level: "error",
            message:
              "Maintenance reminder evaluation was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate."
          }
        ]
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
