/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/kotlin.py and lizard_languages/swift.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */

import type { FileInfoBuilder } from "../analysis-context.ts";
import type { TokenStream } from "../contracts.ts";
import { CCppCommentsMixin } from "../shared/clike.ts";
import { CodeReader, type TokenFactory } from "../shared/code-reader.ts";
import { GoLikeStates } from "../shared/golike.ts";
import { SwiftReplaceLabel } from "./swift.ts";

export class KotlinReader extends CodeReader {
  public static override ext = ["kt", "kts"];
  public static override languageNames = ["kotlin"];
  public static override controlFlowKeywords = new Set(["if", "for", "while", "catch"]);
  public static override logicalOperators = new Set(["&&", "||"]);
  public static override caseKeywords = new Set<string>();
  public static override ternaryOperators = new Set(["?:"]);

  private readonly replaceLabel: SwiftReplaceLabel;

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new KotlinStates(context)];
    this.replaceLabel = new SwiftReplaceLabel(this.conditions);
  }

  public static override generateTokens(
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    return CodeReader.generateTokens(
      sourceCode,
      String.raw`|\`\w+\`|\w+\?|\w+\!\!|\?\?|\?:${addition}`,
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
class KotlinStates extends GoLikeStates {
  protected static override readonly FUNC_KEYWORD = "fun";

  private readonly _in_when_cases: boolean;

  public constructor(context: FileInfoBuilder, _in_when_cases = false) {
    super(context);
    this._in_when_cases = _in_when_cases;
  }

  public override _state_global(token: string): void {
    if (token === "get" || token === "set") {
      this.context.pushNewFunction(token);
      this.next(this._expect_function_impl);
    } else if (token === "->") {
      if (this._in_when_cases) {
        this.context.addCondition();
      } else {
        this.context.pushNewFunction("(anonymous)");
        this.next(super._expect_function_impl);
      }
    } else if (token === "val" || token === "var" || token === ",") {
      this.next(this._expect_declaration_name);
    } else if (token === "interface") {
      this.next(this._interface);
    } else if (token === "when") {
      this.next(this._when_cases);
    } else {
      super._state_global(token);
    }
  }

  protected override _expect_function_impl(token: string): void {
    if (token === "{" || token === "=") this.next(this._function_impl, token);
  }

  protected override _function_name(token: string): void {
    if (token === "<") {
      this.next(this._template, token);
      return;
    }
    super._function_name(token);
  }

  private readonly _expect_declaration_name = (_token: string): void => {
    this.next(this.globalState);
  };

  private readonly _interface = (token: string): void => {
    this.readInsideBracketsThen("{}", token, (endToken) => {
      if (endToken === "}") this.next(this.globalState);
    });
  };

  private readonly _template = (token: string): void => {
    this.readInsideBracketsThen("<>", token, () => undefined, this._function_name);
  };

  private readonly _when_cases = (token: string): void => {
    if (token !== "{") return;
    this.subState(new KotlinStates(this.context, true), () => {
      this.context.addCondition(-1);
      this.next(this.globalState);
    });
  };
}
/* oxlint-enable typescript/unbound-method */
