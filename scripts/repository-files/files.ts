import fs from "node:fs";
import path from "node:path";

import { errorMessage } from "../error-message.ts";
import { toSlashPath } from "./paths.ts";

export type WriteTextFileInput = {
  readonly content: string;
  readonly filePath: string;
};

export type WalkFilesInput = {
  readonly ignoredDirs?: Iterable<string>;
  readonly rootDir: string;
};

export function ensureDirForFile(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function readTextFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

export function writeTextFile({ content, filePath }: WriteTextFileInput): void {
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, content, "utf8");
}

export function walkFiles({
  ignoredDirs: ignoredDirectoryNames,
  rootDir
}: WalkFilesInput): readonly string[] {
  const ignoredDirs = new Set(ignoredDirectoryNames ?? []);
  const results: string[] = [];

  const visit = (subDir: string) => {
    const currentDir = subDir ? path.join(rootDir, subDir) : rootDir;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (error: unknown) {
      throw new Error(`could not read directory ${currentDir}: ${errorMessage(error)}`, {
        cause: error
      });
    }

    for (const entry of entries) {
      const relPath = subDir ? `${subDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) {
          visit(relPath);
        }
      } else if (entry.isFile()) {
        results.push(toSlashPath(relPath));
      }
    }
  };

  visit("");
  return Object.freeze(results.sort());
}
