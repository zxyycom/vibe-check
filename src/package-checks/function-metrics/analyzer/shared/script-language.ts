/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/script_language.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript while retaining the source mixin's
 * static comment and tokenizer members.
 */

import { CodeReader, type TokenFactory } from "./code-reader.ts";

/** Common comment extraction and tokenization used by script-language readers. */
export class ScriptLanguageMixIn {
  public static get_comment_from_token(token: string): string | undefined {
    if (!token.startsWith("#")) return undefined;

    const stripped = token.replace(/^#+/u, "").trim();
    if (
      stripped.startsWith("lizard forgive global") ||
      stripped.startsWith("#lizard forgive global")
    ) {
      return "#lizard forgive global";
    }
    if (stripped.startsWith("lizard forgive") || stripped.startsWith("#lizard forgive")) {
      return "#lizard forgive";
    }
    return stripped;
  }

  public static generate_common_tokens(
    sourceCode: string,
    addition: string,
    tokenFactory?: TokenFactory
  ): Generator<string> {
    return CodeReader.generateTokens(sourceCode, String.raw`|#[^\n]*${addition}`, tokenFactory);
  }

  /** TS-facing call sites share the source methods' implementations. */
  public static getCommentFromToken(token: string): string | undefined {
    return this.get_comment_from_token(token);
  }

  public static generateCommonTokens(
    sourceCode: string,
    addition: string,
    tokenFactory?: TokenFactory
  ): Generator<string> {
    return this.generate_common_tokens(sourceCode, addition, tokenFactory);
  }
}
