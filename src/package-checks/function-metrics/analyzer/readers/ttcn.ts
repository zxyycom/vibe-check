/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/ttcn.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript while retaining TTCN's C-like parser,
 * preprocessing, declaration and implementation state transitions.
 */

import type { FileInfoBuilder } from "../core.ts";
import { CLikeNestingStackStates, CLikeReader, CLikeStates } from "../shared/clike.ts";
import { CodeReader, type TokenFactory } from "../shared/code-reader.ts";

/** TTCN-3 reader with source-derived tokenizer additions and condition categories. */
export class TTCNReader extends CLikeReader {
  public static override ext: readonly string[] = ["ttcn", "ttcnpp"];
  public static override languageNames: readonly string[] = ["ttcn", "ttcn3"];
  public static override controlFlowKeywords = new Set([
    "if",
    "for",
    "while",
    "altstep",
    "alt",
    "interleave",
    "goto"
  ]);
  public static override logicalOperators = new Set(["and", "or", "xor"]);
  public static override caseKeywords = new Set(["case"]);
  public static override ternaryOperators = new Set<string>();

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new CLikeNestingStackStates(context), new TTCNStates(context)];
  }

  public static override generateTokens(
    sourceCode: string,
    _addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    return CodeReader.generateTokens(
      sourceCode,
      String.raw`|\.\.|->|<@|@>|@lazy|@fuzzy|@index|@deterministic`,
      tokenFactory
    );
  }
}

/** Direct translation of lizard_languages.ttcn.TTCNStates. */
class TTCNStates extends CLikeStates {
  protected static override readonly parameter_bracket_open = new Set(["("]);
  protected static override readonly parameter_bracket_close = new Set([")"]);

  public override _state_global(token: string): void {
    if (token === "testcase") {
      this.next(this._state_function);
      this.context.restartNewFunction("__testcase__");
    } else if (token === "function") {
      this.next(this._state_function);
      this.context.restartNewFunction("");
    } else if (token === "control") {
      this.context.restartNewFunction("__control__");
      this.next((currentToken) => this._state_dec_to_imp(currentToken));
    }
  }

  protected override readonly _state_function = (token: string): void => {
    if (isAlphabetic(token)) {
      this.context.addToFunctionName(token);
    } else if (token === "(") {
      this.next((currentToken) => this._state_dec(currentToken), token);
    } else if (token === "@deterministic") {
      this.context.addToLongFunctionName(`${token} `);
    } else {
      this.next(this.globalState);
    }
  };

  protected override _state_dec_to_imp(token: string): void {
    if (token === "{") {
      this.next((currentToken) => this._state_imp(currentToken), "{");
    } else {
      this.context.addToLongFunctionName(` ${token}`);
    }
  }
}

function isAlphabetic(token: string): boolean {
  return /^\p{L}/u.test(token);
}
