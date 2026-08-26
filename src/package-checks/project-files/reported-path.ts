import path from "node:path";

import { toSlashPath } from "../host-environment/path.ts";

export function normalizeScannerReportedPath(reportedPath: string, projectRoot: string): string {
  const normalizedReportedPath = stripWindowsExtendedPathPrefix(reportedPath);
  const normalizedProjectRoot = stripWindowsExtendedPathPrefix(projectRoot);
  const pathApi = pathApiForScannerPath(normalizedReportedPath, normalizedProjectRoot);
  const nativePath = pathApi.normalize(normalizedReportedPath);
  const projectRelativePath = pathApi.isAbsolute(nativePath)
    ? pathApi.relative(pathApi.normalize(normalizedProjectRoot), nativePath)
    : nativePath;

  return toSlashPath(projectRelativePath);
}

function stripWindowsExtendedPathPrefix(filePath: string): string {
  if (filePath.startsWith("\\\\?\\UNC\\")) {
    return `\\\\${filePath.slice(8)}`;
  }
  if (filePath.startsWith("\\\\?\\")) {
    return filePath.slice(4);
  }
  return filePath;
}

function pathApiForScannerPath(reportedPath: string, projectRoot: string): path.PlatformPath {
  return isWindowsAbsolutePath(reportedPath) || isWindowsAbsolutePath(projectRoot)
    ? path.win32
    : path;
}

function isWindowsAbsolutePath(filePath: string): boolean {
  return /^[A-Za-z]:[\\/]/u.test(filePath) || filePath.startsWith("\\\\");
}
