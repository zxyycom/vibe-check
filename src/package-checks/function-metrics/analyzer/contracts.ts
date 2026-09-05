/**
 * Analyzer-internal TypeScript contracts for reader and token-processor composition.
 * This type-only host seam is erased at runtime: it neither copies nor implements
 * translated Lizard behavior and is intentionally outside translated-source provenance.
 */

import type { FileInfoBuilder } from "./analysis-context.ts";
import type { LizardExtension } from "./extensions/protocol.ts";

export type TokenStream = Iterable<string>;

/** The minimum reader contract used by the in-memory Lizard pipeline. */
export interface AnalyzerReader {
  readonly conditions: ReadonlySet<string>;
  readonly controlFlowKeywords: ReadonlySet<string>;
  readonly logicalOperators: ReadonlySet<string>;
  readonly caseKeywords: ReadonlySet<string>;
  readonly ternaryOperators: ReadonlySet<string>;
  readonly control_flow_keywords: ReadonlySet<string>;
  readonly logical_operators: ReadonlySet<string>;
  readonly case_keywords: ReadonlySet<string>;
  readonly ternary_operators: ReadonlySet<string>;
  readonly ext: readonly string[];
  readonly languages: unknown;
  readonly languageNames: readonly string[];
  /** Source `language_names` alias used by translated internal extensions. */
  readonly language_names: readonly string[];
  readonly extraSubclasses: ReadonlySet<unknown>;
  readonly extra_subclasses: ReadonlySet<unknown>;
  readonly parallelStates: readonly unknown[];
  readonly parallel_states: readonly unknown[];
  readonly context: FileInfoBuilder;
  /** Optional source reader attributes consumed by lizardnd.py. */
  readonly loops?: readonly string[] | ReadonlySet<string>;
  readonly bracket?: string;
  readonly loop_indicator?: string;
  readonly indent_indicator?: string;
  __call__(tokens: TokenStream, reader: AnalyzerReader): TokenStream;
  getCommentFromToken(token: string): string | undefined;
  process(tokens: TokenStream): TokenStream;
  preprocess?(tokens: TokenStream): TokenStream;
}

/** A concrete reader supplies its tokenizer and receives a per-file context. */
export interface ReaderConstructor<Reader extends AnalyzerReader = AnalyzerReader> {
  new (context: FileInfoBuilder): Reader;
  generateTokens(sourceCode: string): TokenStream;
}

/** One source-aligned stage between tokenization and reader state processing. */
export type TokenProcessor = (tokens: TokenStream, reader: AnalyzerReader) => TokenStream;

/** A core processor or one internal Lizard extension processor. */
export type AnalyzerProcessor = TokenProcessor | LizardExtension;
