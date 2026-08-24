import path from "node:path";

import { FILE_SYSTEM } from "../docs-contract.ts";
import { walkFiles } from "../../foundation/fs.ts";

const ignoredDirs = new Set(FILE_SYSTEM.ignoredDirs);

export function walk(dir: string, predicate: (filePath: string) => boolean = () => true): string[] {
  return walkFiles({ ignoredDirs, rootDir: dir })
    .map((relPath) => path.join(dir, relPath))
    .filter(predicate);
}
