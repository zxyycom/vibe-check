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

import {
  analyzeSourceCode,
  applyCrossFileProcessors,
  DEFAULT_FILE_ANALYZER,
  FileAnalyzer
} from "./pipeline.ts";
import { FileInformation } from "./analysis-model.ts";
import type { TokenStream } from "./contracts.ts";
import type { LizardExtension } from "./extensions/protocol.ts";
import { CLikeReader } from "./shared/clike.ts";

describe("Lizard in-memory core", () => {
  it("preserves basic C-like function information, NLOC, CCN, and parameters", () => {
    const file = analyzeSourceCode(
      "basic.cpp",
      "int fun(int alpha, char beta){\nif(alpha && beta){ return alpha; }\nreturn 0;\n}",
      CLikeReader
    );

    assert.deepEqual(
      file.functionList.map((functionInfo) => ({
        ccn: functionInfo.cyclomaticComplexity,
        endLine: functionInfo.endLine,
        longName: functionInfo.longName,
        name: functionInfo.name,
        nloc: functionInfo.nloc,
        parameters: functionInfo.parameters,
        startLine: functionInfo.startLine,
        tokenCount: functionInfo.tokenCount
      })),
      [
        {
          ccn: 3,
          endLine: 4,
          longName: "fun( int alpha , char beta)",
          name: "fun",
          nloc: 4,
          parameters: ["alpha", "beta"],
          startLine: 1,
          tokenCount: 24
        }
      ]
    );
    assert.deepEqual({ nloc: file.nloc, tokenCount: file.tokenCount }, { nloc: 4, tokenCount: 25 });
  });

  it("keeps comment directives and generated-code stopping in upstream processor order", () => {
    const forgiven = analyzeSourceCode(
      "forgiven.cpp",
      "int fun(int alpha){ /* #lizard forgives(length, parameter_count) */ if(alpha)return 1;}",
      CLikeReader
    );
    const forgivenFunction = forgiven.functionList[0];
    assert.ok(forgivenFunction);
    assert.deepEqual([...forgivenFunction.forgivenMetrics], ["length", "parameter_count"]);

    const c0InformationSeparatorForgiven = analyzeSourceCode(
      "c0-information-separator.cpp",
      "/*\x1c#lizard forgive */ int f(){}",
      CLikeReader
    );
    assert.deepEqual(c0InformationSeparatorForgiven.functionList, []);

    const bomPrefixedDirectiveIgnored = analyzeSourceCode(
      "bom-prefixed-directive.cpp",
      "/*\ufeff#lizard forgive */ int f(){}",
      CLikeReader
    );
    assert.deepEqual(
      bomPrefixedDirectiveIgnored.functionList.map((functionInfo) => functionInfo.name),
      ["f"]
    );

    const generated = analyzeSourceCode(
      "generated.cpp",
      "int ignored() {}\n// GENERATED CODE\nint after() {}",
      CLikeReader
    );
    assert.deepEqual(
      generated.functionList.map((functionInfo) => ({
        endLine: functionInfo.endLine,
        name: functionInfo.name,
        nloc: functionInfo.nloc,
        startLine: functionInfo.startLine
      })),
      [{ endLine: 1, name: "ignored", nloc: 1, startLine: 1 }]
    );
  });

  it("matches Python splitlines and whitespace token distinctions in the core pipeline", () => {
    assert.deepEqual(measure("/*comment\u2028still*/int f(){}"), {
      fileNloc: 1,
      fileTokenCount: 6,
      functions: [{ ccn: 1, endLine: 2, name: "f", nloc: 1, startLine: 2, tokenCount: 5 }]
    });
    assert.deepEqual(measure("int f(){\x1c return 0;}"), {
      fileNloc: 1,
      fileTokenCount: 9,
      functions: [{ ccn: 1, endLine: 1, name: "f", nloc: 1, startLine: 1, tokenCount: 8 }]
    });
    assert.deepEqual(measure("int f(){\ufeff return 0;}"), {
      fileNloc: 1,
      fileTokenCount: 10,
      functions: [{ ccn: 1, endLine: 1, name: "f", nloc: 1, startLine: 1, tokenCount: 9 }]
    });
  });

  it("propagates an explicit undefined cross-file result instead of treating it as an absent hook", () => {
    const observedInputs: unknown[] = [];
    const result = applyCrossFileProcessors(
      [new FileInformation("source.cpp", 1)],
      [new UndefinedCrossFileExtension(), new ObservingCrossFileExtension(observedInputs)]
    );

    // Fixed-source lizard.py directly assigns `result = extension.cross_file_process(result)`.
    assert.equal(result, undefined);
    assert.deepEqual(observedInputs, [undefined]);
  });

  it("keeps FileAnalyzer's default no-extension processor pipeline equivalent to the direct source helper", () => {
    const sourceCode =
      "int default_pipeline(int value) { if (value > 0) return value; return 0; }\n";
    const defaultFile = DEFAULT_FILE_ANALYZER.analyzeSourceCode(
      "default.cpp",
      sourceCode,
      CLikeReader
    );
    const constructedFile = new FileAnalyzer().analyzeSourceCode(
      "default.cpp",
      sourceCode,
      CLikeReader
    );
    const helperFile = analyzeSourceCode("default.cpp", sourceCode, CLikeReader);

    const measurement = (file: typeof defaultFile): object => ({
      fileNloc: file.nloc,
      fileTokenCount: file.tokenCount,
      functions: file.functionList.map((functionInfo) => ({
        ccn: functionInfo.cyclomaticComplexity,
        endLine: functionInfo.endLine,
        name: functionInfo.name,
        nloc: functionInfo.nloc,
        parameterCount: functionInfo.parameterCount,
        startLine: functionInfo.startLine,
        tokenCount: functionInfo.tokenCount
      }))
    });

    assert.deepEqual(measurement(defaultFile), {
      fileNloc: 1,
      fileTokenCount: 20,
      functions: [
        {
          ccn: 2,
          endLine: 1,
          name: "default_pipeline",
          nloc: 1,
          parameterCount: 1,
          startLine: 1,
          tokenCount: 19
        }
      ]
    });
    assert.deepEqual(measurement(constructedFile), measurement(defaultFile));
    assert.deepEqual(measurement(helperFile), measurement(defaultFile));
  });
});

function measure(sourceCode: string): {
  readonly fileNloc: number;
  readonly fileTokenCount: number;
  readonly functions: readonly {
    readonly ccn: number;
    readonly endLine: number;
    readonly name: string;
    readonly nloc: number;
    readonly startLine: number;
    readonly tokenCount: number;
  }[];
} {
  const fileInformation = analyzeSourceCode("source.cpp", sourceCode, CLikeReader);
  return {
    fileNloc: fileInformation.nloc,
    fileTokenCount: fileInformation.tokenCount,
    functions: fileInformation.functionList.map((functionInfo) => ({
      ccn: functionInfo.cyclomaticComplexity,
      endLine: functionInfo.endLine,
      name: functionInfo.name,
      nloc: functionInfo.nloc,
      startLine: functionInfo.startLine,
      tokenCount: functionInfo.tokenCount
    }))
  };
}

class UndefinedCrossFileExtension implements LizardExtension {
  public *__call__(tokens: TokenStream): Generator<string> {
    yield* tokens;
  }

  public cross_file_process(): undefined {
    return undefined;
  }
}

class ObservingCrossFileExtension implements LizardExtension {
  private readonly observedInputs: unknown[];

  public constructor(observedInputs: unknown[]) {
    this.observedInputs = observedInputs;
  }

  public *__call__(tokens: TokenStream): Generator<string> {
    yield* tokens;
  }

  public cross_file_process(fileInfos: Iterable<FileInformation>): Iterable<FileInformation> {
    this.observedInputs.push(fileInfos);
    return fileInfos;
  }
}
