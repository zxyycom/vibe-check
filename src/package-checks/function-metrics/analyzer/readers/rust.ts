/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/rust.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */
import type { FileInfoBuilder } from "../analysis-context.ts";
import { CCppCommentsMixin } from "../shared/clike.ts";
import { CodeReader, type TokenFactory } from "../shared/code-reader.ts";
import { GoLikeStates } from "../shared/golike.ts";
export class RustReader extends CodeReader {
  public static override ext = ["rs"];
  public static override languageNames = ["rust"];
  public static override controlFlowKeywords = new Set([
    "if",
    "for",
    "while",
    "catch",
    "match",
    "where"
  ]);
  public static override logicalOperators = new Set(["&&", "||"]);
  public static override caseKeywords = new Set<string>();
  public static override ternaryOperators = new Set(["?"]);

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new RustStates(context)];
  }

  public static override generateTokens(
    sourceCode: string,
    _addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    return CodeReader.generateTokens(sourceCode, String.raw`|(?:'\w+\b)`, tokenFactory);
  }

  public override get_comment_from_token(token: string): string | undefined {
    return CCppCommentsMixin.get_comment_from_token(token);
  }
}

class RustStates extends GoLikeStates {
  protected static override readonly FUNC_KEYWORD = "fn";
}
