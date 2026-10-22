import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

import type { LinkIoWorkerPort } from "./io-session.ts";
import type { LinkIoRequest, LinkIoResponse } from "./io-protocol.ts";

/** Exercise Node's actual flag inheritance and preload execution in a real file-backed Worker. */
export function assertNodeStringInputWorker(root: string): void {
  const nodeCommand = process.env.VIBE_CHECK_NODE_CMD ?? "node";
  const inputFlags = [
    ["--max-old-space-size=1024"],
    ["--input-type=module"],
    ["--input-type", "module"],
    ["--input_type=module"],
    ["--input_type", "module"]
  ];
  for (const [index, flags] of inputFlags.entries()) {
    const marker = path.join(root, `preloaded-${index}`);
    const preload = `
      import { isMainThread } from "node:worker_threads";
      import { writeFileSync } from "node:fs";
      if (!isMainThread) writeFileSync(${JSON.stringify(marker)}, "worker preload ran");
    `;
    const script = `
      import assert from "node:assert/strict";
      import { readFileSync } from "node:fs";
      import { LinkIoSession } from ${JSON.stringify(new URL("./io-session.ts", import.meta.url).href)};
      const io = new LinkIoSession(${JSON.stringify(root)}, new AbortController().signal);
      try {
        const read = await io.readRegularFile(${JSON.stringify(path.join(root, "source.md"))}, 100);
        assert.equal(read.ok && new TextDecoder().decode(read.bytes), "# Source\\n");
      } finally { await io.finalize(); }
      assert.equal(io.failed, false);
      assert.equal(readFileSync(${JSON.stringify(marker)}, "utf8"), "worker preload ran");
    `;
    const child = spawnSync(
      nodeCommand,
      [
        "--import",
        `data:text/javascript,${encodeURIComponent(preload)}`,
        "--trace-warnings",
        ...flags,
        "--eval",
        script
      ],
      { encoding: "utf8", timeout: 10_000 }
    );
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, 0, `${flags.join(" ")}: ${child.stdout}\n${child.stderr}`);
  }
}

/** Explicit, invocation-local transport control; production defaults are never replaced. */
export class ScriptedIoWorker implements LinkIoWorkerPort {
  readonly requests: LinkIoRequest[] = [];
  readonly cancellation: Int32Array;
  listeners: Parameters<LinkIoWorkerPort["subscribe"]>[0] | undefined;
  unsubscribeCount = 0;
  stopIdleCount = 0;
  failJobSend = false;
  failCloseSend = false;
  replyToClose = true;

  constructor(cancellation: SharedArrayBuffer) {
    this.cancellation = new Int32Array(cancellation);
  }
  postMessage(request: LinkIoRequest): void {
    this.requests.push(request);
    if (request.kind === "job") {
      if (this.failJobSend) throw new Error("job send failed");
      return;
    }
    if (this.failCloseSend) throw new Error("close send failed");
    if (this.replyToClose)
      queueMicrotask(() => {
        this.message({ kind: "closed", id: request.id });
        this.exit(0);
      });
  }
  subscribe(listeners: Parameters<LinkIoWorkerPort["subscribe"]>[0]): () => void {
    this.listeners = listeners;
    return () => {
      this.unsubscribeCount++;
      this.listeners = undefined;
    };
  }
  stopIdle(): void {
    this.stopIdleCount++;
    queueMicrotask(() => {
      this.exit(1);
    });
  }
  message(message: unknown): void {
    this.listeners?.message(message);
  }
  exit(code: number): void {
    this.listeners?.exit(code);
  }
  error(): void {
    this.listeners?.error();
  }
  reply(probe: "file" | "directory" = "file"): void {
    const request = [...this.requests].reverse().find((entry) => entry.kind === "job");
    assert.ok(request?.kind === "job");
    assert.equal(request.job.kind, "endpoint");
    this.message({
      kind: "endpoint",
      id: request.id,
      probe: { kind: probe }
    } satisfies LinkIoResponse);
  }
}
