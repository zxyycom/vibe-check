/**
 * Derived from terryyin/lizard 1.23.0.
 * Source: lizard_languages/script_language.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript while retaining the source mixin's
 * static comment and tokenizer members.
 */

import { CodeReader, type TokenFactory } from "./code-reader.ts";

const untilEnd = String.raw`(?:\\\n|[^\n])*`;

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
    return CodeReader.generateTokens(sourceCode, `|#${untilEnd}${addition}`, tokenFactory);
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
