import { closeSync, openSync, rmSync, writeSync } from "node:fs";
import { join } from "node:path";
import { inspect, stripVTControlCharacters } from "node:util";

export interface ProjectGateTranscriptCompletion {
  readonly exitStatus: number;
  readonly invocationLogDirectory: string;
  readonly result: "failed" | "passed" | "unavailable";
}

export interface ProjectGateTranscript {
  complete(completion: ProjectGateTranscriptCompletion): "failed" | "succeeded";
}

interface PatchedProcessStream {
  readonly label: "STDERR" | "STDOUT";
  readonly originalWrite: PropertyDescriptor;
  readonly stream: NodeJS.WriteStream;
}

interface PatchedConsoleMethod {
  readonly method: "error" | "log" | "warn";
  readonly originalMethod: PropertyDescriptor;
}

interface ConsoleWriteState {
  depth: number;
}

/** Tees one Gate invocation's console and process-stream output into a local plain transcript. */
export function startProjectGateTranscript(invocationLogDirectory: string): ProjectGateTranscript {
  const filePath = join(invocationLogDirectory, "gate.log");
  const descriptor = openSync(filePath, "wx");
  let activeLineLabel: PatchedProcessStream["label"] | undefined;
  let atLineStart = true;
  let failed = false;
  let isComplete = false;
  const consoleWriteState: ConsoleWriteState = { depth: 0 };
  const patchedConsoleMethods: PatchedConsoleMethod[] = [];
  const patchedStreams: PatchedProcessStream[] = [];

  const append = (content: string): void => {
    if (failed || content.length === 0) return;
    try {
      writeAll(descriptor, content);
    } catch {
      failed = true;
    }
  };

  const appendProcessOutput = (label: PatchedProcessStream["label"], content: string): void => {
    const plain = plainTranscriptContent(content);
    if (plain.length === 0) return;
    if (!atLineStart && activeLineLabel !== label) {
      append("\n");
      atLineStart = true;
    }

    let offset = 0;
    while (offset < plain.length) {
      const newline = plain.indexOf("\n", offset);
      const lineEnd = newline < 0 ? plain.length : newline;
      if (atLineStart) append(`[${label}] `);
      append(plain.slice(offset, lineEnd));
      if (newline < 0) {
        atLineStart = false;
        activeLineLabel = label;
        break;
      }
      append("\n");
      atLineStart = true;
      activeLineLabel = undefined;
      offset = newline + 1;
    }
  };

  try {
    const appendDirectProcessOutput = (
      label: PatchedProcessStream["label"],
      content: string
    ): void => {
      if (consoleWriteState.depth === 0) appendProcessOutput(label, content);
    };
    patchedStreams.push(patchProcessStream(process.stdout, "STDOUT", appendDirectProcessOutput));
    patchedStreams.push(patchProcessStream(process.stderr, "STDERR", appendDirectProcessOutput));
    patchedConsoleMethods.push(
      patchConsoleMethod("log", "STDOUT", appendProcessOutput, consoleWriteState)
    );
    for (const method of ["error", "warn"] as const) {
      patchedConsoleMethods.push(
        patchConsoleMethod(method, "STDERR", appendProcessOutput, consoleWriteState)
      );
    }
  } catch (error: unknown) {
    restoreConsoleMethods(patchedConsoleMethods);
    restoreProcessStreams(patchedStreams);
    try {
      closeSync(descriptor);
    } catch {
      // Preserve the setup failure that triggered rollback.
    }
    try {
      rmSync(filePath, { force: true });
    } catch {
      // Preserve the setup failure; the adapter reports the invocation directory for inspection.
    }
    throw error;
  }

  return Object.freeze({
    complete: (completion: ProjectGateTranscriptCompletion) => {
      if (isComplete) return "failed" as const;
      isComplete = true;
      if (!atLineStart) append("\n");
      append(`[GATE] [LOGS] directory=${JSON.stringify(completion.invocationLogDirectory)}\n`);
      append(
        `[GATE] [RESULT:${completion.result.toUpperCase()}] project gate result: ${completion.result}\n`
      );
      append(
        `[GATE] [EXIT:${completion.exitStatus}] project gate exit status: ${completion.exitStatus}\n`
      );
      if (restoreConsoleMethods(patchedConsoleMethods) === "failed") failed = true;
      if (restoreProcessStreams(patchedStreams) === "failed") failed = true;
      try {
        closeSync(descriptor);
      } catch {
        failed = true;
      }
      return failed ? "failed" : "succeeded";
    }
  });
}

function patchConsoleMethod(
  method: PatchedConsoleMethod["method"],
  label: PatchedProcessStream["label"],
  append: (label: PatchedProcessStream["label"], content: string) => void,
  writeState: ConsoleWriteState
): PatchedConsoleMethod {
  const originalMethod = Object.getOwnPropertyDescriptor(console, method);
  if (originalMethod === undefined || typeof console[method] !== "function") {
    throw new Error(`console does not expose an own ${method} method`);
  }
  const writeToOriginalConsole = console[method].bind(console);
  Object.defineProperty(console, method, {
    ...originalMethod,
    value: (...values: unknown[]): void => {
      append(label, `${consoleValuesText(values)}\n`);
      writeState.depth += 1;
      try {
        writeToOriginalConsole(...values);
      } finally {
        writeState.depth -= 1;
      }
    }
  });
  return Object.freeze({ method, originalMethod });
}

function restoreConsoleMethods(
  patchedMethods: readonly PatchedConsoleMethod[]
): "failed" | "succeeded" {
  let failed = false;
  for (let index = patchedMethods.length - 1; index >= 0; index -= 1) {
    const patched = patchedMethods[index];
    try {
      Object.defineProperty(console, patched.method, patched.originalMethod);
    } catch {
      failed = true;
    }
  }
  return failed ? "failed" : "succeeded";
}

function consoleValuesText(values: readonly unknown[]): string {
  return values
    .map((value) =>
      typeof value === "string"
        ? value
        : inspect(value, { colors: false, customInspect: false, getters: false })
    )
    .join(" ");
}

function patchProcessStream(
  stream: NodeJS.WriteStream,
  label: PatchedProcessStream["label"],
  append: (label: PatchedProcessStream["label"], content: string) => void
): PatchedProcessStream {
  const originalWrite = Object.getOwnPropertyDescriptor(stream, "write");
  if (originalWrite === undefined || typeof stream.write !== "function") {
    throw new Error(`process ${label.toLowerCase()} does not expose an own write method`);
  }
  const writeToOriginalStream = stream.write.bind(stream);
  Object.defineProperty(stream, "write", {
    ...originalWrite,
    value: (
      chunk: string | Uint8Array,
      encodingOrCallback?: BufferEncoding | ProcessWriteCallback,
      callback?: ProcessWriteCallback
    ): boolean => {
      append(label, processChunkText(chunk));
      if (typeof encodingOrCallback === "string") {
        return writeToOriginalStream.call(stream, chunk, encodingOrCallback, callback);
      }
      if (encodingOrCallback === undefined) return writeToOriginalStream.call(stream, chunk);
      return writeToOriginalStream.call(stream, chunk, undefined, encodingOrCallback);
    }
  });
  return Object.freeze({ label, originalWrite, stream });
}

type ProcessWriteCallback = (error?: Error | null) => void;

function restoreProcessStreams(
  patchedStreams: readonly PatchedProcessStream[]
): "failed" | "succeeded" {
  let failed = false;
  for (let index = patchedStreams.length - 1; index >= 0; index -= 1) {
    const patched = patchedStreams[index];
    try {
      Object.defineProperty(patched.stream, "write", patched.originalWrite);
    } catch {
      failed = true;
    }
  }
  return failed ? "failed" : "succeeded";
}

function processChunkText(chunk: string | Uint8Array): string {
  if (typeof chunk === "string") return chunk;
  return Buffer.from(chunk).toString("utf8");
}

function plainTranscriptContent(content: string): string {
  const normalized = stripVTControlCharacters(content)
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n");
  let plain = "";
  for (const character of normalized) {
    const codeUnit = character.charCodeAt(0);
    if (
      codeUnit <= 0x08 ||
      codeUnit === 0x0b ||
      codeUnit === 0x0c ||
      (codeUnit >= 0x0e && codeUnit <= 0x1f) ||
      codeUnit === 0x7f
    ) {
      continue;
    }
    plain += character;
  }
  return plain;
}

function writeAll(descriptor: number, content: string): void {
  const bytes = Buffer.from(content, "utf8");
  let offset = 0;
  while (offset < bytes.length) {
    const written = writeSync(descriptor, bytes, offset, bytes.length - offset, null);
    if (written <= 0) throw new Error("Gate transcript append made no progress");
    offset += written;
  }
}
