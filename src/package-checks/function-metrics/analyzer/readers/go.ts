/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/go.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */

import type { AnalyzerReader, FileInfoBuilder, TokenStream } from "../core.ts";
import { CCppCommentsMixin } from "../shared/clike.ts";
import { CodeReader, type TokenFactory } from "../shared/code-reader.ts";
import { GoLikeStates } from "../shared/golike.ts";

export class GoReader extends CodeReader {
  public static override ext = ["go"];
  public static override languageNames = ["go"];

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new GoStates(context)];
  }

  public static override generateTokens(
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    return CodeReader.generateTokens(sourceCode, `${addition}|\`[^\`]*\``, tokenFactory);
  }

  public override get_comment_from_token(token: string): string | undefined {
    return CCppCommentsMixin.get_comment_from_token(token);
  }

  public override *__call__(tokens: TokenStream, reader: AnalyzerReader): Generator<string> {
    this.context = reader.context;
    for (const token of tokens) {
      if (token.startsWith("`") && token.endsWith("`")) {
        for (const state of this.parallel_states) state.consume(token);
        yield token;
        continue;
      }

      for (const state of this.parallel_states) state.consume(token);
      yield token;
    }
    for (const state of this.parallel_states) state.statemachine_before_return();
    this.eof();
  }
}

class GoStates extends GoLikeStates {}
