/**
 * Derived from terryyin/lizard 1.24.0.
 * Sources: lizard.py processor order, FileAnalyzer, map_files_to_analyzer,
 * analyze_files, and extension lifecycle hooks.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: Apache-2.0
 * Modified: in-memory execution pipeline isolated from state and reporting.
 */

import {
  invokeExtensionCall,
  invokeExtensionCrossFileProcessOutcome,
  invokeExtensionSetArgs
} from "./extensions/protocol.ts";
import type { ExtensionArgumentRegistrar } from "./extensions/protocol.ts";
import type {
  AnalyzerProcessor,
  AnalyzerReader,
  ReaderConstructor,
  TokenProcessor,
  TokenStream
} from "./contracts.ts";
import { FileInfoBuilder } from "./analysis-context.ts";
import type { FileInformation } from "./analysis-model.ts";
import { isPythonWhitespace, splitPythonLines } from "./shared/code-reader.ts";

/** Python str.strip(), as used by the source comment-directive processor. */
function stripPythonWhitespace(value: string): string {
  const characters = Array.from(value);
  let firstCharacter = 0;
  while (
    firstCharacter < characters.length &&
    isPythonWhitespace(characters[firstCharacter] ?? "")
  ) {
    firstCharacter += 1;
  }

  let lastCharacter = characters.length;
  while (
    lastCharacter > firstCharacter &&
    isPythonWhitespace(characters[lastCharacter - 1] ?? "")
  ) {
    lastCharacter -= 1;
  }
  return characters.slice(firstCharacter, lastCharacter).join("");
}

export function preprocessing(tokens: TokenStream, reader: AnalyzerReader): TokenStream {
  return reader.preprocess?.(tokens) ?? withoutWhitespace(tokens);
}

/** Upstream comment directive and generated-code handling. */
export function* commentCounter(tokens: TokenStream, reader: AnalyzerReader): Generator<string> {
  for (const token of tokens) {
    const comment = reader.getCommentFromToken(token);
    if (comment === undefined) {
      yield token;
      continue;
    }

    for (const _line of splitPythonLines(comment).slice(1)) {
      yield "\n";
    }

    const strippedComment = stripPythonWhitespace(comment);
    if (strippedComment.startsWith("#lizard forgive global")) {
      reader.context.forgiveGlobal = true;
    } else if (strippedComment.startsWith("#lizard forgives(")) {
      const metricMatch = /#lizard forgives?\(([^)]*)\)/u.exec(strippedComment);
      if (metricMatch?.[1]) {
        for (const metric of metricMatch[1].split(",")) {
          const trimmedMetric = stripPythonWhitespace(metric);
          if (trimmedMetric) reader.context.currentFunction.forgivenMetrics.add(trimmedMetric);
        }
      }
    } else if (strippedComment.startsWith("#lizard forgive")) {
      reader.context.forgive = true;
    }

    if (comment.includes("GENERATED CODE")) return;
  }
}

/** Upstream non-comment source-line counting. */
export function* lineCounter(tokens: TokenStream, reader: AnalyzerReader): Generator<string> {
  const { context } = reader;
  context.currentLine = 1;
  let newline = 1;

  for (const token of tokens) {
    if (token === "\n") {
      context.currentLine += 1;
      newline = 1;
      continue;
    }

    const embeddedNewlineCount = token.split("\n").length - 1;
    context.currentLine += embeddedNewlineCount;
    context.addNloc(embeddedNewlineCount + newline);
    newline = 0;
    yield token;
  }
}

/** Upstream file and current-function token counting. */
export function* tokenCounter(tokens: TokenStream, reader: AnalyzerReader): Generator<string> {
  const { context } = reader;
  for (const token of tokens) {
    context.fileinfo.tokenCount += 1;
    context.currentFunction.tokenCount += 1;
    yield token;
  }
}

/** Upstream cyclomatic-condition counting. */
export function* conditionCounter(tokens: TokenStream, reader: AnalyzerReader): Generator<string> {
  for (const token of tokens) {
    if (reader.conditions.has(token)) reader.context.addCondition();
    yield token;
  }
}

/** The ordered default processor list from lizard.py:get_extensions. */
export const DEFAULT_TOKEN_PROCESSORS: readonly TokenProcessor[] = Object.freeze([
  preprocessing,
  commentCounter,
  lineCounter,
  tokenCounter,
  conditionCounter
]);

/**
 * Drives the in-memory half of upstream FileAnalyzer.  Reader registry and
 * filesystem decoding stay at the product integration boundary, so callers
 * supply the concrete reader explicitly.
 */
export class FileAnalyzer {
  public readonly processors: readonly AnalyzerProcessor[];

  public constructor(processors: readonly AnalyzerProcessor[] = DEFAULT_TOKEN_PROCESSORS) {
    this.processors = processors;
  }

  public analyzeSourceCode<Reader extends AnalyzerReader>(
    filename: string,
    sourceCode: string,
    Reader: ReaderConstructor<Reader>
  ): FileInformation {
    const context = new FileInfoBuilder(filename);
    const reader = new Reader(context);
    let tokens = Reader.generateTokens(sourceCode);

    try {
      for (const processor of this.processors) tokens = applyProcessor(processor, tokens, reader);
      for (const _token of reader.__call__(tokens, reader)) {
        // The reader drives its state machine while the in-memory pipeline drains.
      }
    } catch (error: unknown) {
      if (!isRecursionLimit(error)) throw error;
    }

    return context.fileinfo;
  }

  /** Source `analyze_source_code` spelling retained for translated extension/core callers. */
  public analyze_source_code<Reader extends AnalyzerReader>(
    filename: string,
    sourceCode: string,
    Reader: ReaderConstructor<Reader>
  ): FileInformation {
    return this.analyzeSourceCode(filename, sourceCode, Reader);
  }
}

/** The source-aligned default analyzer has only the five core processors. */
export const DEFAULT_FILE_ANALYZER = new FileAnalyzer(DEFAULT_TOKEN_PROCESSORS);

/**
 * One already-admitted source unit at the in-memory boundary. File discovery,
 * decoding and reader selection stay outside this source-aligned core.
 */
export interface InMemoryAnalyzerFile {
  readonly filename: string;
  readonly sourceCode: string;
  readonly reader: ReaderConstructor;
}

/**
 * Source-aligned `map_files_to_analyzer` after the explicitly excluded file
 * opening/multiprocessing entry surface has supplied in-memory source units.
 */
export function mapFilesToAnalyzer(
  files: Iterable<InMemoryAnalyzerFile>,
  analyzer: FileAnalyzer,
  workingThreads: number
): Iterable<FileInformation> {
  // The Product owns Worker scheduling. Retain the source argument/lifecycle
  // without creating a second analyzer-level concurrency framework.
  void workingThreads;
  return mapInMemoryFiles(files, analyzer);
}

/** Source `map_files_to_analyzer` spelling for the retained in-memory lifecycle. */
export function map_files_to_analyzer(
  files: Iterable<InMemoryAnalyzerFile>,
  analyzer: FileAnalyzer,
  workingThreads: number
): Iterable<FileInformation> {
  return mapFilesToAnalyzer(files, analyzer, workingThreads);
}

/**
 * Source-aligned `analyze_files` lifecycle. `exts` intentionally uses Python
 * truthiness: an omitted or empty list receives the five default processors.
 */
export function analyzeFiles(
  files: Iterable<InMemoryAnalyzerFile>,
  threads = 1,
  exts?: readonly AnalyzerProcessor[]
): Iterable<FileInformation> | undefined {
  const extensions = exts !== undefined && exts.length > 0 ? exts : [...DEFAULT_TOKEN_PROCESSORS];
  const fileAnalyzer = new FileAnalyzer(extensions);
  let result: Iterable<FileInformation> | undefined = mapFilesToAnalyzer(
    files,
    fileAnalyzer,
    threads
  );
  for (const extension of extensions) {
    const outcome = invokeExtensionCrossFileProcessOutcome(extension, result);
    if (outcome.hookPresent) result = outcome.result;
  }
  return result;
}

/** Source `analyze_files` spelling for translated internal callers. */
export function analyze_files(
  files: Iterable<InMemoryAnalyzerFile>,
  threads = 1,
  exts?: readonly AnalyzerProcessor[]
): Iterable<FileInformation> | undefined {
  return analyzeFiles(files, threads, exts);
}

/**
 * Apply source registration-order cross-file passes. A present hook replaces
 * the stream even when it returns undefined; only an absent hook is skipped.
 */
export function applyCrossFileProcessors(
  fileInfos: Iterable<FileInformation>,
  processors: readonly AnalyzerProcessor[]
): Iterable<FileInformation> | undefined {
  let processedFileInfos: Iterable<FileInformation> | undefined = fileInfos;
  for (const processor of processors) {
    const outcome = invokeExtensionCrossFileProcessOutcome(processor, processedFileInfos);
    if (outcome.hookPresent) processedFileInfos = outcome.result;
  }
  return processedFileInfos;
}

/** Forward the internal parser seam to extensions in source registration order. */
export function registerExtensionArguments(
  processors: readonly AnalyzerProcessor[],
  parser: ExtensionArgumentRegistrar
): void {
  for (const processor of processors) {
    invokeExtensionSetArgs(processor, parser);
  }
}

export function analyzeSourceCode<Reader extends AnalyzerReader>(
  filename: string,
  sourceCode: string,
  Reader: ReaderConstructor<Reader>,
  processors: readonly AnalyzerProcessor[] = DEFAULT_TOKEN_PROCESSORS
): FileInformation {
  if (processors === DEFAULT_TOKEN_PROCESSORS) {
    return DEFAULT_FILE_ANALYZER.analyzeSourceCode(filename, sourceCode, Reader);
  }
  return new FileAnalyzer(processors).analyzeSourceCode(filename, sourceCode, Reader);
}

function* mapInMemoryFiles(
  files: Iterable<InMemoryAnalyzerFile>,
  analyzer: FileAnalyzer
): Generator<FileInformation> {
  for (const file of files) {
    yield analyzer.analyze_source_code(file.filename, file.sourceCode, file.reader);
  }
}
function applyProcessor(
  processor: AnalyzerProcessor,
  tokens: TokenStream,
  reader: AnalyzerReader
): TokenStream {
  return typeof processor === "function"
    ? processor(tokens, reader)
    : invokeExtensionCall(processor, tokens, reader);
}

function isRecursionLimit(error: unknown): boolean {
  return (
    error instanceof RangeError &&
    (error.message.includes("call stack") || error.message.toLowerCase().includes("recursion"))
  );
}

function* withoutWhitespace(tokens: TokenStream): Generator<string> {
  for (const token of tokens) {
    if (!isPythonWhitespace(token) || token === "\n") yield token;
  }
}
