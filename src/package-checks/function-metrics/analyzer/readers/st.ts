/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/st.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */

import type { FileInfoBuilder, TokenStream } from "../core.ts";
import {
  CodeReader,
  CodeStateMachine,
  isPythonWhitespace,
  splitPythonLines,
  type TokenFactory
} from "../shared/code-reader.ts";

/** Source mixin retained as a constructable class despite TypeScript's single inheritance. */
export class StCommentsMixin {
  public static get_comment_from_token(token: string): string | undefined {
    return token.startsWith("(*") || token.startsWith("//") ? token.slice(2) : undefined;
  }

  public static getCommentFromToken(token: string): string | undefined {
    return this.get_comment_from_token(token);
  }
}

export class StReader extends CodeReader {
  public static override ext = ["st"];
  public static override languageNames = ["st"];
  public static override controlFlowKeywords = new Set([
    "if",
    "elsif",
    "for",
    "while",
    "repeat",
    "IF",
    "ELSIF",
    "FOR",
    "WHILE",
    "REPEAT"
  ]);
  public static override logicalOperators = new Set(["and", "or", "AND", "OR"]);
  public static override caseKeywords = new Set(["case", "CASE"]);
  public static override ternaryOperators = new Set<string>();
  public static readonly macro_pattern = /#\s*(\w+)\s*(.*)/msu;
  public static readonly _functions = new Set(["FUNCTION_BLOCK", "FUNCTION", "ACTION"]);
  public static readonly _blocks = new Set(["IF", "FOR", "WHILE", "CASE", "REPEAT"]);
  public static readonly _ends = new Set(["END"]);
  /** Source `loops` class attribute consumed by the deferred nesting extension. */
  public static readonly loops = [
    "if",
    "case",
    "for",
    "while",
    "repeat",
    "IF",
    "CASE",
    "FOR",
    "WHILE",
    "REPEAT"
  ] as const;
  /** Source `bracket` class attribute consumed by the deferred nesting extension. */
  public static readonly bracket = "END";
  public readonly loops = StReader.loops;
  public readonly bracket = StReader.bracket;

  public constructor(context: FileInfoBuilder) {
    super(context, StReader);
    this.parallelStates = [new StStates(context, this)];
  }

  public static override *generateTokens(
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    const untilEnd = String.raw`(?:\\\n|[^\n])*`;
    const endings = [...StReader._blocks].map((block) => `END_${block}`).join("|");
    const sourceAddition = String.raw`(?i)//${untilEnd}|\(\*${untilEnd}|OR|AND|XOR|NOT|ELSE\s+IF|${endings}${addition}`;
    yield* CodeReader.generateTokens(sourceCode, sourceAddition, tokenFactory);
  }

  public *preprocess(tokens: TokenStream): Generator<string> {
    for (const token of tokens) {
      const macro = StReader.macro_pattern.exec(token);
      if (macro) {
        const directive = macro[1]?.toLowerCase();
        const remainder = macro[2] ?? "";
        if (["if", "ifdef", "ifndef", "elif"].includes(directive ?? "")) {
          this.context.addCondition();
        } else if (directive === "include") {
          yield "#include";
          yield remainder || '""';
        }
        for (const _line of splitPythonLines(remainder).slice(1)) yield "\n";
      } else if (token.toUpperCase().startsWith("END_")) {
        yield "END";
      } else if (!isPythonWhitespace(token) || token === "\n") {
        yield token;
      }
    }
  }

  public override get_comment_from_token(token: string): string | undefined {
    return StCommentsMixin.get_comment_from_token(token);
  }
}

/* Source state callbacks retain their method identity; CodeStateMachine supplies the owning receiver. */
/* oxlint-disable typescript/unbound-method */
class StStates extends CodeStateMachine {
  private readonly reader: StReader;

  public constructor(context: FileInfoBuilder, reader: StReader) {
    super(context);
    this.reader = reader;
    this.last_token = undefined;
  }

  public override consume(token: string): boolean {
    // st.py defines its own `__call__`; retain its reader-local callback slot
    // lifecycle instead of inheriting the shared CodeStateMachine variant.
    if (this.invokeCurrentState(token)) {
      this.next(this.saved_state);
      this.callback?.();
    }
    this.last_token = token;
    return this.to_exit;
  }

  public override _state_global(token: string): void {
    const upper = token.toUpperCase();
    if (StReader._functions.has(upper) && this.context.currentFunction.topNestingLevel < 0) {
      this._state = this._function_name;
    } else if (StReader._blocks.has(upper)) {
      this.context.addBareNesting();
    } else if (StReader._ends.has(token)) {
      this.context.popNesting();
    }
  }

  private readonly _function_name = (token: string): void => {
    this.context.restartNewFunction(token);
    this._state = this._function;
  };

  private readonly _function = (token: string): void => {
    this.context.addBareNesting();
    this.reset_state(token);
  };

  /** Source `reset_state`, retained for the local Structured Text state machine. */
  private reset_state(token?: string): void {
    this._state = this._state_global;
    if (token !== undefined) this._state_global(token);
  }
}
/* oxlint-enable typescript/unbound-method */
