/**
 * Derived from terryyin/lizard 1.24.0 tests.
 * Sources: test/testBasicFunctionInfo.py, test/testCommentOptions.py,
 * test/test_analyzer.py, test/testOutput.py, lizard.py, and
 * lizard_ext/lizardwordcount.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: parity tests are co-located with their analysis responsibility.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { FileInfoBuilder, NestingStack, type SourceNestingStackLike } from "./analysis-context.ts";
import { collectFunctionInfoDefinitions } from "./extension-output.ts";
import { FileAnalyzer, applyCrossFileProcessors } from "./pipeline.ts";
import { FileInformation, FunctionInfo, type Nesting } from "./analysis-model.ts";
import type { TokenStream } from "./contracts.ts";
import { getExtensions } from "./extensions/registry.ts";
import type { LizardExtension } from "./extensions/protocol.ts";
import { CLikeReader } from "./shared/clike.ts";

describe("Lizard in-memory core", () => {
  it("retains source-named model aliases through a static extension lifecycle", () => {
    const processors = getExtensions([new SourceNamedMetricExtension()]);
    const analyzedFile = new FileAnalyzer(processors).analyzeSourceCode(
      "source-alias.cpp",
      "int source_alias() {}",
      CLikeReader
    );

    assert.deepEqual(
      collectFunctionInfoDefinitions(processors).map((entry) => entry.name),
      ["source_alias_score", "cyclomatic_complexity"]
    );
    const processedFileInfos = applyCrossFileProcessors([analyzedFile], processors);
    if (processedFileInfos === undefined)
      throw new Error("cross-file extension unexpectedly returned undefined");
    assert.deepEqual(
      [...processedFileInfos].map((fileInformation) =>
        fileInformation.function_list.map((functionInfo) => ({
          ccn: functionInfo.cyclomatic_complexity,
          name: functionInfo.name
        }))
      ),
      [[{ ccn: 8, name: "source_alias" }]]
    );

    const suppliedEmptyFunctions: FunctionInfo[] = [];
    const emptyFileInformation = new FileInformation("empty.cpp", 0, suppliedEmptyFunctions);
    suppliedEmptyFunctions.push(analyzedFile.functionList[0]);
    assert.equal(emptyFileInformation.function_list.length, 0);
  });

  it("adapts source-spelled duplicate nesting decorators through FileInfoBuilder", () => {
    const extension = new SourceDuplicateStyleExtension();
    const file = new FileAnalyzer(getExtensions([extension])).analyzeSourceCode(
      "duplicate.cpp",
      "int duplicate(int value) {\n  return value;\n}",
      CLikeReader
    );

    assert.equal(extension.decoratorWasInstalled, true);
    assert.equal(extension.decorator?.decoratedStackWasNestingStack, true);
    assert.deepEqual(
      file.functionList.map((functionInfo) => ({
        ccn: functionInfo.cyclomaticComplexity,
        endLine: functionInfo.endLine,
        name: functionInfo.name,
        nloc: functionInfo.nloc,
        startLine: functionInfo.startLine,
        tokenCount: functionInfo.tokenCount
      })),
      [{ ccn: 1, endLine: 3, name: "duplicate", nloc: 3, startLine: 1, tokenCount: 10 }]
    );
    assert.deepEqual({ nloc: file.nloc, tokenCount: file.tokenCount }, { nloc: 3, tokenCount: 11 });
    assert.deepEqual(extension.decorator?.nestingCalls, [
      ["add_bare_nesting", 0],
      ["pop_nesting", 1]
    ]);
    assert.deepEqual(extension.decorator?.enqueuedTokens, [
      ["int", 1],
      ["duplicate", 1],
      ["(", 1],
      ["int", 1],
      ["value", 1],
      [")", 1],
      ["{", 1],
      ["return", 2],
      ["value", 2],
      [";", 2],
      ["}", 3]
    ]);
  });
});

class SourceNamedMetricExtension {
  public static readonly FUNCTION_INFO = {
    source_alias_score: { caption: " source alias " },
    cyclomatic_complexity: { caption: " CCN " }
  };

  public static *__call__(
    tokens: TokenStream,
    reader: { readonly context: FileInfoBuilder }
  ): Generator<string> {
    reader.context.current_function.cyclomatic_complexity += 0;
    for (const token of tokens) yield token;
  }

  public *cross_file_process(fileInfos: Iterable<FileInformation>): Generator<FileInformation> {
    for (const fileInformation of fileInfos) {
      for (const functionInfo of fileInformation.function_list) {
        functionInfo.cyclomatic_complexity += 7;
      }
      yield fileInformation;
    }
  }
}

class SourceDuplicateStyleNestingStack {
  public readonly nestingCalls: [string, number][] = [];
  public readonly enqueuedTokens: [string, number][] = [];
  public readonly decoratedStackWasNestingStack: boolean;
  private readonly decorated: SourceNestingStackLike;

  public constructor(decorated: SourceNestingStackLike) {
    this.decorated = decorated;
    this.decoratedStackWasNestingStack = decorated instanceof NestingStack;
  }

  public add_bare_nesting(): void {
    this.nestingCalls.push(["add_bare_nesting", this.decorated.current_nesting_level]);
    this.decorated.add_bare_nesting();
  }

  public pop_nesting(): Nesting | undefined {
    this.nestingCalls.push(["pop_nesting", this.decorated.current_nesting_level]);
    return this.decorated.pop_nesting();
  }

  public enqueue_token(token: string, currentLine: number): void {
    this.enqueuedTokens.push([token, currentLine]);
  }
}

class SourceDuplicateStyleExtension implements LizardExtension {
  public decorator: SourceDuplicateStyleNestingStack | undefined;
  public decoratorWasInstalled = false;

  public *__call__(
    tokens: TokenStream,
    reader: { readonly context: FileInfoBuilder }
  ): Generator<string> {
    const decorator = reader.context.decorate_nesting_stack(SourceDuplicateStyleNestingStack);
    this.decorator = decorator;
    this.decoratorWasInstalled = reader.context._nesting_stack === decorator;

    for (const token of tokens) {
      decorator.enqueue_token(token, reader.context.current_line);
      yield token;
    }
  }
}
