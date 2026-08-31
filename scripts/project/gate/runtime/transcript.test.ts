import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { startProjectGateTranscript } from "./transcript.ts";

describe("Project Gate transcript", () => {
  it("tees tagged plain output, records final Gate facts, and restores process and console writers", () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-gate-transcript-"));
    const capture = captureProcessWrites();
    const consoleCapture = captureConsoleWrites();
    try {
      const capturedStdoutDescriptor = ownWriteDescriptor(process.stdout);
      const capturedStderrDescriptor = ownWriteDescriptor(process.stderr);
      const capturedConsoleDescriptors = consoleMethodDescriptors();
      const transcript = startProjectGateTranscript(root);

      console.log("visible Gate stdout");
      console.warn("visible Gate warning");
      process.stdout.write("\u001B[31mvisible stdout\u001B[0m\n");
      process.stderr.write("visible stderr");
      process.stdout.write("next stdout\n");

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
      assert.deepEqual(consoleCapture.logs, ["visible Gate stdout"]);
      assert.deepEqual(consoleCapture.warnings, ["visible Gate warning"]);
      assert.equal(capture.stdout, "\u001B[31mvisible stdout\u001B[0m\nnext stdout\n");
      assert.equal(capture.stderr, "visible stderr");

      const source = readFileSync(join(root, "gate.log"), "utf8");
      assert.match(source, /^\[STDOUT] visible Gate stdout$/m);
      assert.match(source, /^\[STDERR] visible Gate warning$/m);
      assert.match(source, /^\[STDOUT] visible stdout$/m);
      assert.match(source, /^\[STDERR] visible stderr$/m);
      assert.match(source, /^\[STDOUT] next stdout$/m);
      assert.match(source, /^\[GATE] \[RESULT:PASSED] project gate result: passed$/m);
      assert.match(source, /^\[GATE] \[EXIT:0] project gate exit status: 0$/m);
      assert.equal(source.includes("\u001B"), false);
      assert.equal(
        transcript.complete({ exitStatus: 0, invocationLogDirectory: root, result: "passed" }),
        "failed"
      );
    } finally {
      consoleCapture.restore();
      capture.restore();
      rmSync(root, { force: true, recursive: true });
    }
    assert.equal(existsSync(root), false);
  });
});

function captureConsoleWrites(): Readonly<{
  readonly logs: readonly string[];
  readonly warnings: readonly string[];
  restore(): void;
}> {
  const descriptors = consoleMethodDescriptors();
  const logs: string[] = [];
  const warnings: string[] = [];
  Object.defineProperty(console, "log", {
    ...descriptors.log,
    value: (...values: unknown[]): void => {
      logs.push(values.map(String).join(" "));
    }
  });
  Object.defineProperty(console, "warn", {
    ...descriptors.warn,
    value: (...values: unknown[]): void => {
      warnings.push(values.map(String).join(" "));
    }
  });
  return Object.freeze({
    logs,
    restore: (): void => {
      for (const method of ["error", "log", "warn"] as const) {
        Object.defineProperty(console, method, descriptors[method]);
      }
    },
    warnings
  });
}

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
