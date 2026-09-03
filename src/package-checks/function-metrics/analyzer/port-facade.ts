/**
 * Check-private Lizard-domain entry for suffix capability and supplied-source
 * analysis. Product input admission, I/O, cancellation, and metric mapping
 * remain outside the source-aligned port.
 */

import { analyzeSourceCode } from "./core.ts";
import { get_reader_for, languages } from "./reader-registry.ts";

/** A supplied in-memory source accepted by the Lizard-domain façade. */
export interface LizardSourceInput {
  readonly filename: string;
  readonly sourceCode: string;
}

/** The Lizard function fields needed by the private Product adapter. */
export interface LizardFunctionInfo {
  readonly cyclomatic_complexity: number;
  readonly end_line: number;
  readonly filename: string;
  readonly name: string;
  readonly nloc: number;
  readonly parameter_count: number;
  readonly start_line: number;
}

/** In-memory Lizard analysis for one supplied source file. */
export interface LizardSourceAnalysis {
  readonly function_list: readonly LizardFunctionInfo[];
}

/** The source-order suffix set, deduplicated by the registry's case-insensitive matching. */
const LIZARD_SOURCE_EXTENSIONS = Object.freeze([
  ...new Map(
    languages().flatMap((reader) =>
      reader.ext.map((extension) => [extension.toLowerCase(), extension] as const)
    )
  ).values()
]);

/** Returns the fixed source-order suffix capability of the translated Lizard readers. */
export function lizardSourceExtensions(): readonly string[] {
  return LIZARD_SOURCE_EXTENSIONS;
}

/** Whether the translated Lizard registry can analyze this supplied filename. */
export function isLizardSourceSupported(filename: string): boolean {
  return get_reader_for(filename) !== undefined;
}

/**
 * Analyzes one caller-supplied source with the matching translated reader.
 * Unsupported suffixes remain outside the Lizard analysis result instead of
 * being coerced into an empty analysis.
 */
export function analyzeLizardSource(input: LizardSourceInput): LizardSourceAnalysis | undefined {
  const reader = get_reader_for(input.filename);
  if (reader === undefined) return undefined;

  const fileInformation = analyzeSourceCode(input.filename, input.sourceCode, reader);
  return Object.freeze({
    function_list: Object.freeze(
      fileInformation.function_list.map((functionInfo) =>
        Object.freeze({
          cyclomatic_complexity: functionInfo.cyclomatic_complexity,
          end_line: functionInfo.end_line,
          filename: functionInfo.filename,
          name: functionInfo.name,
          nloc: functionInfo.nloc,
          parameter_count: functionInfo.parameter_count,
          start_line: functionInfo.start_line
        })
      )
    )
  });
}
