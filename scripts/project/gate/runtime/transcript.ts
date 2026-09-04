import { closeSync, openSync, writeSync } from "node:fs";
import { join } from "node:path";

export interface ProjectGateTranscriptCompletion {
  readonly exitStatus: number;
  readonly invocationLogDirectory: string;
  readonly result: "failed" | "passed" | "unavailable";
}

export interface ProjectGateTranscript {
  complete(completion: ProjectGateTranscriptCompletion): "failed" | "succeeded";
  /** Records one Gate-adapter or afterGate message without intercepting Product output. */
  writeGateMessage(
    input: Readonly<{
      readonly level: "error" | "info" | "warning";
      readonly text: string;
    }>
  ): void;
}

/** Owns only Gate adapter evidence; Product progress and Check presentation use their own channels. */
export function startProjectGateTranscript(invocationLogDirectory: string): ProjectGateTranscript {
  const filePath = join(invocationLogDirectory, "gate.log");
  const descriptor = openSync(filePath, "wx");
  let failed = false;
  let isComplete = false;

  const append = (content: string): void => {
    if (failed || content.length === 0) return;
    try {
      writeAll(descriptor, content);
    } catch {
      failed = true;
    }
  };

  return Object.freeze({
    writeGateMessage: (
      input: Readonly<{
        readonly level: "error" | "info" | "warning";
        readonly text: string;
      }>
    ): void => {
      if (isComplete) {
        failed = true;
        return;
      }
      append(`[GATE] [${input.level.toUpperCase()}] ${input.text}\n`);
    },
    complete: (completion: ProjectGateTranscriptCompletion) => {
      if (isComplete) return "failed" as const;
      isComplete = true;
      append(`[GATE] [LOGS] directory=${JSON.stringify(completion.invocationLogDirectory)}\n`);
      append(
        `[GATE] [RESULT:${completion.result.toUpperCase()}] project gate result: ${completion.result}\n`
      );
      append(
        `[GATE] [EXIT:${completion.exitStatus}] project gate exit status: ${completion.exitStatus}\n`
      );
      try {
        closeSync(descriptor);
      } catch {
        failed = true;
      }
      return failed ? "failed" : "succeeded";
    }
  });
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
