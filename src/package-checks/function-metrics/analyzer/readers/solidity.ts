/**
 * Derived from terryyin/lizard 1.23.0.
 * Source: lizard_languages/solidity.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */
import type { FileInfoBuilder } from "../core.ts";
import { CCppCommentsMixin } from "../shared/clike.ts";
import { CodeReader } from "../shared/code-reader.ts";
import { GoLikeStates } from "../shared/golike.ts";
export class SolidityReader extends CodeReader {
  public static override ext = ["sol"];
  public static override languageNames = ["solidity"];
  public static override controlFlowKeywords = new Set(["if", "for", "while"]);
  public static override logicalOperators = new Set(["&&", "||"]);
  public static override caseKeywords = new Set<string>();
  public static override ternaryOperators = new Set(["?"]);

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new SolidityStates(context)];
  }

  public override get_comment_from_token(token: string): string | undefined {
    return CCppCommentsMixin.get_comment_from_token(token);
  }
}

class SolidityStates extends GoLikeStates {
  protected static override readonly FUNC_KEYWORD = "function";
}
