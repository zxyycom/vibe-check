import { lstat, realpath, stat, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const MANAGED_RESOURCE_DIRECTORY =
  "docs/investigations/_resources/260908-compare-simple-admission-algorithms";

export type OutputTarget = Readonly<{ readonly path: string }>;

/** Parses the one intentional write capability before an expensive replay begins. */
export async function parseOutputTarget(arguments_: readonly string[]): Promise<OutputTarget> {
  if (arguments_.length !== 2 || arguments_[0] !== "--output")
    throw new UsageError("usage: bun simple-admission-comparison.ts --output <new-evidence.json>");
  const supplied = arguments_[1];
  if (supplied === undefined || supplied.length === 0)
    throw new UsageError("--output requires a new JSON file path");
  const path = resolve(supplied);
  await assertWritableNewFile(path);
  return Object.freeze({ path });
}

/** Writes only to the exact preflighted, still-new output target. */
export async function writeNewEvidence(output: OutputTarget, contents: string): Promise<void> {
  await writeFile(output.path, contents, { encoding: "utf8", flag: "wx" });
}

export class UsageError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

async function assertWritableNewFile(path: string): Promise<void> {
  const parent = resolve(path, "..");
  const parentInfo = await stat(parent).catch((error: unknown) => {
    throw new UsageError(`output parent is unavailable: ${parent}: ${message(error)}`);
  });
  if (!parentInfo.isDirectory())
    throw new UsageError(`output parent is not a directory: ${parent}`);
  const [realParent, managedDirectory] = await Promise.all([
    realpath(parent),
    realpath(MANAGED_RESOURCE_DIRECTORY)
  ]);
  if (isWithin(realParent, managedDirectory))
    throw new UsageError(
      "refusing to write inside managed investigation resources; choose a new external output path"
    );
  await lstat(path)
    .then(() => {
      throw new UsageError(`refusing to overwrite existing output: ${path}`);
    })
    .catch((error: unknown) => {
      if (error instanceof UsageError) throw error;
      if (code(error) !== "ENOENT")
        throw new UsageError(`cannot inspect output target: ${path}: ${message(error)}`);
    });
}

function isWithin(path: string, directory: string): boolean {
  const remainder = relative(directory, path);
  return remainder === "" || (!remainder.startsWith("..") && !remainder.startsWith("/"));
}
function code(error: unknown): string | undefined {
  return error !== null && typeof error === "object" && "code" in error
    ? String(error.code)
    : undefined;
}
function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
