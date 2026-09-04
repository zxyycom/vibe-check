import { relative, resolve, sep } from "node:path";

import { isSafeDiagnosticPresentation } from "../../../../diagnostic-safety.ts";

const OWNER_PUBLISHED_PATH = /^[A-Za-z0-9._/-]+$/u;

/** Normalizes an externally reported path into one safe path below the bound workspace root. */
export function safeWorkspaceRelativePath(
  workspaceRoot: string,
  reportedPath: unknown
): string | undefined {
  if (!isSafeDiagnosticPresentation(reportedPath)) return undefined;
  const root = resolve(workspaceRoot);
  const resolvedPath = resolve(root, reportedPath);
  const path = relative(root, resolvedPath).split(sep).join("/");
  return isSafeRelativePosixPath(path) && OWNER_PUBLISHED_PATH.test(path) ? path : undefined;
}

function isSafeRelativePosixPath(value: string): boolean {
  return (
    value.length > 0 &&
    value === value.trim() &&
    !value.startsWith("../") &&
    !value.includes("\\") &&
    !value.includes("\0") &&
    value !== "." &&
    value !== ".." &&
    !value.endsWith("/")
  );
}
