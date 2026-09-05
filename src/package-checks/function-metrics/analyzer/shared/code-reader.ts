/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/code_reader.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript while retaining the tokenizer and
 * state-machine sequencing used by concrete Lizard language readers.
 */

import type { AnalyzerReader, TokenStream } from "../contracts.ts";
import type { FileInfoBuilder } from "../analysis-context.ts";

/** A regex match passed to language-specific token factories. */
export class TokenMatch {
  public readonly text: string;
  public readonly startOffset: number;

  public constructor(text: string, startOffset: number) {
    this.text = text;
    this.startOffset = startOffset;
  }

  /** Python's re.Match.group(0), retained for direct reader translations. */
  public group(index = 0): string | undefined {
    return index === 0 ? this.text : undefined;
  }

  /** Python's re.Match.start(), retained for direct reader translations. */
  public start(): number {
    return this.startOffset;
  }
}

/** Converts one tokenizer match into the token stream representation. */
export type TokenFactory = (match: TokenMatch) => string;

export type StateHandler = (this: CodeStateMachine, token: string) => boolean | void;
export type UntilStateHandler = (
  this: CodeStateMachine,
  token: string,
  savedTokens: readonly string[]
) => boolean | void;
export type State = CodeStateMachine | StateHandler;
export type SourceStateHandler = (state: CodeStateMachine, token: string) => boolean | void;
export type SourceUntilStateHandler = (
  state: CodeStateMachine,
  token: string,
  savedTokens: string[]
) => boolean | void;

const PYTHON_UNICODE_WHITESPACE = /^\p{White_Space}$/u;
const C0_INFORMATION_SEPARATOR_FIRST = 0x1c;
const C0_INFORMATION_SEPARATOR_LAST = 0x1f;
const C0_LINE_SEPARATOR_LAST = 0x1e;
const C0_INFORMATION_SEPARATOR_PATTERN =
  `${String.fromCodePoint(C0_INFORMATION_SEPARATOR_FIRST)}-` +
  String.fromCodePoint(C0_INFORMATION_SEPARATOR_LAST);

export interface ReaderDefinition {
  readonly controlFlowKeywords: ReadonlySet<string>;
  readonly logicalOperators: ReadonlySet<string>;
  readonly caseKeywords: ReadonlySet<string>;
  readonly ternaryOperators: ReadonlySet<string>;
  buildConditions(): Set<string>;
}

/** Python str.isspace(), including its four extra C0 information separators. */
export function isPythonWhitespace(value: string): boolean {
  return (
    value.length > 0 &&
    Array.from(value).every(
      (character) =>
        PYTHON_UNICODE_WHITESPACE.test(character) || isC0InformationSeparator(character)
    )
  );
}

/** Python str.splitlines() without retaining source line-boundary characters. */
export function splitPythonLines(value: string): string[] {
  if (value.length === 0) return [];

  const lines: string[] = [];
  let lineStart = 0;
  let index = 0;
  while (index < value.length) {
    const boundaryLength = pythonLineBoundaryLengthAt(value, index);
    if (boundaryLength === 0) {
      index += 1;
      continue;
    }
    lines.push(value.slice(lineStart, index));
    index += boundaryLength;
    lineStart = index;
  }
  if (lineStart < value.length) lines.push(value.slice(lineStart));
  return lines;
}

/**
 * The small state-machine foundation used by source-aligned language readers.
 * It deliberately preserves upstream's one saved sub-state and callback slot.
 */
export class CodeStateMachine {
  public context: FileInfoBuilder;
  public lastToken: string | undefined;
  protected state: State;
  protected savedState: State;
  protected toExit = false;
  public callback: (() => void) | undefined;
  protected readUntilTokens: string[] = [];
  protected bracketCount = 0;
  protected readonly stateMachineConstructor: typeof CodeStateMachine;
  protected readonly globalState: StateHandler = (token) => this._state_global(token);

  public constructor(context: FileInfoBuilder) {
    this.stateMachineConstructor = new.target;
    this.context = context;
    this.state = this.globalState;
    this.savedState = this.globalState;
  }

  /** Source field aliases retain one state slot for translated state machines. */
  public get saved_state(): State {
    return this.savedState;
  }

  public set saved_state(value: State) {
    this.savedState = value;
  }

  public get _state(): State {
    return this.state;
  }

  public set _state(value: State) {
    this.state = value;
  }

  public get last_token(): string | undefined {
    return this.lastToken;
  }

  public set last_token(value: string | undefined) {
    this.lastToken = value;
  }

  public get to_exit(): boolean {
    return this.toExit;
  }

  public set to_exit(value: boolean) {
    this.toExit = value;
  }

  public get rut_tokens(): string[] {
    return this.readUntilTokens;
  }

  public set rut_tokens(value: string[]) {
    this.readUntilTokens = value;
  }

  public get br_count(): number {
    return this.bracketCount;
  }

  public set br_count(value: number) {
    this.bracketCount = value;
  }

  /** TS-facing alias for the source clone hook. */
  public cloneState(): CodeStateMachine {
    return this.statemachine_clone();
  }

  /** Equivalent to Python's statemachine_clone. */
  public statemachine_clone(): CodeStateMachine {
    return new this.stateMachineConstructor(this.context);
  }

  public next(state: State, token?: string): boolean | void {
    this.state = state;
    if (token !== undefined) return this.consume(token);
  }

  public nextIf(state: State, token: string, expected: string): boolean | void {
    if (token === expected) return this.next(state, token);
  }

  public next_if(state: State, token: string, expected: string): boolean | void {
    return this.nextIf(state, token, expected);
  }

  public returnFromState(): void {
    this.toExit = true;
    this.statemachine_before_return();
  }

  public statemachine_return(): void {
    this.returnFromState();
  }

  public subState(state: State, callback?: () => void, token?: string): boolean | void {
    this.savedState = this.state;
    this.callback = callback;
    return this.next(state, token);
  }

  public sub_state(state: State, callback?: () => void, token?: string): boolean | void {
    return this.subState(state, callback, token);
  }

  /** Feed one token through the current state. */
  public consume(token: string): boolean {
    const completed = this.invokeCurrentState(token);
    if (completed) {
      this.next(this.savedState);
      // Keep the source ordering: a callback installed by this callback is
      // still cleared afterwards, because CodeStateMachine has one callback
      // slot rather than a callback stack.
      this.callback?.();
      this.callback = undefined;
    }
    this.lastToken = token;
    return this.toExit;
  }

  /** Invoke only the current state; ExtensionBase retains this upstream seam. */
  protected invokeCurrentState(token: string): boolean {
    return this.state instanceof CodeStateMachine
      ? this.state.consume(token)
      : Boolean(this.state.call(this, token));
  }

  /** TS-facing state hook used by existing translated reader subclasses. */
  protected stateGlobal(_token: string): void {}

  /** Source readers/extensions may retain this source-spelled state hook. */
  public _state_global(token: string): void {
    this.stateGlobal(token);
  }

  /** Source readers/extensions may retain this source-spelled return hook. */
  public statemachine_before_return(): void {}

  /** TS-facing alias for the source pre-return hook. */
  public beforeReturn(): void {
    this.statemachine_before_return();
  }

  /** Source decorator factory retained for translated reader/extension state methods. */
  public static read_inside_brackets_then(
    brackets: string,
    endState?: string
  ): (action: SourceStateHandler) => StateHandler {
    return (action) =>
      function readUntilMatchingBrackets(this: CodeStateMachine, token: string): void {
        const [openingBracket, closingBracket] = brackets;
        if (token === openingBracket) this.br_count += 1;
        else if (token === closingBracket) this.br_count -= 1;

        if (this.br_count === 0 || endState !== undefined) action(this, token);
        if (this.br_count === 0 && endState !== undefined) {
          this.next(readSourceState(this, endState));
        }
      };
  }

  /** Source decorator factory retained for translated reader/extension state methods. */
  public static read_until_then(tokens: string): (action: SourceUntilStateHandler) => StateHandler {
    return (action) =>
      function readUntilThenToken(this: CodeStateMachine, token: string): void {
        if (tokens.includes(token)) {
          action(this, token, this.rut_tokens);
          this.rut_tokens = [];
          return;
        }
        this.rut_tokens.push(token);
      };
  }

  /**
   * Source-aligned replacement for read_inside_brackets_then.  Call from a
   * reader state for the token currently being consumed.
   */
  protected readInsideBracketsThen(
    brackets: string,
    token: string,
    action: StateHandler,
    endState?: State
  ): void {
    const [openingBracket, closingBracket] = brackets;
    if (token === openingBracket) this.bracketCount += 1;
    else if (token === closingBracket) this.bracketCount -= 1;

    if (this.bracketCount === 0 || endState !== undefined) {
      action.call(this, token);
    }
    if (this.bracketCount === 0 && endState !== undefined) this.next(endState);
  }

  /** Source-aligned replacement for read_until_then. */
  protected readUntilThen(stopTokens: string, token: string, action: UntilStateHandler): void {
    if (stopTokens.includes(token)) {
      const savedTokens = this.readUntilTokens;
      action.call(this, token, savedTokens);
      this.readUntilTokens = [];
      return;
    }
    this.readUntilTokens.push(token);
  }
}

function readSourceState(stateMachine: CodeStateMachine, name: string): State {
  const state: unknown = Reflect.get(stateMachine, name);
  if (state instanceof CodeStateMachine || isStateHandler(state)) return state;
  throw new TypeError(`CodeStateMachine source state '${name}' is not callable.`);
}

function isStateHandler(value: unknown): value is StateHandler {
  return typeof value === "function";
}

/** Base tokenizer and state fan-out used by all translated concrete readers. */
export class CodeReader implements AnalyzerReader {
  public static ext: readonly string[] = [];
  public static languages: unknown = undefined;
  public static languageNames: readonly string[] = [];

  /** Source `language_names` shares storage with the TS-facing class field. */
  public static get language_names(): readonly string[] {
    return this.languageNames;
  }

  public static set language_names(value: readonly string[]) {
    this.languageNames = value;
  }

  public static extraSubclasses = new Set<typeof CodeReader>();

  /** Source `extra_subclasses` shares storage with the TS-facing class field. */
  public static get extra_subclasses(): Set<typeof CodeReader> {
    return this.extraSubclasses;
  }

  public static set extra_subclasses(value: Set<typeof CodeReader>) {
    this.extraSubclasses = value;
  }

  public static controlFlowKeywords: ReadonlySet<string> = new Set(["if", "for", "while", "catch"]);
  public static logicalOperators: ReadonlySet<string> = new Set(["&&", "||"]);
  public static caseKeywords: ReadonlySet<string> = new Set(["case"]);
  public static ternaryOperators: ReadonlySet<string> = new Set(["?"]);

  /** Source class-level condition categories retain their source spellings. */
  public static get _control_flow_keywords(): ReadonlySet<string> {
    return this.controlFlowKeywords;
  }

  public static set _control_flow_keywords(value: ReadonlySet<string>) {
    this.controlFlowKeywords = value;
  }

  public static get _logical_operators(): ReadonlySet<string> {
    return this.logicalOperators;
  }

  public static set _logical_operators(value: ReadonlySet<string>) {
    this.logicalOperators = value;
  }

  public static get _case_keywords(): ReadonlySet<string> {
    return this.caseKeywords;
  }

  public static set _case_keywords(value: ReadonlySet<string>) {
    this.caseKeywords = value;
  }

  public static get _ternary_operators(): ReadonlySet<string> {
    return this.ternaryOperators;
  }

  public static set _ternary_operators(value: ReadonlySet<string>) {
    this.ternaryOperators = value;
  }

  public conditions: Set<string>;
  public controlFlowKeywords: Set<string>;
  public logicalOperators: Set<string>;
  public caseKeywords: Set<string>;
  public ternaryOperators: Set<string>;
  public parallelStates: CodeStateMachine[] = [];
  public context: FileInfoBuilder;
  private readonly readerClass: typeof CodeReader;

  public constructor(context: FileInfoBuilder, readerDefinition?: ReaderDefinition) {
    this.readerClass = new.target;
    this.context = context;
    const definition = readerDefinition ?? this.readerClass;
    this.conditions = new Set(definition.buildConditions());
    this.controlFlowKeywords = new Set(definition.controlFlowKeywords);
    this.logicalOperators = new Set(definition.logicalOperators);
    this.caseKeywords = new Set(definition.caseKeywords);
    this.ternaryOperators = new Set(definition.ternaryOperators);
  }

  /** Source `parallel_states` shares the mutable per-reader state list. */
  public get parallel_states(): CodeStateMachine[] {
    return this.parallelStates;
  }

  public set parallel_states(value: CodeStateMachine[]) {
    this.parallelStates = value;
  }

  /** Python class attributes are visible through each reader instance. */
  public get languages(): unknown {
    return this.readerClass.languages;
  }

  public get extraSubclasses(): Set<typeof CodeReader> {
    return this.readerClass.extraSubclasses;
  }

  public get extra_subclasses(): Set<typeof CodeReader> {
    return this.extraSubclasses;
  }

  public get control_flow_keywords(): Set<string> {
    return this.controlFlowKeywords;
  }

  public set control_flow_keywords(value: Set<string>) {
    this.controlFlowKeywords = value;
  }

  public get logical_operators(): Set<string> {
    return this.logicalOperators;
  }

  public set logical_operators(value: Set<string>) {
    this.logicalOperators = value;
  }

  public get case_keywords(): Set<string> {
    return this.caseKeywords;
  }

  public set case_keywords(value: Set<string>) {
    this.caseKeywords = value;
  }

  public get ternary_operators(): Set<string> {
    return this.ternaryOperators;
  }

  public set ternary_operators(value: Set<string>) {
    this.ternaryOperators = value;
  }

  /** Python exposes the concrete class's ext through each reader instance. */
  public get ext(): readonly string[] {
    return this.readerClass.ext;
  }

  /** Python exposes the concrete class's language_names through each reader instance. */
  public get languageNames(): readonly string[] {
    return this.readerClass.languageNames;
  }

  /** Source `language_names` instance accessor, aliased to `languageNames`. */
  public get language_names(): readonly string[] {
    return this.languageNames;
  }

  public static buildConditions(this: typeof CodeReader): Set<string> {
    return new Set([
      ...this.controlFlowKeywords,
      ...this.logicalOperators,
      ...this.caseKeywords,
      ...this.ternaryOperators
    ]);
  }

  public static _build_conditions(this: typeof CodeReader): Set<string> {
    return this.buildConditions();
  }

  public static matchFilename(this: typeof CodeReader, filename: string): boolean {
    return new RegExp(`.*\\.(${this.ext.join("|")})$`, "iu").test(filename);
  }

  public static match_filename(this: typeof CodeReader, filename: string): boolean {
    return this.matchFilename(filename);
  }

  /** The shared source-aligned tokenizer used by all language readers. */
  public static *generateTokens(
    sourceCode: string,
    addition = "",
    tokenFactory: TokenFactory = (match) => match.text
  ): Generator<string> {
    const { cleanedAddition, flags } = tokenizerFlags(addition);
    const untilEnd = String.raw`(?:\\\n|[^\n])*`;
    // Python's `[^\\S\\n]+` source fragment groups whitespace other than a
    // line-feed. Keep `\\n` as its own token even when it is adjacent to
    // horizontal/other Python whitespace; the C0 separators are recognised by
    // Python's `\\s` but not JavaScript's Unicode White_Space property.
    const pythonWhitespaceExceptLineFeed = `(?:(?!\\n)(?:\\p{White_Space}|[${C0_INFORMATION_SEPARATOR_PATTERN}]))`;
    const combinedSymbols = [
      "<<=",
      ">>=",
      "||",
      "&&",
      "===",
      "!==",
      "==",
      "!=",
      "<=",
      ">=",
      "->",
      "=>",
      "++",
      "--",
      "+=",
      "-=",
      "+",
      "-",
      "*",
      "/",
      "*=",
      "/=",
      "^=",
      "&=",
      "|=",
      "..."
    ];
    const tokenPattern = new RegExp(
      "(?:" +
        String.raw`\/\*.*?\*\/` +
        cleanedAddition +
        String.raw`|(?:\d+')+\d+` +
        String.raw`|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+` +
        String.raw`|0b(?:[01]+')+[01]+` +
        String.raw`|[\p{L}\p{N}_]+` +
        String.raw`|"(?:\\.|[^"\\])*"` +
        String.raw`|'(?:\\.|[^'\\])*?'` +
        String.raw`|\/\/` +
        untilEnd +
        String.raw`|#` +
        String.raw`|:=|::|\*\*` +
        String.raw`|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]|(?:extends))+>` +
        `|${combinedSymbols.map(escapeRegex).join("|")}` +
        String.raw`|\\\n|\n|` +
        `${pythonWhitespaceExceptLineFeed}+` +
        String.raw`|.)`,
      flags
    );

    let macro = "";
    for (const match of sourceCode.matchAll(tokenPattern)) {
      const token = tokenFactory(new TokenMatch(match[0], match.index));
      if (macro) {
        if (token.includes("\\\n") || !token.includes("\n")) {
          macro += token;
        } else {
          yield macro;
          yield token;
          macro = "";
        }
      } else if (token === "#") {
        macro = token;
      } else {
        yield token;
      }
    }
    if (macro) yield macro;
  }

  public static generate_tokens(
    sourceCode: string,
    addition = "",
    tokenFactory: TokenFactory = (match) => match.text
  ): TokenStream {
    return this.generateTokens(sourceCode, addition, tokenFactory);
  }

  /** Source `CodeReader.__call__` updates context before draining the reader pipeline. */
  public __call__(tokens: TokenStream, reader: AnalyzerReader): TokenStream {
    this.context = reader.context;
    return this.process(tokens);
  }

  public *process(tokens: TokenStream): Generator<string> {
    for (const token of tokens) {
      if (this.process_token(token)) {
        for (const state of this.parallelStates) state.consume(token);
        yield token;
        continue;
      }

      for (const state of this.parallelStates) state.consume(token);
      yield token;
    }
    for (const state of this.parallelStates) state.statemachine_before_return();
    this.eof();
  }

  public get_comment_from_token(_token: string): string | undefined {
    return undefined;
  }

  /** TS-facing analyzer interface alias for the source reader hook. */
  public getCommentFromToken(token: string): string | undefined {
    return this.get_comment_from_token(token);
  }

  public eof(): void {}

  /** Return true only when a reader intentionally bypasses normal state work. */
  public process_token(_token: string): boolean {
    return false;
  }

  /** TS-facing alias retained for the AnalyzerReader host interface. */
  public processToken(token: string): boolean {
    return this.process_token(token);
  }
}

function tokenizerFlags(addition: string): {
  readonly cleanedAddition: string;
  readonly flags: string;
} {
  const inlineFlagPattern = /\(\?[aiLmsux]+\)/gu;
  const inlineFlags = Array.from(addition.matchAll(inlineFlagPattern)).flatMap((match) =>
    (match[0] ?? "").slice(2, -1).split("")
  );
  const supportedFlags = new Set(["g", "m", "s", "u"]);
  if (inlineFlags.includes("i")) supportedFlags.add("i");
  return {
    cleanedAddition: normalizePythonRegex(addition.replace(inlineFlagPattern, "")),
    flags: Array.from(supportedFlags).join("")
  };
}

function isC0InformationSeparator(character: string): boolean {
  const codePoint = character.codePointAt(0);
  return (
    codePoint !== undefined &&
    codePoint >= C0_INFORMATION_SEPARATOR_FIRST &&
    codePoint <= C0_INFORMATION_SEPARATOR_LAST
  );
}

function pythonLineBoundaryLengthAt(value: string, index: number): number {
  const codePoint = value.codePointAt(index);
  if (codePoint === 0x0d) return value.codePointAt(index + 1) === 0x0a ? 2 : 1;
  if (codePoint === 0x0a || codePoint === 0x0b || codePoint === 0x0c) return 1;
  if (
    codePoint !== undefined &&
    codePoint >= C0_INFORMATION_SEPARATOR_FIRST &&
    codePoint <= C0_LINE_SEPARATOR_LAST
  ) {
    return 1;
  }
  return codePoint === 0x85 || codePoint === 0x2028 || codePoint === 0x2029 ? 1 : 0;
}

/**
 * Lizard's language additions are Python regex fragments.  Python accepts a
 * backslash before punctuation such as `!`, while a JavaScript Unicode regex
 * rejects that identity escape; those escapes are literals in both engines.
 */
function normalizePythonRegex(pattern: string): string {
  return pattern.replace(/\\([^\\^$.*+?()[\]{}|/bBdDsSwWpPxucfnrtv0-9])/gu, "$1");
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+*?.]/gu, "\\$&");
}
