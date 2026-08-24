import { isAbsolute, relative, resolve, sep } from "node:path";

export function toSlashPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

/** Returns whether a path is strictly contained by a resolved parent directory. */
export function isPathWithin(parentDirectory: string, candidatePath: string): boolean {
  const relativePath = relative(resolve(parentDirectory), resolve(candidatePath));
  return (
    relativePath.length > 0 &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}
