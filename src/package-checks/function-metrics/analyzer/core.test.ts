/**
 * Derived from terryyin/lizard 1.23.0 tests.
 * Sources: test/testBasicFunctionInfo.py, test/testCommentOptions.py,
 * test/test_analyzer.py, test/testOutput.py, lizard.py, and
 * lizard_ext/lizardwordcount.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: minimal TypeScript parity coverage for the in-memory-only core.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  analyze_files,
  analyzeSourceCode,
  applyCrossFileProcessors,
  collectFunctionInfoDefinitions,
  DEFAULT_FILE_ANALYZER,
  FileAnalyzer,
  FileInfoBuilder,
  FileInformation,
  FunctionInfo,
  NestingStack,
  OutputScheme,
  patchFunctionInfoAverages,
  print_extension_results,
  type Nesting,
  type SourceNestingStackLike,
  type TokenStream
} from "./core.ts";
import { getExtensions } from "./extensions/registry.ts";
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

  it("patches FUNCTION_INFO averages for dynamic source-named extension metrics", () => {
    patchFunctionInfoAverages(getExtensions([new SyntheticAverageExtension()]));

    const first = Object.assign(new FunctionInfo("first", "synthetic.cpp", 1), {
      synthetic_metric: 2,
      without_average_caption: 3
    });
    const second = Object.assign(new FunctionInfo("second", "synthetic.cpp", 2), {
      synthetic_metric: 8,
      without_average_caption: 5
    });
    const fileInformation = new FileInformation("synthetic.cpp", 2, [first, second]);
    const emptyFileInformation = new FileInformation("empty.cpp", 0, []);
    const patchedSyntheticAverage: unknown = Reflect.get(
      fileInformation,
      "average_synthetic_metric"
    );
    const patchedUncaptionedAverage: unknown = Reflect.get(
      fileInformation,
      "average_without_average_caption"
    );

    // Fixed-source OutputScheme.patch_for_extensions probe: 2/8 -> 5 and 3/5 -> 4.
    assert.equal(Object.hasOwn(FileInformation.prototype, "average_synthetic_metric"), true);
    assert.throws(
      () => fileInformation.functions_average("missing_metric"),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "AttributeError" &&
        error.message === "'FunctionInfo' object has no attribute 'missing_metric'"
    );
    assert.deepEqual(
      {
        emptyMissingMetric: emptyFileInformation.functions_average("missing_metric"),
        patchedSyntheticAverage,
        patchedUncaptionedAverage,
        sourceDynamicAverage: fileInformation.functions_average("synthetic_metric")
      },
      {
        emptyMissingMetric: 0,
        patchedSyntheticAverage: 5,
        patchedUncaptionedAverage: 4,
        sourceDynamicAverage: 5
      }
    );
  });

  it("retains OutputScheme fields, schema values, and retained formatting lifecycle", () => {
    const extension = new OutputSchemeLifecycleExtension();
    const processors = getExtensions([extension]);
    const scheme = new OutputScheme(processors);
    const functionInfo = Object.assign(new FunctionInfo("f", "f.cpp", 4), {
      custom: 3,
      hidden: 9
    });
    functionInfo.endLine = 7;

    assert.equal(scheme.extensions, processors);
    assert.deepEqual(scheme.items, [
      { caption: "  NLOC  ", value: "nloc", avg_caption: " Avg.NLOC " },
      { caption: "  CCN  ", value: "cyclomatic_complexity", avg_caption: " AvgCCN " },
      { caption: " token ", value: "token_count", avg_caption: " Avg.token " },
      { caption: " PARAM ", value: "parameter_count" },
      { caption: " length ", value: "length" },
      { caption: " custom ", value: "custom", avg_caption: " Avg.custom " },
      { caption: undefined, value: "hidden", avg_caption: undefined },
      { caption: " location  ", value: "location" }
    ]);
    assert.deepEqual(scheme.value_columns(), [
      "nloc",
      "cyclomatic_complexity",
      "token_count",
      "parameter_count",
      "length",
      "custom",
      "hidden",
      "location"
    ]);
    assert.equal(scheme.any_silent(), true);
    assert.equal(scheme.captions(), "  NLOC    CCN   token  PARAM  length  custom  location  ");
    assert.equal(
      scheme.function_info_head(),
      "========================================================\n" +
        "  NLOC    CCN   token  PARAM  length  custom  location  \n" +
        "--------------------------------------------------------"
    );
    assert.equal(scheme.average_captions(), " Avg.NLOC  AvgCCN  Avg.token  Avg.custom ");
    assert.equal(
      scheme.average_formatter(),
      "{module.average_nloc:10.1f}{module.average_cyclomatic_complexity:8.1f}" +
        "{module.average_token_count:11.1f}{module.average_custom:12.1f}"
    );

    const codePointScheme = new OutputScheme([new OutputSchemeCodePointExtension()]);
    // Source lizard.py uses Python `len` (code points) and `str.strip`, rather
    // than JavaScript UTF-16 lengths and String.prototype.trim.
    assert.equal(OutputScheme._head("😀"), "=\n😀\n-");
    assert.equal(
      codePointScheme.average_formatter(),
      "{module.average_nloc:10.1f}{module.average_cyclomatic_complexity:8.1f}" +
        "{module.average_token_count:11.1f}{module.average_code_point_metric:1.1f}"
    );
    assert.ok(codePointScheme.msvs_warning_format().includes("{f.code_point_metric} X"));

    assert.equal(
      scheme.clang_warning_format(),
      "{f.filename}:{f.start_line}: warning: {f.name} has {f.nloc} NLOC, " +
        "{f.cyclomatic_complexity} CCN, {f.token_count} token, {f.parameter_count} PARAM, " +
        "{f.length} length, {f.max_nesting_depth} ND"
    );
    assert.equal(
      new OutputScheme([]).msvs_warning_format(),
      "{f.filename}({f.start_line}): warning: {f.name} ({f.long_name}) has " +
        "{f.nloc} NLOC, {f.cyclomatic_complexity} CCN, {f.token_count} token, " +
        "{f.parameter_count} PARAM, {f.length} length"
    );
    assert.equal(
      scheme.function_info(functionInfo),
      "       1      1      1      0       4       3 f@4-7@f.cpp"
    );
    assert.throws(
      () => scheme.msvs_warning_format(),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "AttributeError" &&
        error.message === "'NoneType' object has no attribute 'strip'"
    );

    scheme.patch_for_extensions();
    const fileInformation = new FileInformation("f.cpp", 1, [functionInfo]);
    const customAverage: unknown = Reflect.get(fileInformation, "average_custom");
    const hiddenAverage: unknown = Reflect.get(fileInformation, "average_hidden");
    assert.deepEqual(
      {
        custom: customAverage,
        hidden: hiddenAverage
      },
      { custom: 3, hidden: 9 }
    );
  });

  it("runs source analyze_files cross-file and print-result hooks in registration order", () => {
    const calls: string[] = [];
    const first = new AnalyzeFilesLifecycleExtension("first", calls);
    const second = new OrderedAnalyzeFilesLifecycleExtension("second", calls);
    const processors = getExtensions([first, second]);
    const scheme = new OutputScheme(processors);
    const result = analyze_files(
      [
        {
          filename: "first.cpp",
          sourceCode: "int first() {}",
          reader: CLikeReader
        },
        {
          filename: "second.cpp",
          sourceCode: "int second() {}",
          reader: CLikeReader
        }
      ],
      2,
      processors
    );

    assert.ok(result !== undefined);
    assert.equal(scheme.any_silent(), true);
    assert.deepEqual(calls, ["cross:second", "cross:first"]);
    assert.deepEqual(
      [...result].flatMap((fileInformation) =>
        fileInformation.function_list.map((functionInfo) => functionInfo.name)
      ),
      ["first", "second"]
    );

    print_extension_results(processors);
    assert.deepEqual(calls, ["cross:second", "cross:first", "print:second", "print:first"]);
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

class SyntheticAverageExtension implements LizardExtension {
  public readonly FUNCTION_INFO = {
    synthetic_metric: { average_caption: " Avg.synthetic ", caption: " synthetic " },
    without_average_caption: { caption: " no-average " }
  };
}

class OutputSchemeLifecycleExtension implements LizardExtension {
  public static readonly FUNCTION_INFO = {
    custom: { average_caption: " Avg.custom ", caption: " custom " },
    hidden: {}
  };
  public static readonly silent_all_others = undefined;

  public *__call__(tokens: TokenStream): Generator<string> {
    yield* tokens;
  }
}

class OutputSchemeCodePointExtension implements LizardExtension {
  public static readonly FUNCTION_INFO = {
    code_point_metric: { average_caption: "😀", caption: "\x1cX\x1c" }
  };
}

class AnalyzeFilesLifecycleExtension implements LizardExtension {
  private readonly label: string;
  private readonly calls: string[];

  public constructor(label: string, calls: string[]) {
    this.label = label;
    this.calls = calls;
  }

  public *__call__(tokens: TokenStream): Generator<string> {
    yield* tokens;
  }

  public cross_file_process(
    fileInfos: Iterable<FileInformation> | undefined
  ): Iterable<FileInformation> | undefined {
    this.calls.push(`cross:${this.label}`);
    return fileInfos;
  }

  public print_result(): void {
    this.calls.push(`print:${this.label}`);
  }
}

class OrderedAnalyzeFilesLifecycleExtension extends AnalyzeFilesLifecycleExtension {
  public static readonly ordering_index = 0;
  public static readonly silent_all_others = false;
}

/**
 * Minimal direct translation of lizardduplicate's dynamic decorator shape:
 * only overridden source-spelled methods are declared; all others arrive via
 * Python __getattr__ and therefore exercise the core adapter.
 */
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
