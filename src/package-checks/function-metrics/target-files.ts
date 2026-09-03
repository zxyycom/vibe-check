import {
  FUNCTION_METRICS_SUPPORTED_FILE_EXTENSIONS,
  isFunctionMetricsAnalyzerSourceSupported
} from "./analyzer-adapter.ts";

/** functionMetrics default files.include uses the adapter's case-insensitive suffix capability. */
export const FUNCTION_METRICS_SUPPORTED_FILE_GLOBS = Object.freeze(
  FUNCTION_METRICS_SUPPORTED_FILE_EXTENSIONS.map(
    (extension) => `**/*.${caseInsensitiveExtensionPattern(extension)}`
  )
);

/** Whether an exact project-relative path has a translated analyzer reader. */
export function isFunctionMetricsTarget(filePath: string): boolean {
  return isFunctionMetricsAnalyzerSourceSupported(filePath);
}

function caseInsensitiveExtensionPattern(extension: string): string {
  return extension
    .split("")
    .map((character) =>
      /[a-z]/u.test(character) ? `[${character}${character.toUpperCase()}]` : character
    )
    .join("");
}
