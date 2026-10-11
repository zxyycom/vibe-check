/**
 * Derived from terryyin/lizard 1.24.1.
 * Source: lizard_languages/js_style_regex_expression.py.
 * Upstream revision: 0488a260e74e73ceba3149d7c600faac6a3616e6.
 * SPDX-License-Identifier: MIT
 * Modified: translated to a TypeScript tokenizer wrapper while preserving the
 * upstream streaming literal recognition and Python whitespace behavior.
 */

import { isPythonWhitespace, type TokenFactory } from "./code-reader.ts";

/** A static reader tokenizer shape accepted by the JavaScript regex wrapper. */
export type TokenGenerator = (
  sourceCode: string,
  addition?: string,
  tokenFactory?: TokenFactory
) => Generator<string>;

/** Recognize literals before strings/JSX while preserving the streaming token order. */
export function js_style_regex_expression(generator: TokenGenerator): TokenGenerator {
  return function* generateTokensWithRegex(
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    const regex = String.raw`/(?![/*])(?:\\[^\r\n]|\[(?:\\[^\r\n]|[^\\\]\r\n])*\]|[^/\\[\r\n])+/[a-z]*`;
    // Python \A and \s: absolute-start assertion (tokenizer uses m) plus Python's whitespace set.
    const regexAddition = `${addition}|(?:(?<![^])|(?<=[=,({[?:!&|;]))[\\p{White_Space}\\u001c-\\u001f]*${regex}`;
    for (const token of generator(sourceCode, regexAddition, tokenFactory)) {
      let prefixEnd = 0;
      // Only a slash after a whitespace prefix can need splitting.
      if (token.indexOf("/") > 0) {
        while (isPythonWhitespace(token[prefixEnd] ?? "")) prefixEnd += 1;
      }
      const stripped = token.slice(prefixEnd);
      if (prefixEnd > 0 && stripped.startsWith("/")) {
        let start = 0;
        while (start < prefixEnd) {
          let end = start + 1;
          if (token[start] !== "\n") {
            while (end < prefixEnd && token[end] !== "\n") end += 1;
          }
          yield token.slice(start, end);
          start = end;
        }
        yield stripped;
      } else {
        yield token;
      }
    }
  };
}
