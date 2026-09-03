/**
 * Check-private Lizard-domain entry for suffix capability and supplied-source
 * analysis. Product input admission, I/O, cancellation, and metric mapping
 * remain outside the source-aligned port.
 */

import { analyzeSourceCode } from "./core.ts";
import { get_reader_for, languages, type RegisteredReader } from "./reader-registry.ts";

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

const readerByAsciiSuffix = new Map<string, RegisteredReader>();
const extensionByCanonicalSuffix = new Map<string, string>();
for (const reader of languages()) {
  for (const extension of reader.ext) {
    const canonicalSuffix = extension.toLowerCase();
    if (!readerByAsciiSuffix.has(canonicalSuffix)) {
      readerByAsciiSuffix.set(canonicalSuffix, reader);
    }
    extensionByCanonicalSuffix.set(canonicalSuffix, extension);
  }
}

/** Source-order, first-wins resolver index; its contents remain private to this host seam. */
const LIZARD_READER_BY_ASCII_SUFFIX: ReadonlyMap<string, RegisteredReader> = readerByAsciiSuffix;

/** The source-order suffix set, deduplicated by the registry's case-insensitive matching. */
const LIZARD_SOURCE_EXTENSIONS = Object.freeze([...extensionByCanonicalSuffix.values()]);

/** Returns the fixed source-order suffix capability of the translated Lizard readers. */
export function lizardSourceExtensions(): readonly string[] {
  return LIZARD_SOURCE_EXTENSIONS;
}

/** Whether the translated Lizard registry can analyze this supplied filename. */
export function isLizardSourceSupported(filename: string): boolean {
  return resolveLizardReader(filename) !== undefined;
}

/**
 * Analyzes one caller-supplied source with the matching translated reader.
 * Unsupported suffixes remain outside the Lizard analysis result instead of
 * being coerced into an empty analysis.
 */
export function analyzeLizardSource(input: LizardSourceInput): LizardSourceAnalysis | undefined {
  const reader = resolveLizardReader(input.filename);
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

/**
 * Keep source-order regex lookup for every filename shape outside the small,
 * proven ASCII suffix grammar. The fast index is a façade-only host seam, not
 * a second reader registry or a Product-facing reader capability.
 */
function resolveLizardReader(filename: string): RegisteredReader | undefined {
  const suffix = asciiAlphanumericFinalSuffix(filename);
  return suffix === undefined
    ? get_reader_for(filename)
    : LIZARD_READER_BY_ASCII_SUFFIX.get(suffix);
}

/**
 * Accept only full ASCII filenames without JavaScript line terminators and
 * with an ASCII-alphanumeric final suffix. Everything else keeps the source
 * registry's `/iu` semantics through the fallback above.
 */
function asciiAlphanumericFinalSuffix(filename: string): string | undefined {
  let finalDot = -1;
  for (let index = 0; index < filename.length; index += 1) {
    const character = filename.charCodeAt(index);
    if (character > 0x7f || character === 0x0a || character === 0x0d) return undefined;
    if (character === 0x2e) finalDot = index;
  }

  if (finalDot === -1 || finalDot === filename.length - 1) return undefined;

  let suffix = "";
  for (let index = finalDot + 1; index < filename.length; index += 1) {
    const character = filename.charCodeAt(index);
    const isAsciiDigit = character >= 0x30 && character <= 0x39;
    const isAsciiLowercase = character >= 0x61 && character <= 0x7a;
    const isAsciiUppercase = character >= 0x41 && character <= 0x5a;
    if (!isAsciiDigit && !isAsciiLowercase && !isAsciiUppercase) return undefined;
    suffix += String.fromCharCode(isAsciiUppercase ? character + 0x20 : character);
  }
  return suffix;
}
