import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, it } from "node:test";

import type { RunDiagnosticLoggingChannelStatus } from "../outputs/status.ts";
import { run } from "../run.ts";
import { validateRunControls } from "../controls/validation.ts";
import { check, deferred, definition } from "./invocation.test-support.ts";

describe("Package Run diagnostic file naming", () => {
  it("rejects unsupported naming before author work while preserving optional controls", async () => {
    let authorCalls = 0;
    const source = definition([
      check({
        execution: () => {
          authorCalls += 1;
          return { status: "passed", data: {} };
        }
      })
    ]);
    for (const naming of [null, false, 0, "", "fixed", {}, () => "channel"]) {
      const result = await run(source, { diagnosticLogFileNaming: naming });
      assert.equal(result.kind, "configuration");
      if (result.kind !== "configuration") continue;
      assert.deepEqual(result.diagnostic, {
        kind: "invalid-run-controls",
        path: "controls.diagnosticLogFileNaming",
        reason: "invalid-value"
      });
    }
    assert.equal(authorCalls, 0);
    for (const naming of [undefined, "unique", "channel"] as const) {
      const controls = validateRunControls({ diagnosticLogFileNaming: naming });
      assert.equal(controls.ok, true);
      if (!controls.ok) continue;
      assert.equal(controls.value.diagnosticLogFileNaming, naming);
      assert.equal(Object.isFrozen(controls.value), true);
      assert.equal(Object.hasOwn(controls.value, "diagnosticLogFileNaming"), naming !== undefined);
    }
  });

  it("keeps unique defaults and selects fixed channel names without changing identity or disabled output", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-naming-"));
    try {
      const source = definition([check()]);
      const fingerprints = new Set<string>();
      const uniqueFiles = new Set<string>();
      for (const naming of [undefined, "unique", "channel"] as const) {
        const directory = naming === "channel" ? "isolated" : "shared";
        const result = await run(source, {
          diagnosticLogFileNaming: naming,
          outputs: { diagnosticLogging: { directory, enabled: true } },
          projectRoot: root
        });
        assert.equal(result.kind, "completed");
        if (result.kind !== "completed") continue;
        fingerprints.add(result.declarativeFingerprint);
        for (const channel of ["core", "scheduler"] as const) {
          const output: RunDiagnosticLoggingChannelStatus =
            result.outputs.diagnosticLogging.channels[channel];
          assert.equal(output.status, "succeeded");
          const file = output.file;
          assert.ok(file !== null && file.length > 0);
          const fileName = basename(file);
          if (naming === "channel") {
            assert.equal(fileName, `${channel}.log`);
          } else {
            assert.match(
              fileName,
              new RegExp(`^${channel}-\\d{8}T\\d{6}\\.\\d{3}Z-[0-9a-f-]{36}\\.log$`)
            );
            uniqueFiles.add(file);
          }
          assert.match(readFileSync(join(root, file), "utf8"), /invocationId="invocation\/v1:/);
        }
      }
      assert.equal(fingerprints.size, 1);
      assert.equal(uniqueFiles.size, 4);
      assert.deepEqual(readdirSync(join(root, "isolated")).sort(), ["core.log", "scheduler.log"]);
      const disabled = await run(source, {
        diagnosticLogFileNaming: "channel",
        outputs: { diagnosticLogging: { directory: "disabled", enabled: false } },
        projectRoot: root
      });
      assert.equal(disabled.kind, "completed");
      if (disabled.kind !== "completed") return;
      assert.equal(disabled.outputs.diagnosticLogging.status, "disabled");
      assert.equal(disabled.outputs.diagnosticLogging.channels.core.file, null);
      assert.equal(disabled.outputs.diagnosticLogging.channels.scheduler.file, null);
      assert.equal(existsSync(join(root, "disabled")), false);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("refuses concurrent and repeated channel targets without overwriting existing logs or facts", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-collision-"));
    const entered = deferred<void>();
    const release = deferred<void>();
    const controls = {
      diagnosticLogFileNaming: "channel" as const,
      outputs: { diagnosticLogging: { directory: "diagnostic", enabled: true } },
      projectRoot: root
    };
    const first = run(
      definition([
        check({
          execution: async () => {
            entered.resolve();
            await release.promise;
            return { status: "passed", data: { owner: "first" } };
          }
        })
      ]),
      controls
    );
    try {
      await Promise.race([
        entered.promise,
        first.then(() => {
          throw new Error("the first Run settled before reaching the concurrency barrier");
        })
      ]);
      const files = [join(root, "diagnostic/core.log"), join(root, "diagnostic/scheduler.log")];
      const activeBytes = files.map((file) => readFileSync(file, "utf8"));
      const second = await run(definition([check()]), controls);
      assert.equal(second.kind, "output");
      if (second.kind !== "output") return;
      assert.deepEqual(second.diagnostic, { code: "diagnostic-logging-failed" });
      assert.equal(second.outputs.diagnosticLogging.channels.core.status, "failed");
      assert.equal(second.outputs.diagnosticLogging.channels.scheduler.status, "failed");
      assert.deepEqual(second.snapshot.checks[0]?.outcome, { status: "passed", data: {} });
      assert.deepEqual(
        files.map((file) => readFileSync(file, "utf8")),
        activeBytes
      );
      release.resolve();
      const completed = await first;
      assert.equal(completed.kind, "completed");
      const completedBytes = files.map((file) => readFileSync(file, "utf8"));
      const repeated = await run(definition([check()]), controls);
      assert.equal(repeated.kind, "output");
      assert.deepEqual(
        files.map((file) => readFileSync(file, "utf8")),
        completedBytes
      );
    } finally {
      release.resolve();
      await first;
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("reports a single channel collision with its real target while the other channel succeeds", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-partial-"));
    try {
      const directory = join(root, "diagnostic");
      mkdirSync(directory);
      writeFileSync(join(directory, "core.log"), "caller-owned bytes");
      const result = await run(definition([check()]), {
        diagnosticLogFileNaming: "channel",
        outputs: { diagnosticLogging: { directory, enabled: true } },
        projectRoot: root
      });
      assert.equal(result.kind, "output");
      if (result.kind !== "output") return;
      assert.deepEqual(result.outputs.diagnosticLogging, {
        enabled: true,
        status: "failed",
        channels: {
          core: { enabled: true, status: "failed", file: join("diagnostic", "core.log") },
          scheduler: {
            enabled: true,
            status: "succeeded",
            file: join("diagnostic", "scheduler.log")
          }
        }
      });
      assert.equal(readFileSync(join(directory, "core.log"), "utf8"), "caller-owned bytes");
      assert.equal(existsSync(join(directory, "scheduler.log")), true);
      assert.deepEqual(result.snapshot.checks[0]?.outcome, { status: "passed", data: {} });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
