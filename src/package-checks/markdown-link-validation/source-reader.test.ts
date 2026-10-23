import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { LinkIoSession } from "./io-session.ts";
import { ScriptedIoWorker } from "./io-session.test-support.ts";
import type { SourceFileRead } from "./io-protocol.ts";
import { readRootContainedMarkdownSource } from "./source-reader.ts";

describe("Markdown Link source reader", () => {
  it("loads an authorized source with one fused job and preserves byte failure mapping", async () => {
    for (const outcome of ["bytes", "too-large", "unavailable", "outside", "missing"] as const) {
      const root = process.cwd();
      const sourcePath = path.join(root, "source.md");
      let worker!: ScriptedIoWorker;
      const signal = new AbortController().signal;
      const io = new LinkIoSession(root, signal, (_root, flag) => {
        worker = new ScriptedIoWorker(flag);
        return worker;
      });
      let parses = 0;
      const facts = Object.freeze({ occurrences: Object.freeze([]), headings: Object.freeze([]) });
      const bytes = new Uint8Array([35, 32, 83]);
      const pending = readRootContainedMarkdownSource({
        io,
        canonicalProjectRoot: root,
        rootRelativePath: "source.md",
        maxMarkdownBytes: 4,
        signal,
        parseMarkdownBytes: async (received) => {
          parses++;
          assert.deepEqual(received, bytes);
          return { ok: true, facts };
        }
      });
      assert.deepEqual(worker.requests, [
        { kind: "job", id: 1, job: { kind: "source-read", path: sourcePath, maxBytes: 4 } }
      ]);
      let source: SourceFileRead;
      if (outcome === "outside") source = { probe: { kind: "outside" } };
      else if (outcome === "missing") {
        source = { probe: { kind: "missing", absolutePath: sourcePath } };
      } else {
        source = {
          probe: { kind: "contained", absolutePath: sourcePath, endpoint: { kind: "file" } },
          read: outcome === "bytes" ? { ok: true, bytes } : { ok: false, reason: outcome }
        };
      }
      worker.message({ kind: "source-read", id: 1, source });
      assert.deepEqual(
        await pending,
        outcome === "bytes"
          ? { ok: true, source: { path: "source.md", facts } }
          : {
              ok: false,
              reason: outcome === "too-large" ? "source-too-large" : "source-unavailable"
            }
      );
      assert.equal(parses, outcome === "bytes" ? 1 : 0);
      await io.finalize();
      assert.equal(worker.requests.length, 2, "no separate containment or read job follows");
      assert.equal(worker.requests[1]?.kind, "close");
      assert.equal(io.failed, false);
    }
  });
});
