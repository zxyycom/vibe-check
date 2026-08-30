/** Lizard 1.23.0 官方 language readers 支持的 exact input 扩展名。 */
const LIZARD_SUPPORTED_FILE_EXTENSIONS = Object.freeze([
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
] as const);

const LIZARD_SUPPORTED_FILE_EXTENSION_SET: ReadonlySet<string> = new Set(
  LIZARD_SUPPORTED_FILE_EXTENSIONS
);

/** functionMetrics 默认 files.include 使用的 case-insensitive extension globs。 */
export const LIZARD_SUPPORTED_FILE_GLOBS = Object.freeze(
  LIZARD_SUPPORTED_FILE_EXTENSIONS.map(
    (extension) => `**/*.${caseInsensitiveExtensionPattern(extension)}`
  )
);

export function isLizardTarget(filePath: string): boolean {
  const extensionSeparator = filePath.lastIndexOf(".");
  if (extensionSeparator < 0) return false;
  const extension = filePath.slice(extensionSeparator + 1).toLowerCase();
  return LIZARD_SUPPORTED_FILE_EXTENSION_SET.has(extension);
}

function caseInsensitiveExtensionPattern(extension: string): string {
  return extension
    .split("")
    .map((character) =>
      /[a-z]/u.test(character) ? `[${character}${character.toUpperCase()}]` : character
    )
    .join("");
}
