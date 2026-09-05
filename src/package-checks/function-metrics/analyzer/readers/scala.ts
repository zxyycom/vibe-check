/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/scala.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */
import type { FileInfoBuilder } from "../analysis-context.ts";
import { CCppCommentsMixin } from "../shared/clike.ts";
import { CodeReader } from "../shared/code-reader.ts";
import { GoLikeStates } from "../shared/golike.ts";

export const __author__ = "David Baum";

export class ScalaReader extends CodeReader {
  public static override ext = ["scala"];
  public static override languageNames = ["scala"];
  public static override controlFlowKeywords = new Set(["if", "for", "while", "catch", "do"]);
  public static override logicalOperators = new Set(["&&", "||"]);
  public static override caseKeywords = new Set(["case"]);
  public static override ternaryOperators = new Set(["?"]);

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new ScalaStates(context)];
  }

  public override get_comment_from_token(token: string): string | undefined {
    return CCppCommentsMixin.get_comment_from_token(token);
  }
}

class ScalaStates extends GoLikeStates {
  protected static override readonly FUNC_KEYWORD = "def";

  public override _state_global(token: string): void {
    super._state_global(token);
  }

  protected override _expect_function_impl(token: string): void {
    if (token === "=") {
      this.next(this._expect_function_body);
    } else {
      super._expect_function_impl(token);
    }
  }

  public override statemachine_before_return(): void {
    if (this.state === this._expect_function_body) this.context.endOfFunction();
  }

  private readonly _expect_function_body = (token: string): void => {
    if (this.context.newline) {
      this.context.endOfFunction();
      this.next(this.globalState, token);
    } else if (token === "{") {
      this.subState(this.cloneState());
    }
  };
}
