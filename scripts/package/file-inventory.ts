import { existsSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

export function collectFilePaths(
  root: string,
  include: (relativePath: string) => boolean
): readonly string[] {
  if (!existsSync(root)) return Object.freeze([]);
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const filePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(filePath);
      } else if (entry.isFile()) {
        const relativePath = relative(root, filePath).split(sep).join("/");
        if (include(relativePath)) files.push(filePath);
      }
    }
  };
  visit(root);
  return Object.freeze(files.sort());
}

/** Collects the authoritative Product implementation files that belong in an artifact. */
export function collectRuntimeSourceFilePaths(sourceRoot: string): readonly string[] {
  return collectFilePaths(
    sourceRoot,
    (relativePath) =>
      relativePath.endsWith(".ts") &&
      !relativePath.endsWith(".test.ts") &&
      !relativePath.endsWith(".test-support.ts") &&
      !relativePath.endsWith("bun-test.d.ts")
  );
}
