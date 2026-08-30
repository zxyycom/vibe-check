export function toSlashPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

/** 判断值是否已是跨平台可稳定发布的 project-root-relative slash path。 */
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
