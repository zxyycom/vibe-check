import fs from "node:fs";

import { FILE_SYSTEM } from "../task-contract.ts";
import { readTextFile } from "../../../repository-files/files.ts";
import { parseJsonValue } from "./value.ts";
import type { JsonValue } from "./value.ts";
import { walkDocumentationFiles } from "../repository-files.ts";
import { toDocumentationAbsolutePath, toDocumentationRelativePath } from "../repository-paths.ts";

export function readJson(relPath: string): JsonValue {
  return parseJsonValue({
    label: `${relPath} JSON`,
    source: readTextFile(toDocumentationAbsolutePath(relPath))
  });
}

export function listExampleJson(pattern: RegExp): string[] {
  return fs
    .readdirSync(toDocumentationAbsolutePath(FILE_SYSTEM.examplesJsonDir))
    .filter((name) => pattern.test(name))
    .map((name) => `${FILE_SYSTEM.examplesJsonDir}/${name}`)
    .sort();
}

export function listSchemaJson(): string[] {
  return walkDocumentationFiles(toDocumentationAbsolutePath(FILE_SYSTEM.schemasDir), (filePath) =>
    filePath.endsWith(FILE_SYSTEM.schemaExtension)
  )
    .map(toDocumentationRelativePath)
    .sort();
}
