/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/ruby.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript for the product-owned analyzer.
 */

import type { FileInfoBuilder } from "../analysis-context.ts";
import { js_style_regex_expression } from "../shared/js-style-regex.ts";
import { RubylikeReader } from "../shared/rubylike.ts";
import { ScriptLanguageMixIn } from "../shared/script-language.ts";

const RUBY_TOKEN_ADDITION = String.raw`|^=begin|^=end|%[qQrwiI]?\{(?:\\.|[^\}\\])*?\}|%[qQrwiI]?\[(?:\\.|[^\]\\])*?\]|%[qQrwiI]?\<(?:\\.|[^\>\\])*?\>|%[qQrwiI]?\((?:\\.|[^\>\\])*?\)|\w+:|\$\w+|\.+|:?@{0,2}\w+\??\!?`;

/** Python ruby.py's str subclass keeps the token's source-relative start. */
class MyToken {
  public readonly value: string;
  public readonly begin: number;

  public constructor(value: string, begin: number) {
    this.value = value;
    this.begin = begin;
  }
}

export class RubyReader extends RubylikeReader {
  public static override ext: readonly string[] = ["rb"];
  public static override languageNames: readonly string[] = ["ruby"];
  public static override generateTokens = js_style_regex_expression(rubyTokens);

  public constructor(context: FileInfoBuilder) {
    super(context);
  }

  public override get_comment_from_token(token: string): string | undefined {
    return ScriptLanguageMixIn.get_comment_from_token(token);
  }
}

/**
 * Direct translation of ruby.py's MyToken/restart loop. The restart keeps the
 * original token offset semantics around `#{...}` without introducing a
 * separate Ruby lexer.
 */
function* rubyTokens(sourceCode: string, addition = ""): Generator<string> {
  const bracketStack: string[] = [];
  let source: string | undefined = sourceCode;

  while (source !== undefined) {
    const currentSource: string = source;
    let tokenOffset = 0;
    let restarted = false;

    for (const tokenValue of ScriptLanguageMixIn.generate_common_tokens(
      currentSource,
      RUBY_TOKEN_ADDITION + addition
    )) {
      const token = new MyToken(tokenValue, tokenOffset);
      tokenOffset += tokenValue.length;

      if (token.value === "{") {
        bracketStack.push("{");
      } else if (token.value === "}") {
        if (bracketStack.pop() === "#{") {
          source = `"${currentSource.slice(token.begin + 1)}`;
          yield token.value;
          restarted = true;
          break;
        }
      } else if (token.value.startsWith('"')) {
        const interpolationStart = token.value.indexOf("#{");
        if (interpolationStart >= 0) {
          yield `${token.value.slice(0, interpolationStart)}"`;
          yield "${";
          bracketStack.push("#{");
          source = currentSource.slice(token.begin + interpolationStart + 2);
          restarted = true;
          break;
        }
      }

      yield token.value;
    }

    if (!restarted) source = undefined;
  }
}
