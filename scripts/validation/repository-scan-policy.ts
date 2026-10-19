/** Directory names excluded from repository validation scans, not traversal defaults. */
export const REPOSITORY_SCAN_IGNORED_DIRECTORIES: readonly string[] = Object.freeze([
  ".git",
  ".codegraph",
  ".cache",
  ".log",
  ".tmp",
  "artifacts",
  "node_modules",
  "target",
  ".venv",
  "dist",
  "build"
]);
