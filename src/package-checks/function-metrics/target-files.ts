import { getReaderFor, languages } from "./analyzer/reader-registry.ts";

/** Product-owned analyzer registry extensions drive both default selection and admission. */
const FUNCTION_METRICS_SUPPORTED_FILE_EXTENSIONS = Object.freeze([
  ...new Map(
    languages().flatMap((reader) =>
      reader.ext.map((extension) => [extension.toLowerCase(), extension] as const)
    )
  ).values()
]);

/** functionMetrics default files.include uses the analyzer's case-insensitive suffix set. */
export const FUNCTION_METRICS_SUPPORTED_FILE_GLOBS = Object.freeze(
  FUNCTION_METRICS_SUPPORTED_FILE_EXTENSIONS.map(
    (extension) => `**/*.${caseInsensitiveExtensionPattern(extension)}`
  )
);

/** Whether an exact project-relative path has a translated analyzer reader. */
export function isFunctionMetricsTarget(filePath: string): boolean {
  return getReaderFor(filePath) !== undefined;
}

function caseInsensitiveExtensionPattern(extension: string): string {
  return extension
    .split("")
    .map((character) =>
      /[a-z]/u.test(character) ? `[${character}${character.toUpperCase()}]` : character
    )
    .join("");
}
