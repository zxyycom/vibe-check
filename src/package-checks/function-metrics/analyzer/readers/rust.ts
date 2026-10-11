/**
 * Derived from terryyin/lizard 1.24.1.
 * Source: lizard_languages/rust.py.
 * Upstream revision: 0488a260e74e73ceba3149d7c600faac6a3616e6.
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
  public static override controlFlowKeywords = new Set(["if", "for", "while", "catch", "where"]);
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
  private readonly _in_match_arms: boolean;
  private _seen_match_arm = false;
  private _match_subject_nesting = 0;

  public constructor(context: FileInfoBuilder, inMatchArms = false) {
    super(context);
    this._in_match_arms = inMatchArms;
  }

  public override _state_global(token: string): void {
    if (token === "=>") {
      if (this._in_match_arms) {
        if (this._seen_match_arm) {
          this.context.addCondition();
          // Approved deviation: explain only the real CCN increment. The
          // selected processor initializes this storage; absent without it.
          this.context.currentFunction.complexTags?.push([token, this.context.currentLine]);
        }
        this._seen_match_arm = true;
      }
      return;
    }
    if (token === "match") {
      this._match_subject_nesting = 0;
      this.next(this._match_subject);
      return;
    }
    super._state_global(token);
  }

  private readonly _match_subject = (token: string): void => {
    if (token === "(" || token === "[") {
      this._match_subject_nesting += 1;
      return;
    }
    if (token === ")" || token === "]") {
      if (this._match_subject_nesting > 0) this._match_subject_nesting -= 1;
      return;
    }
    if (token !== "{" || this._match_subject_nesting > 0) return;
    this.subState(new RustStates(this.context, true), this._end_match);
  };

  private readonly _end_match = (): void => {
    this.next(this.globalState);
  };
}
