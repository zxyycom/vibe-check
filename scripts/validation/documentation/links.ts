import fs from "node:fs";
import path from "node:path";

import { FILE_SYSTEM } from "./task-contract.ts";
import { walkDocumentationFiles } from "./repository-files.ts";
import { toDocumentationAbsolutePath, toDocumentationRelativePath } from "./repository-paths.ts";

export function validateMarkdownLinks(report?: (message: string) => void): void {
  const markdownFiles = markdownFilesForLinkValidation();
  const missing: string[] = [];
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;

  for (const filePath of markdownFiles) {
    const text = fs.readFileSync(filePath, "utf8");
    for (const match of text.matchAll(linkPattern)) {
      const rawTarget = match[1]?.trim().replace(/^<|>$/g, "") ?? "";
      if (rawTarget === "" || rawTarget.startsWith("#") || /^(https?|mailto):/i.test(rawTarget)) {
        continue;
      }

      const targetPath = rawTarget.split("#")[0];
      if (targetPath === "") {
        continue;
      }

      const resolved = path.resolve(path.dirname(filePath), targetPath);
      if (!fs.existsSync(resolved)) {
        missing.push(`${toDocumentationRelativePath(filePath)} -> ${rawTarget}`);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`missing markdown links:\n${missing.join("\n")}`);
  }

  report?.(`markdown links ok: ${markdownFiles.length} file(s)`);
}

function markdownFilesForLinkValidation(): string[] {
  const markdownFiles: string[] = [];
  for (const relPath of FILE_SYSTEM.markdownLinkRoots) {
    const absPath = toDocumentationAbsolutePath(relPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`markdown link validation root is missing: ${relPath}`);
    }

    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) {
      markdownFiles.push(
        ...walkDocumentationFiles(absPath, (filePath) =>
          filePath.endsWith(FILE_SYSTEM.markdownExtension)
        )
      );
      continue;
    }

    if (absPath.endsWith(FILE_SYSTEM.markdownExtension)) {
      markdownFiles.push(absPath);
    }
  }

  return [...new Set(markdownFiles)].sort((left, right) =>
    toDocumentationRelativePath(left).localeCompare(toDocumentationRelativePath(right))
  );
}
