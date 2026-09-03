/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/php.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer while
 * retaining the source reader's PHP block tokenizer and state transitions.
 */

import type { FileInfoBuilder } from "../core.ts";
import { CCppCommentsMixin } from "../shared/clike.ts";
import { CodeReader, type TokenFactory } from "../shared/code-reader.ts";
import { PHPLanguageStates } from "./php-states.ts";

const PHP_CODE_BLOCK_PATTERN = /<\?(?:php)?(.*?)(?:(\?>)|(?![\s\S]))/gmsu;
const PHP_TOKEN_ADDITION =
  String.raw`|(?:\$\w+)` +
  String.raw`|(?:<{3}(?<quote>\w+).*?\k<quote>)` +
  String.raw`|(?:\?\?=)|(?:\?\?)|(?:\?->)|(?:\?:)`;

/** PHP reader with the source module's code-block-only tokenizer boundary. */
export class PHPReader extends CodeReader {
  public static override ext = ["php"];
  public static override languageNames = ["php"];
  public static override controlFlowKeywords = new Set([
    "if",
    "elseif",
    "for",
    "foreach",
    "while",
    "catch",
    "match"
  ]);
  public static override logicalOperators = new Set(["&&", "||"]);
  public static override caseKeywords = new Set(["case"]);
  public static override ternaryOperators = new Set(["?"]);

  public constructor(context: FileInfoBuilder) {
    super(context, PHPReader);
    this.parallelStates = [new PHPLanguageStates(context)];
  }

  public static override *generateTokens(
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    let currentPosition = 0;
    for (const match of sourceCode.matchAll(PHP_CODE_BLOCK_PATTERN)) {
      const matchStart = match.index ?? 0;
      if (sourceCode.slice(currentPosition, matchStart)) {
        yield `"${sourceCode.slice(currentPosition, matchStart)}"`;
      }
      yield* CodeReader.generateTokens(match[1] ?? "", addition + PHP_TOKEN_ADDITION, tokenFactory);
      currentPosition = matchStart + (match[0]?.length ?? 0);
    }
    if (sourceCode.slice(currentPosition)) yield `"${sourceCode.slice(currentPosition)}"`;
  }

  public override get_comment_from_token(token: string): string | undefined {
    return CCppCommentsMixin.get_comment_from_token(token);
  }
}
