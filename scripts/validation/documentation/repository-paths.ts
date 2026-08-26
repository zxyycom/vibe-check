import path from "node:path";
import { fileURLToPath } from "node:url";

import { toSlashPath } from "../../repository-files/paths.ts";

const documentationRepositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);

export function toDocumentationAbsolutePath(relativePath: string): string {
  return path.join(documentationRepositoryRoot, relativePath);
}

export function toDocumentationRelativePath(absolutePath: string): string {
  return toSlashPath(path.relative(documentationRepositoryRoot, absolutePath));
}
