import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineCheck } from "../../check/check.ts";
import { executeValidatedRun } from "../invocation/run.ts";
import { check, definition } from "./invocation.test-support.ts";

describe("Package Run diagnostic logging output", () => {
  it("does not duplicate accepted final data into the core diagnostic channel", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-final-data-"));
    try {
      const files = Array.from({ length: 700 }, (_, index) => `package/file-${index}.ts`);
      const result = await executeValidatedRun(
        definition([check({ execution: () => ({ status: "passed", data: { files } }) })]),
        {
          outputs: { diagnosticLogging: { directory: "diagnostic", enabled: true } },
          projectRoot: root
        },
        []
      );

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      const file = result.outputs.diagnosticLogging.channels.core.file;
      assert.ok(file !== null && file.length > 0);
      const diagnosticLog = readFileSync(join(root, file), "utf8");
      assert.match(diagnosticLog, /\[FINISHED] \[PASSED] .*check\.finished/);
      assert.match(diagnosticLog, /messageCount=0/);
      assert.match(diagnosticLog, /status="passed"/);
      assert.doesNotMatch(diagnosticLog, /data\.availability=/);
      assert.doesNotMatch(diagnosticLog, /package\/file-699\.ts/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps accepted handoff references out of machine and diagnostic publication", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-handoff-"));
    const fileBytes = new Map<string, Uint8Array>([
      ["handoff-private-byte", new Uint8Array([1, 2, 3])]
    ]);
    const provider = defineCheck({
      checkId: "handoff-provider",
      displayName: "Handoff provider",
      handoff: true,
      execution: () => ({ status: "passed", data: { version: 1 }, handoff: fileBytes })
    });
    let consumerReadSameReference = false;
    const consumer = defineCheck({
      checkId: "handoff-consumer",
      displayName: "Handoff consumer",
      dependsOn: [provider.checkId],
      execution: ({ dependencies }) => {
        const read = dependencies.get(provider);
        if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };
        consumerReadSameReference = read.handoff === fileBytes;
        return {
          status: "passed",
          data: { byteCount: read.handoff.get("handoff-private-byte")?.byteLength ?? 0 }
        };
      }
    });
    try {
      const result = await executeValidatedRun(
        definition([provider, consumer]),
        {
          outputs: {
            diagnosticLogging: { directory: "diagnostic", enabled: true },
            machinePublication: { directory: "machine", enabled: true }
          },
          projectRoot: root
        },
        []
      );

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(consumerReadSameReference, true);
      const providerOutcome = result.snapshot.checks.find(
        (settledCheck) => settledCheck.checkId === provider.checkId
      )?.outcome;
      assert.equal(Object.hasOwn(providerOutcome ?? {}, "handoff"), false);

      const diagnosticFile = result.outputs.diagnosticLogging.channels.core.file;
      assert.ok(diagnosticFile !== null && diagnosticFile.length > 0);
      const diagnosticLog = readFileSync(join(root, diagnosticFile), "utf8");
      assert.doesNotMatch(diagnosticLog, /handoff-private-byte/);

      const machineRun = readFileSync(join(root, "machine", "run.json"), "utf8");
      assert.doesNotMatch(machineRun, /handoff-private-byte/);
      assert.doesNotMatch(machineRun, /"handoff"/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
