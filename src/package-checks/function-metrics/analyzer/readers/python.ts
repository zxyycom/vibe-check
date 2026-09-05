/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/python.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript for the product-owned analyzer.
 */

import type { FileInfoBuilder } from "../analysis-context.ts";
import type { TokenStream } from "../contracts.ts";
import {
  CodeReader,
  CodeStateMachine,
  isPythonWhitespace,
  type TokenFactory
} from "../shared/code-reader.ts";
import { ScriptLanguageMixIn } from "../shared/script-language.ts";

const SOURCE_SOFT_KEYWORD_VARIABLE_NEXT = new Set([
  "=",
  ".",
  ":",
  ",",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "//=",
  "**=",
  "&=",
  "|=",
  "^=",
  "<<=",
  ">>=",
  ":="
]);
const TRIPLE_QUOTE_EXPRESSION_PREDECESSORS = new Set([
  "=",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "//=",
  "**=",
  "&=",
  "|=",
  "^=",
  "<<=",
  ">>=",
  "(",
  "return",
  ",",
  "[",
  "+",
  "-",
  "*",
  "/",
  "%"
]);

function count_spaces(token: string): number {
  return token.replaceAll("\t", "        ").length;
}

class PythonIndents {
  private readonly indents = [0];
  private readonly context: FileInfoBuilder;

  public constructor(context: FileInfoBuilder) {
    this.context = context;
  }

  public set_nesting(spaces: number, token = ""): void {
    while (this.indents.at(-1)! > spaces && !token.startsWith(")")) {
      this.indents.pop();
      this.context.popNesting();
    }
    if (this.indents.at(-1)! < spaces) {
      this.indents.push(spaces);
      this.context.addBareNesting();
    }
  }

  public reset(): void {
    this.set_nesting(0);
  }
}

export class PythonReader extends CodeReader {
  public static override ext: readonly string[] = ["py"];
  public static override languageNames: readonly string[] = ["python"];
  public static override controlFlowKeywords = new Set([
    "if",
    "elif",
    "for",
    "while",
    "except",
    "finally"
  ]);
  public static override logicalOperators = new Set(["and", "or"]);
  public static override caseKeywords = new Set<string>();
  public static override ternaryOperators = new Set<string>();

  public static readonly _SOFT_KW_VARIABLE_NEXT = SOURCE_SOFT_KEYWORD_VARIABLE_NEXT;

  private _last_meaningful_token: string | undefined;
  private _keyword_case = false;
  private _keyword_match = false;

  public constructor(context: FileInfoBuilder, definition: typeof CodeReader = PythonReader) {
    super(context, definition);
    this.parallelStates = [new PythonStates(context, this)];
  }

  /** str/bytes f-string prefixes, excluding bare bytes/raw strings. */
  public static readonly _FSTRING_PREFIXES = new Set(["f", "rf", "fr", "bf", "fb"]);

  public static override generateTokens(
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    const tokens = CodeReader.generateTokens(
      sourceCode,
      String.raw`|#[^\n]*|(?:"""(?:\.|[^"]|"(?!"")|""(?!"))*""")|(?:'''(?:\.|[^']|'(?!'')|''(?!'))*''')` +
        addition,
      tokenFactory
    );
    return PythonReader._expand_fstring_interpolations(tokens, tokenFactory);
  }

  /** Re-tokenize f-string expressions so their control flow reaches the reader. */
  private static *_expand_fstring_interpolations(
    tokens: TokenStream,
    tokenFactory?: TokenFactory
  ): Generator<string> {
    let prefix: string | undefined;
    for (const token of tokens) {
      if (prefix !== undefined) {
        const held = prefix;
        prefix = undefined;
        if (token.startsWith('"') || token.startsWith("'")) {
          yield held;
          yield* PythonReader._tokenize_fstring_body(token, tokenFactory);
          continue;
        }
        yield held;
      }
      if (PythonReader._FSTRING_PREFIXES.has(token.toLowerCase())) {
        prefix = token;
        continue;
      }
      yield token;
    }
    if (prefix !== undefined) yield prefix;
  }

  /** Advance beyond one quoted literal while scanning an f-string expression. */
  private static _skip_quoted_literal(body: string, position: number): number {
    const length = body.length;
    let currentPosition = position;
    const tripleQuote = body.slice(currentPosition, currentPosition + 3);
    if (currentPosition + 2 < length && (tripleQuote === '"""' || tripleQuote === "'''")) {
      currentPosition += 3;
      while (currentPosition < length) {
        if (body.slice(currentPosition, currentPosition + 3) === tripleQuote) {
          return currentPosition + 3;
        }
        if (body[currentPosition] === "\\") {
          currentPosition += 2;
          continue;
        }
        currentPosition += 1;
      }
      return length;
    }
    if (body[currentPosition] === '"' || body[currentPosition] === "'") {
      const quote = body[currentPosition];
      currentPosition += 1;
      while (currentPosition < length) {
        if (body[currentPosition] === "\\") {
          currentPosition += 2;
          continue;
        }
        if (body[currentPosition] === quote) return currentPosition + 1;
        currentPosition += 1;
      }
      return length;
    }
    return currentPosition;
  }

  /** Find the matching brace of an interpolation while honoring quoted literals. */
  private static _find_interpolation_end(body: string, start: number): number {
    let depth = 1;
    let position = start + 1;
    while (position < body.length && depth > 0) {
      if (body[position] === '"' || body[position] === "'") {
        position = PythonReader._skip_quoted_literal(body, position);
        continue;
      }
      if (body[position] === "{") depth += 1;
      else if (body[position] === "}") depth -= 1;
      position += 1;
    }
    return position;
  }

  /** Preserve literal chunks and recursively tokenize each f-string expression. */
  private static *_tokenize_fstring_body(
    token: string,
    tokenFactory?: TokenFactory
  ): Generator<string> {
    const quote = token.startsWith('"""') || token.startsWith("'''") ? token.slice(0, 3) : token[0];
    const body = token.slice(quote.length, -quote.length);
    let literal = "";
    let produced = false;
    let position = 0;
    while (position < body.length) {
      const doubledBrace = body.slice(position, position + 2);
      if (doubledBrace === "{{" || doubledBrace === "}}") {
        literal += body[position];
        position += 2;
        continue;
      }
      if (body[position] === "{") {
        const end = PythonReader._find_interpolation_end(body, position);
        if (literal) {
          yield `${quote}${literal}${quote}`;
          literal = "";
        }
        yield* PythonReader.generateTokens(body.slice(position + 1, end - 1), "", tokenFactory);
        produced = true;
        position = end;
        continue;
      }
      literal += body[position];
      position += 1;
    }
    if (!produced) {
      yield token;
      return;
    }
    if (literal) yield `${quote}${literal}${quote}`;
  }

  public *preprocess(tokens: TokenStream): Generator<string> {
    const indents = new PythonIndents(this.context);
    let currentLeadingSpaces = 0;
    let readingLeadingSpace = true;

    for (const token of this._soft_keyword_lookahead(tokens)) {
      if (token !== "\n") {
        if (readingLeadingSpace) {
          if (isPythonWhitespace(token)) {
            currentLeadingSpaces += count_spaces(token);
          } else {
            if (!token.startsWith("#")) {
              const currentFunction = this.context.currentFunction;
              if (currentFunction.name === "*global*" || currentFunction.longName.endsWith(")")) {
                indents.set_nesting(currentLeadingSpaces, token);
              }
            }
            readingLeadingSpace = false;
          }
        }
      } else {
        readingLeadingSpace = true;
        currentLeadingSpaces = 0;
      }
      if (!isPythonWhitespace(token) || token === "\n") yield token;
    }
    indents.reset();
  }

  public override get_comment_from_token(token: string): string | undefined {
    return ScriptLanguageMixIn.get_comment_from_token(token);
  }

  public override process_token(token: string): boolean {
    if (token === "case" && this._keyword_case) this.context.addCondition();

    if (isTripleQuotedString(token) && token.length >= 6) {
      const state = this.parallelStates[0];
      if (state instanceof PythonStates && !state.isFirstLine) {
        if (!TRIPLE_QUOTE_EXPRESSION_PREDECESSORS.has(this._last_meaningful_token ?? "")) {
          this.context.addNloc(-token.split("\n").length);
        }
      }
    }

    if (token !== "\n" && !isPythonWhitespace(token)) this._last_meaningful_token = token;
    return false;
  }

  private *_soft_keyword_lookahead(tokens: TokenStream): Generator<string> {
    let atLineStart = true;
    const iterator = tokens[Symbol.iterator]();
    let next = iterator.next();

    while (!next.done) {
      const token = next.value;
      if (token === "\n") {
        atLineStart = true;
        yield token;
        next = iterator.next();
      } else if (isPythonWhitespace(token)) {
        yield token;
        next = iterator.next();
      } else if (atLineStart && (token === "case" || token === "match")) {
        const lookahead: string[] = [];
        let nextReal: string | undefined;
        next = iterator.next();
        while (!next.done) {
          lookahead.push(next.value);
          if (next.value !== "\n" && !isPythonWhitespace(next.value)) {
            nextReal = next.value;
            next = iterator.next();
            break;
          }
          next = iterator.next();
        }

        let isKeyword: boolean;
        if (nextReal !== undefined && PythonReader._SOFT_KW_VARIABLE_NEXT.has(nextReal)) {
          isKeyword = false;
        } else if (nextReal === "(" || nextReal === "[") {
          isKeyword = false;
          let depth = 1;
          while (!next.done) {
            const lookaheadToken = next.value;
            lookahead.push(lookaheadToken);
            if (["(", "[", "{"].includes(lookaheadToken)) depth += 1;
            else if ([")", "]", "}"].includes(lookaheadToken)) depth -= 1;
            else if (lookaheadToken === ":" && depth === 0) {
              isKeyword = true;
              next = iterator.next();
              break;
            } else if (lookaheadToken === "\n" && depth === 0) {
              next = iterator.next();
              break;
            }
            next = iterator.next();
          }
        } else {
          isKeyword = true;
        }

        if (token === "case") this._keyword_case = isKeyword;
        else this._keyword_match = isKeyword;
        atLineStart = false;
        yield token;
        yield* lookahead;
      } else {
        if (token === "case") this._keyword_case = false;
        else if (token === "match") this._keyword_match = false;
        atLineStart = false;
        yield token;
        next = iterator.next();
      }
    }
  }
}

export class PythonStates extends CodeStateMachine {
  private _awaiting_first_line = false;

  public get isFirstLine(): boolean {
    return this._awaiting_first_line;
  }

  public readonly reader: PythonReader | undefined;

  public constructor(context: FileInfoBuilder, reader?: PythonReader) {
    super(context);
    this.reader = reader;
    this.next(this._state_global);
  }

  public override readonly _state_global = (token: string): void => {
    if (token === "def") this.next(this._function);
  };

  protected readonly _function = (token: string): void => {
    if (token !== "(") {
      this.context.restartNewFunction(token);
      this.context.addToLongFunctionName("(");
    } else {
      this.next(this._dec);
    }
  };

  private readonly _dec = (token: string): void => {
    if (token === ")") {
      this.next(this._state_colon);
    } else if (token === "[") {
      this.next(this._state_parameterized_type_annotation);
    } else {
      this.context.parameter(token);
      return;
    }
    this.context.addToLongFunctionName(` ${token}`);
  };

  private readonly _state_colon = (token: string): void => {
    if (token === ":") {
      this._awaiting_first_line = true;
      this.next(this._state_first_line);
    } else {
      this.next(this._state_global);
    }
  };

  private readonly _state_first_line = (token: string): void => {
    this._awaiting_first_line = false;
    this.next(this._state_global);
    if (isTripleQuotedString(token)) this.context.addNloc(-token.split("\n").length);
    this._state_global(token);
  };

  private readonly _state_parameterized_type_annotation = (token: string): void => {
    this.context.addToLongFunctionName(` ${token}`);
    if (token === "]") this.next(this._dec);
  };
}

function isTripleQuotedString(token: string): boolean {
  return token.startsWith('"""') || token.startsWith("'''");
}
