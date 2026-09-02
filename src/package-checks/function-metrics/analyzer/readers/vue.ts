/**
 * Derived from terryyin/lizard 1.23.0.
 * Source: lizard_languages/vue.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */

import type { FileInfoBuilder, TokenStream } from "../core.ts";
import { isPythonWhitespace, type TokenFactory } from "../shared/code-reader.ts";
import { TypeScriptReader } from "./typescript.ts";

export class VueReader extends TypeScriptReader {
  public static override ext = ["vue"];
  public static override languageNames = ["vue", "vuejs"];

  public constructor(context: FileInfoBuilder) {
    super(context);
  }

  public static override *generateTokens(
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    yield* TypeScriptReader.generateTokens(
      sourceCode,
      `${addition}|(?:<\\/?\\w+.*?>)`,
      tokenFactory
    );
  }

  public *preprocess(tokens: TokenStream): Generator<string> {
    let currentBlock: "script" | undefined;
    for (const token of tokens) {
      if (token.startsWith("<script")) currentBlock = "script";
      else if (token.startsWith("</script")) currentBlock = undefined;
      else if (currentBlock === "script" && (!isPythonWhitespace(token) || token === "\n"))
        yield token;
    }
  }
}
