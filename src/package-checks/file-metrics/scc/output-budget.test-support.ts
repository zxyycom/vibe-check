import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import type { RunProcessSyncOptions } from "../../host-environment/process/contract.ts";
import { mockModuleInIsolatedChild } from "../../isolated-child.test-support.ts";

// Module replacement is confined to this child; the parent retains the real process transport.
const stream = process.argv[2];
if (process.argv.length !== 3 || (stream !== "stdout" && stream !== "stderr")) {
  throw new Error("usage: output-budget.test-support.ts <stdout|stderr>");
}
const paths = ["a", "b", "c"].map((part) => `batch-${part}-${"x".repeat(13_700)}.ts`);
const header = "Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC";
const csv = (path: string) => `${header}\nTypeScript,,${path},1,1,0,0,0,1,0\n`;
const batchBytes = Buffer.byteLength(csv(paths[0] ?? ""), "utf8");
const outputBudgetBytes = batchBytes * (stream === "stdout" ? 2 : 3);
const calls: RunProcessSyncOptions[] = [];
await mockModuleInIsolatedChild(
  fileURLToPath(new URL("../../host-environment/process.ts", import.meta.url)),
  () => ({
    DEFAULT_PROCESS_MAX_BUFFER_BYTES: outputBudgetBytes,
    runProcessSync(options: RunProcessSyncOptions) {
      const index = calls.length;
      calls.push(options);
      assert.ok(index < 2, "the exhausted logical scan must not start its third batch");
      assert.deepEqual(options.args, ["--no-config", "--by-file", "--format", "csv", paths[index]]);
      assert.equal(options.maxBuffer, index === 0 ? outputBudgetBytes : batchBytes);
      const stdout = csv(paths[index] ?? "");
      return {
        isComplete: true,
        signal: null,
        status: 0,
        stderr: stream === "stderr" ? "x".repeat(batchBytes * (index === 0 ? 2 : 1)) : "",
        stdout
      };
    }
  })
);

const { scanWithScc } = await import("./scanner.ts");
const result = scanWithScc({
  cwd: process.cwd(),
  includePaths: paths,
  scanner: { executable: "/private/fake-scc" }
});
assert.deepEqual(result, {
  ok: false,
  error: "scc logical scan exhausted its cumulative output budget before the next batch",
  reason: "execution"
});
assert.equal(calls.length, 2);
console.log(JSON.stringify({ completedBatches: calls.length, stream }));
