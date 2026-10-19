import path from "node:path";

import { REPOSITORY_SCAN_IGNORED_DIRECTORIES } from "../repository-scan-policy.ts";
import { walkFiles } from "../../repository-files/files.ts";

const ignoredDirs = new Set(REPOSITORY_SCAN_IGNORED_DIRECTORIES);

export function walkDocumentationFiles(
  directory: string,
  predicate: (filePath: string) => boolean = () => true
): readonly string[] {
  return walkFiles({ ignoredDirs, rootDir: directory })
    .map((relativePath) => path.join(directory, relativePath))
    .filter(predicate);
}
