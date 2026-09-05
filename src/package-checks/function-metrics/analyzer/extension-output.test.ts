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
  OutputScheme,
  patchFunctionInfoAverages,
  print_extension_results
} from "./extension-output.ts";
import { analyze_files } from "./pipeline.ts";
import { FileInformation, FunctionInfo } from "./analysis-model.ts";
import type { TokenStream } from "./contracts.ts";
import { getExtensions } from "./extensions/registry.ts";
import type { LizardExtension } from "./extensions/protocol.ts";
import { CLikeReader } from "./shared/clike.ts";

describe("Lizard in-memory core", () => {
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
});

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
