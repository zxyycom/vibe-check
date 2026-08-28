import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface FileInputFingerprint {
  readonly fileCount: number;
  readonly fileList: readonly string[];
  readonly fingerprint: string;
}

/** Fingerprints one exact path set from stable path order and normalized current file content. */
export function fingerprintProjectFiles(
  rootDir: string,
  paths: readonly string[]
): FileInputFingerprint {
  const sortedPaths = [...paths].sort(compareText);
  const inputDigest = createHash("sha256");

  for (const path of sortedPaths) {
    inputDigest.update(path, "utf8");
    inputDigest.update("\0");
    inputDigest.update(fileContentFingerprint(rootDir, path), "utf8");
    inputDigest.update("\n");
  }

  return Object.freeze({
    fileCount: sortedPaths.length,
    fileList: Object.freeze(sortedPaths.slice(0, 200)),
    fingerprint: `sha256:${inputDigest.digest("hex")}:${sortedPaths.length}`
  });
}

function fileContentFingerprint(rootDir: string, path: string): string {
  try {
    const content = readFileSync(resolve(rootDir, path), "utf8").replace(/\r\n?/g, "\n");
    return createHash("sha256").update(content).digest("hex");
  } catch {
    return "file-not-readable";
  }
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
