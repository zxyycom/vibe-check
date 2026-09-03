/**
 * Derived from terryyin/lizard 1.24.0 tests.
 * Sources: test/testTokenizer.py, lizard_languages/code_reader.py, and
 * lizard_ext/extension_base.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: compact TypeScript tokenizer parity coverage.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { FileAnalyzer, FileInfoBuilder, type AnalyzerReader, type TokenStream } from "../core.ts";
import { getExtensions } from "../extensions/registry.ts";
import { PythonReader } from "../readers/python.ts";
import {
  CodeReader,
  CodeStateMachine,
  isPythonWhitespace,
  splitPythonLines
} from "./code-reader.ts";

describe("Lizard shared tokenizer", () => {
  it("preserves upstream macro, comment, string, and symbol token boundaries", () => {
    assert.deepEqual([...CodeReader.generateTokens("int a{}")], ["int", " ", "a", "{", "}"]);
    assert.deepEqual([...CodeReader.generateTokens('"x\\"xx")')], ['"x\\"xx"', ")"]);
    assert.deepEqual([...CodeReader.generateTokens("//aaa\n")], ["//aaa", "\n"]);
    assert.deepEqual([...CodeReader.generateTokens("/*abc\n*/ t")], ["/*abc\n*/", " ", "t"]);
    assert.deepEqual(
      [
        ...CodeReader.generateTokens(
          "#define xx()\\\n                       abc\n                    int"
        )
      ],
      ["#define xx()\\\n                       abc", "\n", "                    ", "int"]
    );
  });

  it("clones the concrete state-machine class for later reader and extension substates", () => {
    const context = new FileInfoBuilder("clone.cpp");
    const clone = new DerivedStateMachine(context).cloneState();

    assert.ok(clone instanceof DerivedStateMachine);
    assert.equal(clone.context, context);
  });

  it("retains Python tokenizer whitespace and splitlines boundaries", () => {
    assert.equal(isPythonWhitespace("\x1c"), true);
    assert.equal(isPythonWhitespace("\ufeff"), false);
    assert.deepEqual(splitPythonLines("/*comment\u2028still*/"), ["/*comment", "still*/"]);
    assert.deepEqual(
      [...CodeReader.generateTokens("int f(){\x1c return 0;}")],
      ["int", " ", "f", "(", ")", "{", "\x1c ", "return", " ", "0", ";", "}"]
    );
    assert.deepEqual(
      [...CodeReader.generateTokens("\t \n \r\x1c \n")],
      ["\t ", "\n", " \r\x1c ", "\n"]
    );
    assert.deepEqual(
      [...CodeReader.generateTokens("int f(){\ufeff return 0;}")],
      ["int", " ", "f", "(", ")", "{", "\ufeff", " ", "return", " ", "0", ";", "}"]
    );

    const reader = new PythonReader(new FileInfoBuilder("source.py"));
    const extension = new LanguageNameConsumerExtension();
    const sourceNames = ["source-shaped"];
    SourceLanguageNameReader.language_names = sourceNames;

    assert.equal(PythonReader.language_names, PythonReader.languageNames);
    assert.equal(reader.language_names, reader.languageNames);
    assert.equal(reader.language_names, PythonReader.language_names);
    assert.equal(SourceLanguageNameReader.language_names, SourceLanguageNameReader.languageNames);
    assert.equal(
      new SourceLanguageNameReader(new FileInfoBuilder("source.alias")).language_names,
      sourceNames
    );

    new FileAnalyzer(getExtensions([extension])).analyzeSourceCode(
      "source.py",
      "def source_name(): pass\n",
      PythonReader
    );
    assert.equal(extension.observedLanguageNames, PythonReader.languageNames);
  });

  it("retains CodeReader source fields and aliases with single shared storage", () => {
    const context = new FileInfoBuilder("source-fields.cpp");
    const reader = new SourceFieldReader(context);
    const sourceLanguages = ["source-reader-languages"];
    const sourceExtraSubclasses = new Set<typeof CodeReader>();
    const camelExtraSubclasses = new Set<typeof CodeReader>();
    const sourceControlFlowKeywords = new Set(["when"]);
    const sourceParallelStates = [new DerivedStateMachine(context)];

    SourceFieldReader.languages = sourceLanguages;
    SourceFieldReader.extra_subclasses = sourceExtraSubclasses;
    SourceFieldReader._control_flow_keywords = sourceControlFlowKeywords;

    assert.equal(SourceFieldReader.languages, sourceLanguages);
    assert.equal(reader.languages, sourceLanguages);
    assert.equal(SourceFieldReader.extraSubclasses, sourceExtraSubclasses);
    assert.equal(SourceFieldReader.extra_subclasses, sourceExtraSubclasses);
    assert.equal(reader.extraSubclasses, sourceExtraSubclasses);
    assert.equal(reader.extra_subclasses, sourceExtraSubclasses);
    assert.equal(SourceFieldReader.controlFlowKeywords, sourceControlFlowKeywords);
    assert.equal(SourceFieldReader._control_flow_keywords, sourceControlFlowKeywords);

    SourceFieldReader.extraSubclasses = camelExtraSubclasses;
    assert.equal(SourceFieldReader.extra_subclasses, camelExtraSubclasses);

    reader.control_flow_keywords = sourceControlFlowKeywords;
    reader.parallel_states = sourceParallelStates;
    assert.equal(reader.controlFlowKeywords, sourceControlFlowKeywords);
    assert.equal(reader.control_flow_keywords, sourceControlFlowKeywords);
    assert.equal(reader.parallelStates, sourceParallelStates);
    assert.equal(reader.parallel_states, sourceParallelStates);
  });
});

describe("Lizard shared state machine", () => {
  it("invokes the completed-state callback before clearing it, preserving recursive callback replacement", () => {
    const state = new RecursiveCallbackState(new FileInfoBuilder("callback.cpp"));
    state.start();

    state.consume("first");
    state.consume("second");

    assert.deepEqual(state.callbackEvents, ["first"]);

    const bracketState = new BoundBracketActionState(new FileInfoBuilder("brackets.cpp"));
    bracketState.start();
    bracketState.consume(")");
    // `read_inside_brackets_then(..., end_state)` calls the decorated action
    // for both the opening and closing token; its receiver must remain the
    // active state machine in each call.
    assert.deepEqual(bracketState.actionEvents, ["brackets.cpp:(", "brackets.cpp:)"]);
  });

  it("retains source-spelled state fields and state hooks", () => {
    const context = new FileInfoBuilder("state-fields.cpp");
    const state = new SourceSpelledStateMachine(context);
    const stateHandler = (token: string): boolean => token === "done";

    state._state = stateHandler;
    state.saved_state = stateHandler;
    state.rut_tokens = ["saved"];
    state.br_count = 3;
    state.last_token = "previous";
    state.callback = () => state.events.push("callback");

    assert.equal(state._state, stateHandler);
    assert.equal(state.saved_state, stateHandler);
    assert.deepEqual(state.rut_tokens, ["saved"]);
    assert.equal(state.br_count, 3);
    assert.equal(state.last_token, "previous");

    state._state_global("global");
    state.statemachine_return();
    assert.equal(state.to_exit, true);
    assert.deepEqual(state.events, ["global:global", "before-return"]);
  });

  it("retains source decorator factories for bracket and token-until states", () => {
    const state = new SourceDecoratorState(new FileInfoBuilder("decorators.cpp"));

    state.startBracketState();
    state.consume("(");
    state.consume("inner");
    state.consume(")");

    state.startUntilState();
    state.consume("first");
    state.consume("second");
    state.consume(";");

    assert.deepEqual(state.events, [
      "bracket:(",
      "bracket:inner",
      "bracket:)",
      "until:;:first,second"
    ]);
    assert.deepEqual(state.rut_tokens, []);
  });
});

class DerivedStateMachine extends CodeStateMachine {}

class SourceLanguageNameReader extends CodeReader {}

class SourceFieldReader extends CodeReader {}

class RecursiveCallbackState extends CodeStateMachine {
  public readonly callbackEvents: string[] = [];

  public start(): void {
    this.subState(this.completeFirst, () => {
      this.callbackEvents.push("first");
      this.subState(this.completeSecond, () => this.callbackEvents.push("recursive"));
    });
  }

  private readonly completeFirst = (token: string): boolean => token === "first";
  private readonly completeSecond = (token: string): boolean => token === "second";
}

class BoundBracketActionState extends CodeStateMachine {
  public readonly actionEvents: string[] = [];

  public start(): void {
    // The source passes this prototype state to `next`; CodeStateMachine
    // supplies the active receiver with Function.call.
    // oxlint-disable-next-line typescript/unbound-method
    this.next(this.readBracket, "(");
  }

  private readBracket(token: string): void {
    // The source decorator receives both prototype callbacks unbound and
    // invokes them with the state-machine receiver.
    // oxlint-disable-next-line typescript/unbound-method
    this.readInsideBracketsThen("()", token, this.recordBracket, this.globalState);
  }

  private recordBracket(token: string): void {
    this.actionEvents.push(`${this.context.fileinfo.filename}:${token}`);
  }
}

class SourceSpelledStateMachine extends CodeStateMachine {
  public readonly events: string[] = [];

  public override _state_global(token: string): void {
    this.events.push(`global:${token}`);
  }

  public override statemachine_before_return(): void {
    this.events.push("before-return");
  }
}

class SourceDecoratorState extends CodeStateMachine {
  public readonly events: string[] = [];

  public readonly bracketState = CodeStateMachine.read_inside_brackets_then(
    "()",
    "_state_global"
  )((state, token) => {
    assert.ok(state instanceof SourceDecoratorState);
    state.events.push(`bracket:${token}`);
  });

  public readonly untilState = CodeStateMachine.read_until_then(";")(
    (state, token, savedTokens) => {
      assert.ok(state instanceof SourceDecoratorState);
      state.events.push(`until:${token}:${savedTokens.join(",")}`);
    }
  );

  public startBracketState(): void {
    this.next(this.bracketState);
  }

  public startUntilState(): void {
    this.next(this.untilState);
  }
}

class LanguageNameConsumerExtension {
  public observedLanguageNames: readonly string[] | undefined;

  public *__call__(tokens: TokenStream, reader: AnalyzerReader): Generator<string> {
    // The internal extension protocol receives the source-shaped reader
    // object; this alias shares storage with its typed `languageNames` field.
    this.observedLanguageNames = reader.language_names;
    yield* tokens;
  }
}
