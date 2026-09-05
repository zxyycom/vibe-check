/**
 * Derived from terryyin/lizard 1.24.0 tests.
 * Sources: test/testExtension.py, test/testCPreprocessorExtension.py,
 * lizard_ext/extension_base.py, and lizard_ext/lizardwordcount.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: focused internal extension-protocol parity coverage.
 */

import { strict as assert } from "node:assert";
import test from "node:test";

import { applyCrossFileProcessors, FileAnalyzer, registerExtensionArguments } from "../pipeline.ts";
import { FileInfoBuilder, type NestingStackLike } from "../analysis-context.ts";
import { FileInformation } from "../analysis-model.ts";
import { OutputScheme, printExtensionResults } from "../extension-output.ts";
import type { AnalyzerProcessor, AnalyzerReader, TokenStream } from "../contracts.ts";
import { CLikeReader } from "../shared/clike.ts";
import { ExtensionBase } from "./extension-base.ts";
import { DEFAULT_ND_THRESHOLD, LizardExtension as NestingDepthExtension } from "./lizardnd.ts";
import { DeferredExtensionBodyError, EXTENSION_REGISTRATIONS, getExtensions } from "./registry.ts";
import {
  extensionMetadata,
  invokeExtensionCall,
  invokeExtensionCrossFileProcess,
  invokeExtensionPrintResult,
  invokeExtensionSetArgs,
  type ExtensionArgumentRegistrar,
  type LizardExtension
} from "./protocol.ts";

test("internal extensions preserve default processor order plus object/class ordering_index registration", () => {
  const appended = new AppendedExtension();
  const indexed = new IndexedExtension();
  const processors = getExtensions([appended, indexed, new NegativeIndexedExtension()]);

  assert.deepEqual(processors.map(processorName), [
    "indexed",
    "preprocessing",
    "commentCounter",
    "lineCounter",
    "tokenCounter",
    "conditionCounter",
    "negative-indexed",
    "appended"
  ]);
  assert.equal(processors[0], indexed);
  assert.ok(processors.at(-1) === appended);

  let constructorCalls = 0;
  class DirectlyRegisteredClass {
    public static readonly ordering_index = 1;

    public constructor() {
      constructorCalls += 1;
    }
  }
  const directClassProcessors = getExtensions([DirectlyRegisteredClass]);
  // Fixed-source lizard.py:get_extensions retained the direct class at index 1 without constructing it.
  assert.equal(directClassProcessors[1], DirectlyRegisteredClass);
  assert.equal(constructorCalls, 0);

  const staticArgumentCalls: unknown[][] = [];
  registerExtensionArguments(processors, {
    add_argument(...arguments_: unknown[]): void {
      staticArgumentCalls.push(arguments_);
    }
  });
  assert.deepEqual(staticArgumentCalls, [["indexed-static"]]);
  const scheme = new OutputScheme(processors);
  assert.deepEqual(
    [...scheme._ext_member_info()].map(([_caption, name]) => name),
    ["indexed_static_count"]
  );
  assert.equal(scheme.any_silent(), true);
});

test("Lizard static extension hooks resolve after instance lookup with a wordcount-style class", () => {
  const instanceFirstCalls: string[] = [];
  const instanceFirst = new InstanceFirstExtension(instanceFirstCalls);
  const instanceFirstReader = new CLikeReader(new FileInfoBuilder("instance-priority.cpp"));
  const staticCalls: string[] = [];
  const registeredStaticInstance = StaticWordcountStyleExtension.withCalls(staticCalls);
  const processors = getExtensions([registeredStaticInstance]);
  const staticExtension = processors.at(-1);

  assert.equal(staticExtension, registeredStaticInstance);
  assert.deepEqual(
    [...invokeExtensionCall(instanceFirst, ["instance-token"], instanceFirstReader)],
    ["instance-token"]
  );
  assert.deepEqual([...(invokeExtensionCrossFileProcess(instanceFirst, []) ?? [])], []);
  invokeExtensionPrintResult(instanceFirst);
  invokeExtensionSetArgs(instanceFirst, noOpArgumentRegistrar);
  assert.deepEqual(instanceFirstCalls, [
    "instance:call",
    "instance:cross",
    "instance:print",
    "instance:args"
  ]);

  const file = new FileAnalyzer(processors).analyzeSourceCode(
    "static-wordcount.cpp",
    "int static_wordcount() {}",
    CLikeReader
  );
  registerExtensionArguments(processors, noOpArgumentRegistrar);
  const staticallyProcessedFiles = applyCrossFileProcessors([file], processors);
  assert.ok(staticallyProcessedFiles !== undefined);
  assert.deepEqual([...staticallyProcessedFiles], [file]);
  printExtensionResults(processors);
  assert.deepEqual(staticCalls, ["static:call", "static:args", "static:cross", "static:print"]);
});

test("extension descriptor lookup gives subclass statics MRO priority and same-instance members priority", () => {
  const calls: string[] = [];

  class BaseInstanceDescriptorExtension implements LizardExtension {
    public set_args(_parser: ExtensionArgumentRegistrar): void {
      calls.push("base-instance");
    }
  }

  class SubclassStaticDescriptorExtension extends BaseInstanceDescriptorExtension {
    public static set_args(_parser: ExtensionArgumentRegistrar): void {
      calls.push("subclass-static");
    }
  }

  const extension = new SubclassStaticDescriptorExtension();
  invokeExtensionSetArgs(extension, noOpArgumentRegistrar);
  Object.defineProperty(extension, "set_args", {
    configurable: true,
    value: (): void => {
      calls.push("own-instance");
    }
  });
  invokeExtensionSetArgs(extension, noOpArgumentRegistrar);

  // Fixed-source lizard.py's hasattr/ext.set_args seam produced these two events in this order.
  assert.deepEqual(calls, ["subclass-static", "own-instance"]);
});

test("extension call lookup ignores instance-own __call__ while ordinary hooks use it", () => {
  const calls: string[] = [];

  class SpecialCallLookupExtension implements LizardExtension {
    public *__call__(tokens: TokenStream, _reader: AnalyzerReader): Generator<string> {
      calls.push(this === extension ? "prototype-call:receiver" : "prototype-call:wrong");
      yield* tokens;
    }

    public set_args(_parser: ExtensionArgumentRegistrar): void {
      calls.push("prototype-set-args");
    }
  }

  const extension = new SpecialCallLookupExtension();
  Object.defineProperties(extension, {
    __call__: {
      value: function* ownCall(
        this: unknown,
        tokens: TokenStream,
        _reader: AnalyzerReader
      ): Generator<string> {
        calls.push("own-call");
        yield* tokens;
      }
    },
    set_args: {
      value: function ownSetArgs(this: unknown, _parser: ExtensionArgumentRegistrar): void {
        calls.push(this === extension ? "own-set-args:receiver" : "own-set-args:wrong");
      }
    }
  });

  const reader = new CLikeReader(new FileInfoBuilder("special-call.cpp"));
  assert.deepEqual([...invokeExtensionCall(extension, ["token"], reader)], ["token"]);
  invokeExtensionSetArgs(extension, noOpArgumentRegistrar);

  // Fixed clone lizard.py:612 direct-call probe ignored instance.__call__, but ext.set_args used it.
  assert.deepEqual(calls, ["prototype-call:receiver", "own-set-args:receiver"]);
});

test("extension registration rejects non-Python-compatible ordering indexes", () => {
  for (const orderingIndex of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    1.5
  ]) {
    assert.throws(
      () => getExtensions([new InvalidOrderingIndexExtension(orderingIndex)]),
      (error: unknown) =>
        error instanceof RangeError &&
        error.message ===
          `Invalid Lizard extension ordering_index '${String(orderingIndex)}'; expected a finite integer.`
    );
  }
});

test("extension ordering accepts exact non-safe integers with Python list.insert clamping", () => {
  const positive = new InvalidOrderingIndexExtension(2 ** 53);
  const negative = new InvalidOrderingIndexExtension(-(2 ** 53));

  // Fixed-source lizard.py:get_extensions probes place +2**53 after five defaults and -2**53 first.
  assert.equal(getExtensions([positive]).indexOf(positive), 5);
  assert.equal(getExtensions([negative]).indexOf(negative), 0);
});

test("invalid subclass static metadata shadows inherited instance metadata instead of falling back", () => {
  class BaseOrderingMetadataExtension implements LizardExtension {
    public get ordering_index(): number {
      return 1;
    }
  }

  class InvalidSubclassOrderingMetadataExtension extends BaseOrderingMetadataExtension {
    public static readonly ordering_index = "invalid";
  }

  class BaseFunctionInfoMetadataExtension implements LizardExtension {
    public get FUNCTION_INFO(): import("./protocol.ts").FunctionInfoDefinitions {
      return { inherited_count: { caption: " inherited " } };
    }
  }

  class InvalidSubclassFunctionInfoMetadataExtension extends BaseFunctionInfoMetadataExtension {
    public static readonly FUNCTION_INFO = "invalid";
  }

  class BaseSilentMetadataExtension implements LizardExtension {
    public get silent_all_others(): boolean {
      return false;
    }
  }

  class PresentUndefinedSubclassSilentMetadataExtension extends BaseSilentMetadataExtension {
    public static readonly silent_all_others = undefined;
  }

  // Fixed-source get_extensions rejects the subclass string rather than using the base index.
  assert.throws(
    () => getExtensions([new InvalidSubclassOrderingMetadataExtension()]),
    new TypeError("Lizard extension ordering_index metadata must be a number.")
  );
  assert.throws(
    () => extensionMetadata(new InvalidSubclassFunctionInfoMetadataExtension()).FUNCTION_INFO,
    new TypeError("Lizard extension FUNCTION_INFO metadata must be a record.")
  );
  // Fixed-source OutputScheme.any_silent treats a present None value as present metadata.
  assert.equal(
    extensionMetadata(new PresentUndefinedSubclassSilentMetadataExtension()).silent_all_others,
    true
  );
});

test("internal extension hooks retain FUNCTION_INFO, set_args, cross_file_process, print_result, and silent order", () => {
  const calls: string[] = [];
  const first = new LifecycleExtension("first", calls);
  const second = new OrderedLifecycleExtension("second", calls);
  const processors = getExtensions([first, second]);
  const scheme = new OutputScheme(processors);
  const argumentCalls: unknown[][] = [];
  const parser: ExtensionArgumentRegistrar = {
    add_argument(...arguments_: unknown[]): void {
      argumentCalls.push(arguments_);
    }
  };

  registerExtensionArguments(processors, parser);
  assert.deepEqual(calls, ["args:second", "args:first"]);
  assert.deepEqual(
    argumentCalls.map((arguments_) => arguments_[0]),
    ["second", "first"]
  );
  assert.deepEqual(
    [...scheme._ext_member_info()].map(([_caption, name]) => name),
    ["second_count", "first_count"]
  );
  assert.equal(scheme.any_silent(), true);

  const fileInfo = new FileInformation("source.cpp", 1);
  const processedFiles = applyCrossFileProcessors([fileInfo], processors);
  assert.ok(processedFiles !== undefined);
  assert.deepEqual([...processedFiles], [fileInfo]);
  assert.deepEqual(calls, ["args:second", "args:first", "cross:first", "cross:second"]);

  printExtensionResults(processors);
  assert.deepEqual(calls, [
    "args:second",
    "args:first",
    "cross:first",
    "cross:second",
    "print:second",
    "print:first"
  ]);
});

test("ExtensionBase receives reader context and can decorate nesting before reader states consume a brace", () => {
  const extension = new DecoratingExtension();
  const file = new FileAnalyzer(getExtensions([extension])).analyzeSourceCode(
    "decorated.cpp",
    "int decorated() {}",
    CLikeReader
  );

  assert.equal(extension.observedFilename, "decorated.cpp");
  assert.equal(extension.decoratedNestingAdds, 1);
  assert.deepEqual(
    file.functionList.map((functionInfo) => functionInfo.name),
    ["decorated"]
  );
});

test("only selected extension bodies resolve internally; all remaining bodies stay deferred", () => {
  assert.equal(EXTENSION_REGISTRATIONS.length, 19);
  assert.ok(
    EXTENSION_REGISTRATIONS.every(
      (registration) =>
        registration.status === "deferred-extension-body" ||
        registration.name === "complextags" ||
        registration.name === "nd"
    )
  );
  assert.deepEqual(
    getExtensions(["complextags", "ND"])
      .slice(5)
      .map((extension) => extension.constructor.name),
    ["LizardExtension", "LizardExtension"]
  );
  assert.throws(
    () => getExtensions(["NS"]),
    (error: unknown) =>
      error instanceof DeferredExtensionBodyError &&
      error.extensionName === "ns" &&
      error.sourcePath === "lizard_ext/lizardns.py"
  );
  assert.throws(() => getExtensions(["not-a-lizard-extension"]), /Unknown Lizard extension/u);
});

test("selected nesting-depth set_args retains Python positional and keyword argument semantics", () => {
  const calls: unknown[][] = [];
  const parser: ExtensionArgumentRegistrar = {
    add_argument(...arguments_: unknown[]): void {
      calls.push(arguments_);
    }
  };

  NestingDepthExtension.set_args(parser);

  assert.deepEqual(calls, [
    [
      "-N",
      "--ND",
      {
        default: DEFAULT_ND_THRESHOLD,
        dest: "ND",
        help:
          "Threshold for nesting depth number\n" +
          "            warning. The default value is 7.\n" +
          "            Functions with ND bigger than it will generate warning\n" +
          "            ",
        type: "int"
      }
    ]
  ]);
});

class AppendedExtension implements LizardExtension {
  public readonly label = "appended";

  public *__call__(tokens: TokenStream, _reader: AnalyzerReader): Generator<string> {
    yield* tokens;
  }
}

class IndexedExtension implements LizardExtension {
  public readonly label = "indexed";
  public static readonly ordering_index = 0;
  public static readonly FUNCTION_INFO = {
    indexed_static_count: { caption: " indexed static " }
  };
  public static readonly silent_all_others = true;

  public static set_args(parser: ExtensionArgumentRegistrar): void {
    parser.add_argument("indexed-static");
  }

  public *__call__(tokens: TokenStream, _reader: AnalyzerReader): Generator<string> {
    yield* tokens;
  }
}

class NegativeIndexedExtension implements LizardExtension {
  public readonly label = "negative-indexed";
  public readonly ordering_index = -1;

  public *__call__(tokens: TokenStream, _reader: AnalyzerReader): Generator<string> {
    yield* tokens;
  }
}

/** Models lizardwordcount's static __call__ access through an instantiated extension. */
class StaticWordcountStyleExtension implements LizardExtension {
  private static calls: string[] = [];

  public static withCalls(calls: string[]): StaticWordcountStyleExtension {
    StaticWordcountStyleExtension.calls = calls;
    return new StaticWordcountStyleExtension();
  }

  public static __call__(tokens: TokenStream, _reader: AnalyzerReader): TokenStream {
    StaticWordcountStyleExtension.calls.push("static:call");
    return tokens;
  }

  public static *cross_file_process(
    fileInfos: Iterable<FileInformation>
  ): Generator<FileInformation> {
    StaticWordcountStyleExtension.calls.push("static:cross");
    yield* fileInfos;
  }

  public static print_result(): void {
    StaticWordcountStyleExtension.calls.push("static:print");
  }

  public static set_args(_parser: ExtensionArgumentRegistrar): void {
    StaticWordcountStyleExtension.calls.push("static:args");
  }
}

class InstanceFirstExtension implements LizardExtension {
  private readonly calls: string[];

  public constructor(calls: string[]) {
    this.calls = calls;
  }

  public static __call__(): TokenStream {
    throw new Error("static __call__ must not win over the instance hook");
  }

  public static cross_file_process(): Iterable<FileInformation> {
    throw new Error("static cross_file_process must not win over the instance hook");
  }

  public static print_result(): void {
    throw new Error("static print_result must not win over the instance hook");
  }

  public static set_args(): void {
    throw new Error("static set_args must not win over the instance hook");
  }

  public *__call__(tokens: TokenStream, _reader: AnalyzerReader): Generator<string> {
    this.calls.push("instance:call");
    yield* tokens;
  }

  public *cross_file_process(fileInfos: Iterable<FileInformation>): Generator<FileInformation> {
    this.calls.push("instance:cross");
    yield* fileInfos;
  }

  public print_result(): void {
    this.calls.push("instance:print");
  }

  public set_args(_parser: ExtensionArgumentRegistrar): void {
    this.calls.push("instance:args");
  }
}

class InvalidOrderingIndexExtension implements LizardExtension {
  public readonly ordering_index: number;

  public constructor(orderingIndex: number) {
    this.ordering_index = orderingIndex;
  }

  public *__call__(tokens: TokenStream, _reader: AnalyzerReader): Generator<string> {
    yield* tokens;
  }
}

const noOpArgumentRegistrar: ExtensionArgumentRegistrar = {
  add_argument(..._arguments: unknown[]): void {}
};

class LifecycleExtension implements LizardExtension {
  public readonly FUNCTION_INFO;
  public readonly silent_all_others = true;
  protected readonly label: string;
  protected readonly calls: string[];

  public constructor(label: string, calls: string[]) {
    this.label = label;
    this.calls = calls;
    this.FUNCTION_INFO = {
      [`${label}_count`]: {
        average_caption: ` Avg.${label} `,
        caption: ` ${label} `
      }
    };
  }

  public *__call__(tokens: TokenStream, _reader: AnalyzerReader): Generator<string> {
    yield* tokens;
  }

  public *cross_file_process(fileInfos: Iterable<FileInformation>): Generator<FileInformation> {
    this.calls.push(`cross:${this.label}`);
    yield* fileInfos;
  }

  public print_result(): void {
    this.calls.push(`print:${this.label}`);
  }

  public set_args(parser: ExtensionArgumentRegistrar): void {
    this.calls.push(`args:${this.label}`);
    parser.add_argument(this.label, { dest: this.label });
  }
}

class OrderedLifecycleExtension extends LifecycleExtension {
  public static readonly ordering_index = 0;
}

class DecoratingExtension extends ExtensionBase {
  public observedFilename = "";
  public decoratedNestingAdds = 0;
  private decorated = false;

  protected override stateGlobal(token: string): void {
    this.observedFilename = this.context.fileinfo.filename;
    if (token === "{" && !this.decorated) {
      this.decorated = true;
      this.context.decorateNestingStack(CountingNestingStack.withCounter(this));
    }
  }
}

class CountingNestingStack implements NestingStackLike {
  private readonly decorated: NestingStackLike;
  private readonly extension: DecoratingExtension;

  public constructor(decorated: NestingStackLike, extension: DecoratingExtension) {
    this.decorated = decorated;
    this.extension = extension;
  }

  public static withCounter(
    extension: DecoratingExtension
  ): new (decorated: NestingStackLike) => CountingNestingStack {
    return class extends CountingNestingStack {
      public constructor(decorated: NestingStackLike) {
        super(decorated, extension);
      }
    };
  }

  public withNamespace(name: string): string {
    return this.decorated.withNamespace(name);
  }

  public addBareNesting(): void {
    this.extension.decoratedNestingAdds += 1;
    this.decorated.addBareNesting();
  }

  public addNamespace(token: string): void {
    this.decorated.addNamespace(token);
  }

  public startNewFunctionNesting(functionInfo: import("../analysis-model.ts").FunctionInfo): void {
    this.decorated.startNewFunctionNesting(functionInfo);
  }

  public popNesting(): import("../analysis-model.ts").Nesting | undefined {
    return this.decorated.popNesting();
  }

  public get currentNestingLevel(): number {
    return this.decorated.currentNestingLevel;
  }

  public get lastFunction(): import("../analysis-model.ts").FunctionInfo | undefined {
    return this.decorated.lastFunction;
  }
}

function processorName(processor: AnalyzerProcessor): string {
  if (typeof processor === "function") return processor.name;
  return "label" in processor && typeof processor.label === "string"
    ? processor.label
    : "extension";
}
