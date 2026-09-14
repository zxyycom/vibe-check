/** Converts a host path spelling to the Product's slash-path form. */
export function toSlashPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

/** Recognizes one stable project-root-relative slash path. */
export function isNormalizedProjectRelativePath(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("\u0000") ||
    /^[A-Za-z]:/u.test(value)
  ) {
    return false;
  }
  return value
    .split("/")
    .every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}
