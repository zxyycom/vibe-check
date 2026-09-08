import { lstat, realpath, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export class CommandFailure extends Error {
  readonly code: "invalid-input" | "policy-rejected";

  constructor(code: "invalid-input" | "policy-rejected", message: string) {
    super(message);
    this.code = code;
  }
}

/** Writes only to a new regular file below an already-real, non-symlink parent. */
export async function writeNewFile(path: string, content: string): Promise<void> {
  const target = resolve(path);
  try {
    await lstat(target);
    throw new CommandFailure("invalid-input", `refusing to overwrite existing output: ${target}`);
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  const parent = dirname(target);
  const parentInfo = await lstat(parent);
  if (
    !parentInfo.isDirectory() ||
    parentInfo.isSymbolicLink() ||
    (await realpath(parent)) !== parent
  ) {
    throw new CommandFailure("invalid-input", `unsafe output parent: ${parent}`);
  }
  await writeFile(target, content, { encoding: "utf8", flag: "wx" });
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
