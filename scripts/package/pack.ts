import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { errorMessage } from "../error-message.ts";
import {
  processFailed,
  runProcessSync,
  type ProcessResult
} from "../process-execution/execution.ts";

const SHA256_DIGEST_PATTERN = /^[a-f0-9]{64}$/u;
const SHA512_INTEGRITY_PATTERN = /^sha512-[A-Za-z0-9+/]{86}==$/u;

/** Runs Bun inside the package artifact/candidate lifecycle and keeps failures observable. */
export function runBun(input: {
  readonly args: readonly string[];
  readonly cwd: string;
  readonly phase: string;
}): string {
  const result = runProcessSync({
    args: input.args,
    command: process.execPath,
    cwd: input.cwd,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" }
  });
  assertBunStarted(result, input.phase);
  assertBunSucceeded(result, input);
  return result.stdout;
}

function assertBunStarted(result: ProcessResult, phase: string): void {
  if (result.error !== undefined) {
    throw new Error(`candidate ${phase} could not start: ${errorMessage(result.error)}`, {
      cause: result.error
    });
  }
}

function assertBunSucceeded(
  result: ProcessResult,
  input: Readonly<{ readonly args: readonly string[]; readonly phase: string }>
): void {
  if (processFailed(result)) {
    const output = [result.stdout, result.stderr]
      .filter((value) => value.trim().length > 0)
      .join("\n");
    const termination =
      result.status === null
        ? `signal ${result.signal ?? "unknown"}`
        : `exit ${String(result.status)}`;
    throw new Error(
      `candidate ${input.phase} failed with ${termination}: bun ${input.args.join(" ")}${
        output ? `\n${output}` : ""
      }`
    );
  }
}

export function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function sha512IntegrityFile(filePath: string): string {
  return `sha512-${createHash("sha512").update(readFileSync(filePath)).digest("base64")}`;
}

export function isSha256Digest(value: unknown): value is string {
  return typeof value === "string" && SHA256_DIGEST_PATTERN.test(value);
}

export function isSha512Integrity(value: unknown): value is string {
  return typeof value === "string" && SHA512_INTEGRITY_PATTERN.test(value);
}

/** Returns false when the path is unreadable or its bytes do not match the expected digest. */
export function fileMatchesSha256(filePath: string, expectedDigest: string): boolean {
  try {
    return sha256File(filePath) === expectedDigest;
  } catch {
    return false;
  }
}

/** Returns false when the path is unreadable or its bytes do not match the SHA-512 SRI. */
export function fileMatchesSha512Integrity(filePath: string, expectedIntegrity: string): boolean {
  try {
    return sha512IntegrityFile(filePath) === expectedIntegrity;
  } catch {
    return false;
  }
}
