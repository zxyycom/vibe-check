/** Lizard 1.23.0 官方 language readers 支持的 exact input 扩展名。 */
const LIZARD_SUPPORTED_FILE_EXTENSIONS: ReadonlySet<string> = new Set([
  "c",
  "cc",
  "cjs",
  "cpp",
  "cs",
  "cxx",
  "erl",
  "es",
  "escript",
  "f",
  "f03",
  "f08",
  "f70",
  "f90",
  "f95",
  "for",
  "fpp",
  "ftn",
  "gd",
  "go",
  "h",
  "hpp",
  "hrl",
  "java",
  "js",
  "jsx",
  "kt",
  "kts",
  "lua",
  "m",
  "mjs",
  "mm",
  "pck",
  "php",
  "pkb",
  "pks",
  "pl",
  "plb",
  "pls",
  "pm",
  "py",
  "r",
  "rb",
  "rs",
  "scala",
  "sol",
  "sql",
  "st",
  "swift",
  "ts",
  "ttcn",
  "ttcnpp",
  "tsx",
  "vue",
  "zig"
]);

export function selectLizardTargetFiles(files: readonly string[]): string[] {
  return files.filter(isLizardTarget);
}

function isLizardTarget(filePath: string): boolean {
  const extensionSeparator = filePath.lastIndexOf(".");
  if (extensionSeparator < 0) return false;
  const extension = filePath.slice(extensionSeparator + 1).toLowerCase();
  return LIZARD_SUPPORTED_FILE_EXTENSIONS.has(extension);
}
