import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { startProjectGateTranscript } from "./transcript.ts";

describe("Project Gate transcript", () => {
  it("records only Gate-owned messages and final facts without patching terminal writers", () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-gate-transcript-"));
    const capture = captureProcessWrites();
    try {
      const capturedStdoutDescriptor = ownWriteDescriptor(process.stdout);
      const capturedStderrDescriptor = ownWriteDescriptor(process.stderr);
      const capturedConsoleDescriptors = consoleMethodDescriptors();
      const transcript = startProjectGateTranscript(root);

      assert.deepEqual(ownWriteDescriptor(process.stdout), capturedStdoutDescriptor);
      assert.deepEqual(ownWriteDescriptor(process.stderr), capturedStderrDescriptor);
      assert.deepEqual(consoleMethodDescriptors(), capturedConsoleDescriptors);

      transcript.writeGateMessage({
        level: "info",
        text: "project gate candidate: fixture"
      });
      transcript.writeGateMessage({
        level: "warning",
        text: "project gate warning [fixture]: retained"
      });
      process.stdout.write("Product progress remains terminal-only\n");
      process.stderr.write("Check presentation remains terminal-only\n");

      assert.equal(
        transcript.complete({
          exitStatus: 0,
          invocationLogDirectory: root,
          result: "passed"
        }),
        "succeeded"
      );
      assert.deepEqual(ownWriteDescriptor(process.stdout), capturedStdoutDescriptor);
      assert.deepEqual(ownWriteDescriptor(process.stderr), capturedStderrDescriptor);
      assert.deepEqual(consoleMethodDescriptors(), capturedConsoleDescriptors);
      assert.equal(capture.stdout, "Product progress remains terminal-only\n");
      assert.equal(capture.stderr, "Check presentation remains terminal-only\n");

      const source = readFileSync(join(root, "gate.log"), "utf8");
      assert.match(source, /^\[GATE] \[INFO] project gate candidate: fixture$/m);
      assert.match(source, /^\[GATE] \[WARNING] project gate warning \[fixture]: retained$/m);
      assert.match(source, /^\[GATE] \[RESULT:PASSED] project gate result: passed$/m);
      assert.match(source, /^\[GATE] \[EXIT:0] project gate exit status: 0$/m);
      assert.equal(source.includes("Product progress remains terminal-only"), false);
      assert.equal(source.includes("Check presentation remains terminal-only"), false);
      assert.equal(
        transcript.complete({
          exitStatus: 0,
          invocationLogDirectory: root,
          result: "passed"
        }),
        "failed"
      );
    } finally {
      capture.restore();
      rmSync(root, { force: true, recursive: true });
    }
    assert.equal(existsSync(root), false);
  });
});

function consoleMethodDescriptors(): Readonly<
  Record<"error" | "log" | "warn", PropertyDescriptor>
> {
  return Object.freeze({
    error: ownConsoleMethodDescriptor("error"),
    log: ownConsoleMethodDescriptor("log"),
    warn: ownConsoleMethodDescriptor("warn")
  });
}

function ownConsoleMethodDescriptor(method: "error" | "log" | "warn"): PropertyDescriptor {
  const descriptor = Object.getOwnPropertyDescriptor(console, method);
  if (descriptor === undefined) throw new Error(`console has no own ${method} descriptor`);
  return descriptor;
}

function captureProcessWrites(): Readonly<{
  readonly stderr: string;
  readonly stdout: string;
  restore(): void;
}> {
  const stdoutDescriptor = ownWriteDescriptor(process.stdout);
  const stderrDescriptor = ownWriteDescriptor(process.stderr);
  const chunks = { stderr: "", stdout: "" };
  Object.defineProperty(process.stdout, "write", {
    ...stdoutDescriptor,
    value: (chunk: string | Uint8Array): boolean => {
      chunks.stdout += chunkText(chunk);
      return true;
    }
  });
  Object.defineProperty(process.stderr, "write", {
    ...stderrDescriptor,
    value: (chunk: string | Uint8Array): boolean => {
      chunks.stderr += chunkText(chunk);
      return true;
    }
  });
  return Object.freeze({
    get stderr(): string {
      return chunks.stderr;
    },
    get stdout(): string {
      return chunks.stdout;
    },
    restore: (): void => {
      Object.defineProperty(process.stderr, "write", stderrDescriptor);
      Object.defineProperty(process.stdout, "write", stdoutDescriptor);
    }
  });
}

function ownWriteDescriptor(stream: NodeJS.WriteStream): PropertyDescriptor {
  const descriptor = Object.getOwnPropertyDescriptor(stream, "write");
  if (descriptor === undefined) throw new Error("process stream has no own write descriptor");
  return descriptor;
}

function chunkText(chunk: string | Uint8Array): string {
  return typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
}
