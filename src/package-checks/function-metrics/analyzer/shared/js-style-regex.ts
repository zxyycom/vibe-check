/**
 * Derived from terryyin/lizard 1.23.0.
 * Source: lizard_languages/js_style_regex_expression.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: translated to a TypeScript tokenizer wrapper while preserving the
 * upstream eager regex-token combination order.
 */

import type { TokenFactory } from "./code-reader.ts";

/** A static reader tokenizer shape accepted by the JavaScript regex wrapper. */
export type TokenGenerator = (
  sourceCode: string,
  addition?: string,
  tokenFactory?: TokenFactory
) => Generator<string>;

/**
 * Wrap a tokenizer with Lizard's JavaScript-style regular-expression joining.
 * The final index advance intentionally mirrors the upstream implementation.
 */
export function js_style_regex_expression(generator: TokenGenerator): TokenGenerator {
  return function* generateTokensWithRegex(
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    const regexPattern = /\/(\S*?[^\s\\]\/)+?(igm)*/u;
    const tokens = Array.from(generator(sourceCode, addition, tokenFactory));
    const result: string[] = [];
    let index = 0;

    while (index < tokens.length) {
      const token = tokens[index];
      if (token === "/") {
        const previousToken = tokens[index - 1]?.trim();
        const isRegex =
          index === 0 ||
          (previousToken !== undefined &&
            previousToken.length > 0 &&
            "=,({[?:!&|;".includes(previousToken.at(-1) ?? ""));
        if (isRegex) {
          const regexTokens = [token];
          index += 1;
          while (index < tokens.length && !tokens[index].endsWith("/")) {
            regexTokens.push(tokens[index]);
            index += 1;
          }
          if (index < tokens.length) {
            regexTokens.push(tokens[index]);
            index += 1;
            if (/^[igm]+$/u.test(tokens[index] ?? "")) {
              regexTokens.push(tokens[index]);
              index += 1;
            }
          }
          const combined = regexTokens.join("");
          if (regexPattern.exec(combined)?.index === 0) {
            result.push(combined);
          } else {
            result.push(...regexTokens);
          }
        } else {
          result.push(token);
        }
      } else if (token !== undefined) {
        result.push(token);
      }
      index += 1;
    }

    yield* result;
  };
}
