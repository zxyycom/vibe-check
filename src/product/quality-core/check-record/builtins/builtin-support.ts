export type RelationId = "changed" | "regression";

export function isInChangedScope(filePath: string, changedFiles: readonly string[]): boolean {
  return changedFiles.some(
    (changedFile) => filePath.includes(changedFile) || changedFile.includes(filePath)
  );
}

export function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
