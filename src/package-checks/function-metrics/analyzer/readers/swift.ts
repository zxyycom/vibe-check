/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/swift.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */

import type { FileInfoBuilder, TokenStream } from "../core.ts";
import { CCppCommentsMixin } from "../shared/clike.ts";
import { CodeReader, isPythonWhitespace, type TokenFactory } from "../shared/code-reader.ts";
import { GoLikeStates } from "../shared/golike.ts";

/** TypeScript composition equivalent of SwiftReplaceLabel's Python mixin. */
export class SwiftReplaceLabel {
  private readonly conditions: ReadonlySet<string>;

  public constructor(conditions: ReadonlySet<string>) {
    this.conditions = conditions;
  }

  public *preprocess(tokens: TokenStream): Generator<string> {
    function replaceLabel(
      source: string[],
      target: readonly string[],
      replacement: readonly string[]
    ): string[] {
      for (let index = 0; index < source.length - target.length; index += 1) {
        if (target.every((token, offset) => source[index + offset] === token)) {
          replacement.forEach((token, offset) => {
            source[index + offset] = token;
          });
        }
      }
      return source;
    }

    let source = Array.from(tokens).filter((token) => !isPythonWhitespace(token) || token === "\n");

    for (const condition of this.conditions) {
      if (!/^\p{L}+$/u.test(condition)) continue;
      source = replaceLabel(source, ["(", condition, ":"], ["(", `_${condition}`, ":"]);
      source = replaceLabel(source, [",", condition, ":"], [",", `_${condition}`, ":"]);
    }
    yield* source;
  }
}

export class SwiftReader extends CodeReader {
  public static readonly FUNC_KEYWORD = "def";
  public static override ext = ["swift"];
  public static override languageNames = ["swift"];
  public static override controlFlowKeywords = new Set(["if", "for", "while", "catch", "guard"]);
  public static override logicalOperators = new Set(["&&", "||"]);
  public static override caseKeywords = new Set(["case"]);
  public static override ternaryOperators = new Set(["?"]);

  private readonly replaceLabel: SwiftReplaceLabel;

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new SwiftStates(context)];
    this.replaceLabel = new SwiftReplaceLabel(this.conditions);
  }

  public static override generateTokens(
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    return CodeReader.generateTokens(
      sourceCode,
      String.raw`|\`\w+\`|\w+\?|\w+\!|\?\?${addition}`,
      tokenFactory
    );
  }

  public *preprocess(tokens: TokenStream): Generator<string> {
    yield* this.replaceLabel.preprocess(tokens);
  }

  public override get_comment_from_token(token: string): string | undefined {
    return CCppCommentsMixin.get_comment_from_token(token);
  }
}

/* oxlint-disable typescript/unbound-method -- CodeStateMachine invokes stored source methods with this state. */
class SwiftStates extends GoLikeStates {
  public override _state_global(token: string): void {
    if (token === "init" || token === "subscript") {
      this.context.pushNewFunction("");
      this.next(this._function_name, token);
    } else if (["get", "set", "willSet", "didSet", "deinit"].includes(token)) {
      this.context.pushNewFunction(token);
      this.next(this._expect_function_impl);
    } else if (token === "protocol") {
      this.next(this._protocol);
    } else if (["let", "var", "case", ","].includes(token)) {
      this.next(this._expect_declaration_name);
    } else {
      super._state_global(token);
    }
  }

  private readonly _expect_declaration_name = (_token: string): void => {
    this.next(this.globalState);
  };

  private readonly _protocol = (token: string): void => {
    this.readInsideBracketsThen("{}", token, (endToken) => {
      if (endToken === "}") this.next(this.globalState);
    });
  };
}
/* oxlint-enable typescript/unbound-method */
