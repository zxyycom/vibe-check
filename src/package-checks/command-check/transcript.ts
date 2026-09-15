import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { join } from "node:path";

const TRANSCRIPT_FILE_NAME = "process.log";

/** Atomically replaces this Check-local fixed transcript without exposing command inputs or native errors. */
export async function writeCommandTranscript(
  artifactDirectory: string,
  contents: string
): Promise<boolean> {
  const targetPath = join(artifactDirectory, TRANSCRIPT_FILE_NAME);
  const temporaryPath = join(artifactDirectory, `.process-${randomUUID()}.tmp`);
  try {
    await fs.mkdir(artifactDirectory, { recursive: true });
    await fs.writeFile(temporaryPath, contents, { encoding: "utf8", flag: "wx" });
    await fs.rename(temporaryPath, targetPath);
    return true;
  } catch {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    return false;
  }
}

export function runningTranscript(): string {
  return "status=running\n";
}

export function closedTranscript(input: {
  readonly status: "passed" | "failed" | "unavailable";
  readonly stderr: string;
  readonly stdout: string;
}): string {
  return `status=${input.status}\nstdout:\n${input.stdout}\nstderr:\n${input.stderr}`;
}
