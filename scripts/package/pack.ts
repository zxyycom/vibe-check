import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { errorMessage } from "../error-message.ts";

const SHA256_DIGEST_PATTERN = /^[a-f0-9]{64}$/u;

/** Runs Bun inside the package artifact/candidate lifecycle and keeps failures observable. */
export function runBun(input: {
  readonly args: readonly string[];
  readonly cwd: string;
  readonly phase: string;
}): string {
  const result = spawnSync(process.execPath, input.args, {
    cwd: input.cwd,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" }
  });
  if (result.error !== undefined) {
    throw new Error(`candidate ${input.phase} could not start: ${errorMessage(result.error)}`, {
      cause: result.error
    });
  }
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr]
      .filter((value) => value.trim().length > 0)
      .join("\n");
    throw new Error(
      `candidate ${input.phase} failed with exit ${String(result.status)}: bun ${input.args.join(" ")}${
        output ? `\n${output}` : ""
      }`
    );
  }
  return result.stdout;
}

export function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function isSha256Digest(value: unknown): value is string {
  return typeof value === "string" && SHA256_DIGEST_PATTERN.test(value);
}

/** Returns false when the path is unreadable or its bytes do not match the expected digest. */
export function fileMatchesSha256(filePath: string, expectedDigest: string): boolean {
  try {
    return sha256File(filePath) === expectedDigest;
  } catch {
    return false;
  }
}
