/**
 * Derived from terryyin/lizard 1.23.0.
 * Source: lizard_languages/python.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript for the product-owned analyzer.
 */

import type { FileInfoBuilder, TokenStream } from "../core.ts";
import { CodeReader, CodeStateMachine, isPythonWhitespace } from "../shared/code-reader.ts";
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

  public static override generateTokens(sourceCode: string): Generator<string> {
    return ScriptLanguageMixIn.generate_common_tokens(
      sourceCode,
      String.raw`|(?:"""(?:\.|[^"]|"(?!"")|""(?!"))*""")|(?:'''(?:\.|[^']|'(?!'')|''(?!'))*''')`
    );
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
