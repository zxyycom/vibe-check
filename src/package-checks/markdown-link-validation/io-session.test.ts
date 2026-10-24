import assert from "node:assert/strict";
import path from "node:path";
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
    const sourcePath = path.join(process.cwd(), "source.md");
    const outsidePath = path.resolve(process.cwd(), "..", "outside.md");
    const contained = { kind: "contained", absolutePath: sourcePath };
    const bytes = { ok: true, bytes: new Uint8Array(1) };
    for (const source of [
      undefined,
      { probe: { kind: "invented" } },
      { probe: contained },
      { probe: contained, read: { ok: false, reason: "invented" } },
      { probe: contained, read: { ok: true, bytes: [1] } },
      { probe: contained, read: { ok: true, bytes: new Uint8Array(5) } },
      { probe: { kind: "contained", absolutePath: "source.md" }, read: bytes },
      { probe: { kind: "contained", absolutePath: `${sourcePath}\0` }, read: bytes },
      { probe: { kind: "contained", absolutePath: outsidePath }, read: bytes },
      { probe: { ...contained, endpoint: { kind: "missing" } }, read: bytes },
      { probe: { kind: "missing", absolutePath: outsidePath } },
      { probe: { kind: "missing", absolutePath: sourcePath }, read: bytes },
      { probe: { kind: "outside" }, read: bytes },
      { probe: { kind: "unavailable" }, read: undefined }
    ]) {
      let worker!: ScriptedIoWorker;
      const io = new LinkIoSession(process.cwd(), new AbortController().signal, (_root, flag) => {
        worker = new ScriptedIoWorker(flag);
        return worker;
      });
      let settlements = 0;
      const pending = io.readSourceFile(sourcePath, 4).then((result) => {
        settlements++;
        return result;
      });
      worker.message({ kind: "source-read", id: 1, source });
      assert.deepEqual(await pending, { probe: { kind: "unavailable" } });
      await io.finalize();
      assert.equal(io.failed, true);
      assert.equal(settlements, 1);
      assert.equal(worker.unsubscribeCount, 1);
      assert.equal(worker.stopIdleCount, 0);
      assert.equal(worker.requests.filter(({ kind }) => kind === "close").length, 1);
      assert.deepEqual(await io.readSourceFile(sourcePath, 4), { probe: { kind: "unavailable" } });
    }
    for (const maxBytes of [0, 16_777_217, 1.5, NaN]) {
      let workerStarts = 0;
      const io = new LinkIoSession(process.cwd(), new AbortController().signal, () => {
        workerStarts++;
        assert.fail("invalid source jobs must not start a Worker");
      });
      assert.deepEqual(await io.readSourceFile(sourcePath, maxBytes), {
        probe: { kind: "unavailable" }
      });
      await io.finalize();
      assert.equal(io.failed, true);
      assert.equal(workerStarts, 0, `invalid byte bound: ${maxBytes}`);
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
});
