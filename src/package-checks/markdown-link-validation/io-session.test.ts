import assert from "node:assert/strict";
import path from "node:path";
import { setImmediate } from "node:timers/promises";
import { Worker } from "node:worker_threads";
import { describe, it } from "node:test";

import { LinkIoSession, markdownLinkWorkerExecArgv } from "./io-session.ts";
import { assertNodeStringInputWorker, ScriptedIoWorker } from "./io-session.test-support.ts";
import {
  createdResolver,
  readSource,
  withFixture,
  writeFixtureFile
} from "./local-resolver.test-support.ts";

describe("Markdown Link private I/O session", () => {
  it("preserves parent preload context for file-backed Workers under Node string-input hosts", async () => {
    const inherited = Object.freeze([
      "--import",
      "data:text/javascript,console.log('preload')",
      "--experimental-loader=./loader.mjs",
      "--conditions",
      "test",
      "--trace-warnings",
      "--eval",
      "console.log('--input-type=module')"
    ]);
    for (const inputFlags of [
      ["--input-type=module"],
      ["--input-type", "module"],
      ["--input_type=module"],
      ["--input_type", "module"]
    ]) {
      assert.deepEqual(markdownLinkWorkerExecArgv([...inputFlags, ...inherited]), inherited);
    }
    assert.equal(markdownLinkWorkerExecArgv(inherited), undefined);
    await withFixture(async ({ root }) => {
      await writeFixtureFile(root, "source.md", "# Source\n");
      assertNodeStringInputWorker(root);
    });
  });

  it("starts lazily, drains one pending job, and finalizes once without terminating active work", async () => {
    const controller = new AbortController();
    let starts = 0;
    let worker: ScriptedIoWorker | undefined;
    const io = new LinkIoSession(process.cwd(), controller.signal, (_root, flag) => {
      starts++;
      worker = new ScriptedIoWorker(flag);
      return worker;
    });
    assert.equal(starts, 0);
    const pending = io.probeEndpoint(process.cwd());
    assert.equal(starts, 1);
    assert.ok(worker);
    controller.abort();
    assert.equal(Atomics.load(worker.cancellation, 0), 1);
    const finalization = io.finalize();
    assert.strictEqual(io.finalize(), finalization);
    let finalized = false;
    const completion = finalization.then(() => {
      finalized = true;
    });
    await Promise.resolve();
    assert.equal(finalized, false);
    assert.equal(worker.requests.length, 1, "close must await the native job result");
    assert.deepEqual(await io.probeEndpoint(process.cwd()), { kind: "unavailable" });
    worker.message({ kind: "cancelled", id: 1 });
    assert.deepEqual(await pending, { kind: "unavailable" });
    await completion;
    assert.equal(finalized, true);
    assert.equal(worker.requests.filter(({ kind }) => kind === "close").length, 1);
    assert.equal(worker.unsubscribeCount, 1);
    assert.equal(worker.stopIdleCount, 0);
    assert.equal(io.failed, false);

    for (const signal of [new AbortController().signal, AbortSignal.abort()]) {
      const empty = new LinkIoSession(process.cwd(), signal, () => {
        throw new Error("must stay lazy");
      });
      if (signal.aborted)
        assert.deepEqual(await empty.probeEndpoint(process.cwd()), { kind: "unavailable" });
      await empty.finalize();
      assert.equal(empty.failed, false);
    }
  });

  it("settles construction, send, protocol, error and exit faults once and removes subscriptions", async () => {
    const failedCreation = new LinkIoSession(process.cwd(), new AbortController().signal, () => {
      throw new Error("construction");
    });
    assert.deepEqual(await failedCreation.probeEndpoint(process.cwd()), { kind: "unavailable" });
    await failedCreation.finalize();
    assert.equal(failedCreation.failed, true);

    for (const fault of [
      "send",
      "close-send",
      "id",
      "kind",
      "shape",
      "error",
      "exit",
      "duplicate",
      "concurrent"
    ]) {
      let worker!: ScriptedIoWorker;
      const io = new LinkIoSession(process.cwd(), new AbortController().signal, (_root, flag) => {
        worker = new ScriptedIoWorker(flag);
        worker.failJobSend = fault === "send";
        worker.failCloseSend = fault === "close-send";
        return worker;
      });
      let settlements = 0;
      const pending = io.probeEndpoint(process.cwd()).then((probe) => {
        settlements++;
        return probe;
      });
      switch (fault) {
        case "send":
          break;
        case "close-send":
          worker.reply();
          break;
        case "id":
          worker.message({ kind: "endpoint", id: 2, probe: { kind: "file" } });
          break;
        case "kind":
          worker.message({ kind: "read", id: 1, read: { ok: true, bytes: new Uint8Array() } });
          break;
        case "shape":
          worker.message({ kind: "endpoint", id: 1, probe: { kind: "invented" } });
          break;
        case "error":
          worker.error();
          break;
        case "exit":
          worker.exit(0);
          break;
        case "duplicate":
          worker.reply();
          worker.reply();
          break;
        case "concurrent":
          assert.deepEqual(await io.probeEndpoint(process.cwd()), { kind: "unavailable" });
          break;
      }
      const probe = await pending;
      assert.equal(
        probe.kind,
        fault === "duplicate" || fault === "close-send" ? "file" : "unavailable",
        fault
      );
      await io.finalize();
      assert.equal(io.failed, true, fault);
      assert.equal(settlements, 1, fault);
      assert.equal(worker.unsubscribeCount, 1, fault);
      assert.equal(worker.stopIdleCount, fault === "close-send" ? 1 : 0, fault);
      assert.deepEqual(await io.probeEndpoint(process.cwd()), { kind: "unavailable" });
    }
    for (const badResponse of [
      { kind: "read", id: 1, read: { ok: true, bytes: new Uint8Array(5) } },
      { kind: "read", id: 1, read: { ok: true, bytes: [1] } }
    ]) {
      let worker!: ScriptedIoWorker;
      const io = new LinkIoSession(process.cwd(), new AbortController().signal, (_root, flag) => {
        worker = new ScriptedIoWorker(flag);
        return worker;
      });
      const pending = io.readRegularFile(path.join(process.cwd(), "source.md"), 4);
      worker.message(badResponse);
      assert.deepEqual(await pending, { ok: false, reason: "unavailable" });
      await io.finalize();
      assert.equal(io.failed, true);
    }
  });

  it("keeps simultaneous resolver cancellation isolated and awaits real Worker exit", async () => {
    await withFixture(async ({ root }) => {
      await writeFixtureFile(root, "source.md", "# Source\n");
      const cancelled = new AbortController();
      const first = await createdResolver(root, 10, { enabled: false }, cancelled.signal);
      const second = await createdResolver(root, 10);
      const pendingFirst = first.readSource("source.md", 100);
      const pendingSecond = readSource(second, "source.md");
      cancelled.abort();
      assert.deepEqual(await pendingFirst, { ok: false, reason: "source-unavailable" });
      assert.equal((await pendingSecond).facts.headings[0]?.slug, "source");
      await Promise.all([first.finalize(), second.finalize()]);
      assert.equal(first.finalizationFailed, false);
      assert.equal(second.finalizationFailed, false);
    });
  });

  it("observes atomic cancellation during a real Worker read and drains its descriptor before exit", async () => {
    await withFixture(async ({ root }) => {
      await writeFixtureFile(root, "source.md", "# Source\n");
      const controller = new AbortController();
      const observation = new Int32Array(new SharedArrayBuffer(4 * Int32Array.BYTES_PER_ELEMENT));
      let worker!: Worker;
      let exitCode: number | undefined;
      const io = new LinkIoSession(root, controller.signal, (_root, cancellation) => {
        worker = new Worker(new URL("./io-worker-cancellation.test-support.ts", import.meta.url), {
          workerData: { root, cancellation, observation: observation.buffer }
        });
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
        const pending = io.readRegularFile(path.join(root, "source.md"), 100);
        while (Atomics.load(observation, 0) === 0) {
          assert.equal(
            exitCode,
            undefined,
            "Worker must enter the instrumented native read before exiting"
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
        assert.equal(Atomics.load(observation, 2), 0);
        Atomics.store(observation, 1, 1);
        Atomics.notify(observation, 1);
        assert.deepEqual(await pending, { ok: false, reason: "unavailable" });
        await finalization;
        assert.equal(Atomics.load(observation, 2), 1, "the opened descriptor closed once");
        assert.equal(Atomics.load(observation, 3), 1, "cancellation prevents another read");
        assert.equal(exitCode, 0);
        assert.equal(io.failed, false);
        assert.equal(worker.listenerCount("message"), 0);
        assert.equal(worker.listenerCount("error"), 0);
        assert.equal(worker.listenerCount("exit"), 0);
      } finally {
        Atomics.store(observation, 1, 1);
        Atomics.notify(observation, 1);
        await io.finalize();
      }
    });
  });
});
