import assert from "node:assert/strict";
import { symlink } from "node:fs/promises";
import path from "node:path";
import { setImmediate } from "node:timers/promises";
import { Worker } from "node:worker_threads";
import { describe, it } from "node:test";

import { LinkIoSession } from "./io-session.ts";
import { IO_OBSERVATION, NATIVE_OPERATIONS } from "./io-worker-observation.test-support.ts";
import { withFixture, writeFixtureFile } from "./local-resolver.test-support.ts";

describe("Markdown Link Worker cancellation", () => {
  it("observes atomic cancellation during a real Worker read and drains its descriptor before exit", async () => {
    await withFixture(async ({ root }) => {
      await writeFixtureFile(root, "source.md", "# Source\n");
      await symlink("source.md", path.join(root, "alias.md"));
      for (const operation of NATIVE_OPERATIONS) {
        const controller = new AbortController();
        const observation = new Int32Array(new SharedArrayBuffer(IO_OBSERVATION.byteLength));
        let worker!: Worker;
        let exitCode: number | undefined;
        const io = new LinkIoSession(root, controller.signal, (_root, cancellation) => {
          worker = new Worker(
            new URL("./io-worker-cancellation.test-support.ts", import.meta.url),
            {
              workerData: { root, cancellation, observation: observation.buffer, operation }
            }
          );
          return {
            postMessage: (request) => {
              worker.postMessage(request);
            },
            subscribe: (listeners) => {
              worker.on("message", listeners.message);
              worker.on("error", listeners.error);
              const exited = (code: number): void => {
                exitCode = code;
                listeners.exit(code);
              };
              worker.on("exit", exited);
              return () => {
                worker.off("message", listeners.message);
                worker.off("error", listeners.error);
                worker.off("exit", exited);
              };
            },
            stopIdle: () => {
              assert.fail("an active read must never be terminated");
            }
          };
        });
        try {
          let settled = false;
          const pending = io.readSourceFile(path.join(root, "alias.md"), 100).then((result) => {
            settled = true;
            return result;
          });
          while (Atomics.load(observation, IO_OBSERVATION.entered) === 0) {
            assert.equal(
              exitCode,
              undefined,
              `Worker must enter the instrumented native ${operation} before exiting`
            );
            await setImmediate();
          }
          controller.abort();
          let finalized = false;
          const finalization = io.finalize().then(() => {
            finalized = true;
          });
          await setImmediate();
          assert.equal(finalized, false, "drain must wait for the entered native operation");
          assert.equal(
            settled,
            false,
            "cancellation cannot settle the source before native return"
          );
          assert.equal(
            Atomics.load(observation, IO_OBSERVATION.closeCount),
            operation === "close" ? 1 : 0
          );
          Atomics.store(observation, IO_OBSERVATION.released, 1);
          Atomics.notify(observation, IO_OBSERVATION.released);
          assert.deepEqual(await pending, { probe: { kind: "unavailable" } });
          await finalization;
          const opened = operation === "lstat" || operation === "readlink" ? 0 : 1;
          assert.equal(
            Atomics.load(observation, IO_OBSERVATION.openCount),
            opened,
            "source authorization precedes open"
          );
          assert.equal(
            Atomics.load(observation, IO_OBSERVATION.closeCount),
            opened,
            "the opened descriptor closed once"
          );
          let expectedReads = 0;
          if (operation === "read") expectedReads = 1;
          else if (operation === "close") expectedReads = 2;
          assert.equal(
            Atomics.load(observation, IO_OBSERVATION.readCount),
            expectedReads,
            "cancellation prevents the next read"
          );
          assert.equal(exitCode, 0);
          assert.equal(io.failed, false);
          assert.equal(worker.listenerCount("message"), 0);
          assert.equal(worker.listenerCount("error"), 0);
          assert.equal(worker.listenerCount("exit"), 0);
        } finally {
          Atomics.store(observation, IO_OBSERVATION.released, 1);
          Atomics.notify(observation, IO_OBSERVATION.released);
          await io.finalize();
        }
      }
    });
  });
});
