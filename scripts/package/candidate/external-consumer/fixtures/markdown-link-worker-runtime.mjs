import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncBuiltinESMExports } from "node:module";
import workerThreads from "node:worker_threads";

// Observe the real installed Worker without adding a Product test hook or replacing its I/O.
const NativeWorker = workerThreads.Worker;
const workers = [];
let abortAfterFirstReply;
workerThreads.Worker = class ObservedWorker extends NativeWorker {
  constructor(url, options) {
    super(url, options);
    assert.ok(url instanceof URL);
    assert.match(url.pathname, /\/markdown-link-validation\/io-worker\.mjs$/u);
    const observation = { url: url.href, replies: 0, exitCode: null };
    workers.push(observation);
    this.on("message", () => {
      observation.replies += 1;
      abortAfterFirstReply?.();
    });
    this.on("exit", (code) => { observation.exitCode = code; });
  }
};
syncBuiltinESMExports();
const { defineConfig, markdownLinkValidation, run } = await import("@zxyycom/vibe-check");
const projectRoot = await mkdtemp(join(tmpdir(), "vibe-check-installed-mdlink-worker-"));
try {
  await writeFile(join(projectRoot, "source.md"), "[target](target.md#target)\n");
  await writeFile(join(projectRoot, "target.md"), "# Target\n");
  const definition = defineConfig({
    checks: [markdownLinkValidation({
      files: { patterns: ["source.md"] },
      cache: { enabled: false }
    })],
    outputs: {
      diagnosticLogging: { enabled: false },
      progressRendering: { enabled: false }
    }
  });
  const successful = await run(definition, { projectRoot });
  assert.equal(successful.kind, "completed");
  assert.equal(successful.snapshot.checks[0].outcome.status, "passed");
  assert.equal(successful.snapshot.checks[0].outcome.data.sourceFileCount, 1);
  assert.equal(workers.length, 1);
  assert.ok(workers[0].replies > 0);
  assert.equal(workers[0].exitCode, 0, "successful Run must await the real Worker exit");

  const controller = new AbortController();
  abortAfterFirstReply = () => controller.abort("installed Worker cancellation proof");
  const cancelled = await run(definition, { projectRoot, signal: controller.signal });
  assert.equal(controller.signal.aborted, true);
  assert.equal(workers.length, 2, "cancelled Run must have started its own real Worker");
  assert.ok(workers[1].replies > 0);
  assert.equal(workers[1].exitCode, 0, "cancelled Run must drain and await Worker exit");
  assert.equal(cancelled.kind, "cancelled");
  assert.equal(cancelled.phase, "execution");
  assert.equal(cancelled.snapshot.checks[0].outcome.reason.code, "execution-cancelled");
  assert.deepEqual(cancelled.snapshot.records, []);
  console.log("__VIBE_CHECK_MARKDOWN_LINK_WORKER__" + JSON.stringify({
    nodeVersion: process.version,
    bunVersion: process.versions.bun ?? null,
    workers,
    successful: true,
    cancelled: true
  }));
} finally {
  workerThreads.Worker = NativeWorker;
  syncBuiltinESMExports();
  await rm(projectRoot, { recursive: true, force: true });
}
