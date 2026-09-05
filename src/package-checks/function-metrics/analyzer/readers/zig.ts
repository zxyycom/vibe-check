/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/zig.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */
import type { FileInfoBuilder } from "../analysis-context.ts";
import { CCppCommentsMixin } from "../shared/clike.ts";
import { CodeReader } from "../shared/code-reader.ts";
import { GoLikeStates } from "../shared/golike.ts";
export class ZigReader extends CodeReader {
  public static override ext = ["zig"];
  public static override languageNames = ["zig"];
  public static override controlFlowKeywords = new Set(["if", "for", "while", "try", "catch"]);
  public static override logicalOperators = new Set(["and", "or", "orelse"]);
  public static override caseKeywords = new Set<string>();
  public static override ternaryOperators = new Set(["=>"]);

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new ZigStates(context)];
  }

  public override get_comment_from_token(token: string): string | undefined {
    return CCppCommentsMixin.get_comment_from_token(token);
  }
}

class ZigStates extends GoLikeStates {
  protected static override readonly FUNC_KEYWORD = "fn";

  protected override readonly _type_definition = (token: string): void =>
    super._state_global(token);
}
