import { spawn } from "node:child_process";

import type { GitCommandResult } from "./maintenance-reminders.ts";

const MAX_GIT_OUTPUT_BYTES = 64 * 1024 * 1024;

export async function runGit(input: {
  readonly args: readonly string[];
  readonly executable: string;
  readonly projectRoot: string;
  readonly signal: AbortSignal;
}): Promise<GitCommandResult> {
  if (input.signal.aborted) return { kind: "cancelled" };

  return new Promise((resolve) => {
    let settled = false;
    let outputBytes = 0;
    let stdout = "";
    let overflowed = false;
    let child: ReturnType<typeof spawn>;

    const settle = (result: GitCommandResult): void => {
      if (settled) return;
      settled = true;
      input.signal.removeEventListener("abort", abort);
      resolve(result);
    };
    const abort = (): void => {
      child.kill("SIGTERM");
    };

    try {
      child = spawn(input.executable, input.args, {
        cwd: input.projectRoot,
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true
      });
    } catch {
      settle({ kind: "failed" });
      return;
    }

    input.signal.addEventListener("abort", abort, { once: true });
    child.stdout?.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      outputBytes += Buffer.byteLength(text);
      if (outputBytes > MAX_GIT_OUTPUT_BYTES) {
        overflowed = true;
        child.kill("SIGTERM");
        return;
      }
      stdout += text;
    });
    child.once("error", () =>
      settle(input.signal.aborted ? { kind: "cancelled" } : { kind: "failed" })
    );
    child.once("close", (status) => {
      if (input.signal.aborted) {
        settle({ kind: "cancelled" });
      } else if (overflowed || status !== 0) {
        settle({ kind: "failed" });
      } else {
        settle({ kind: "succeeded", stdout });
      }
    });
  });
}
