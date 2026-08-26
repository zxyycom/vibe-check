import path from "node:path";

import { FILE_SYSTEM } from "./task-contract.ts";
import { walkFiles } from "../../repository-files/files.ts";

const ignoredDirs = new Set(FILE_SYSTEM.ignoredDirs);

export function walkDocumentationFiles(
  directory: string,
  predicate: (filePath: string) => boolean = () => true
): readonly string[] {
  return walkFiles({ ignoredDirs, rootDir: directory })
    .map((relativePath) => path.join(directory, relativePath))
    .filter(predicate);
}
