import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface WritablePolicyState {
  readonly stateDirectory: string;
  readonly stateParent: string;
}

/** Creates the disposable writable history copy that one prepared policy may own. */
export async function prepareWritableState(
  files: Readonly<Record<string, string>>
): Promise<WritablePolicyState> {
  const snapshotRoot = await mkdtemp(join(tmpdir(), "vibe-check-history-snapshot-"));
  const stateParent = await mkdtemp(join(tmpdir(), "vibe-check-admission-workbench-"));
  const stateDirectory = join(stateParent, "state");
  try {
    await materializeSnapshot(snapshotRoot, files);
    await cp(snapshotRoot, stateDirectory, { recursive: true, force: false, errorOnExist: true });
    return Object.freeze({ stateDirectory, stateParent });
  } catch (error) {
    await removeWritableState(stateParent);
    throw error;
  } finally {
    await rm(snapshotRoot, { recursive: true, force: true });
  }
}

export async function removeWritableState(stateParent: string): Promise<void> {
  await rm(stateParent, { recursive: true, force: true });
}

async function materializeSnapshot(
  root: string,
  files: Readonly<Record<string, string>>
): Promise<void> {
  for (const [relativePath, content] of Object.entries(files).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    if (!isSafeSnapshotPath(relativePath))
      throw new TypeError("history snapshot path must be a safe relative path");
    const path = join(root, relativePath);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, content, { encoding: "utf8", flag: "wx" });
  }
}

function isSafeSnapshotPath(relativePath: string): boolean {
  return (
    relativePath.length > 0 &&
    !relativePath.startsWith("/") &&
    !relativePath.split("/").some((part) => part === "" || part === "." || part === "..")
  );
}
