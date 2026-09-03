/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/lua.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript for the product-owned analyzer.
 */

import type { FileInfoBuilder } from "../core.ts";
import { RubylikeReader, RubylikeStateMachine } from "../shared/rubylike.ts";
import { ScriptLanguageMixIn } from "../shared/script-language.ts";

export class LuaReader extends RubylikeReader {
  public static override ext: readonly string[] = ["lua"];
  public static override languageNames: readonly string[] = ["lua"];

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new LuaStateMachine(context)];
  }

  public static override generateTokens(sourceCode: string): Generator<string> {
    return ScriptLanguageMixIn.generate_common_tokens(
      sourceCode,
      String.raw`|--\[\[.*?\]\]|\[=*\[.*?\]=*\]|--.*?$`
    );
  }

  public override get_comment_from_token(token: string): string | undefined {
    return token.startsWith("--") ? token : undefined;
  }
}

class LuaStateMachine extends RubylikeStateMachine {
  protected static override readonly FUNC_KEYWORD = "function";
  private probable_function_name: string | undefined;

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.probable_function_name = undefined;
  }

  public override _state_global(token: string): void {
    if (token === "=") {
      this.next(this._assigning);
      return;
    }
    this.probable_function_name = token;
    super._state_global(token);
  }

  private readonly _assigning = (token: string): void => {
    if (token === "function") {
      this.next(this._anonymous_def);
      return;
    }
    this.next(this.globalState, token);
  };

  private readonly _anonymous_def = (token: string): void => {
    if (token !== "(") {
      this.next(this._def, token);
      return;
    }
    this.context.pushNewFunction(this.probable_function_name ?? "(anonymous)");
    this.next(this._def_parameters);
  };
}
