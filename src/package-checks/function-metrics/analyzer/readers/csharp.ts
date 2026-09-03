/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/csharp.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript while retaining the source CLikeStates
 * overrides for class declarations and expression-bodied members.
 */

import type { FileInfoBuilder } from "../core.ts";
import { CLikeNestingStackStates, CLikeReader, CLikeStates } from "../shared/clike.ts";
import type { TokenFactory } from "../shared/code-reader.ts";

/** C# reader with source-derived condition categories and parallel states. */
export class CSharpReader extends CLikeReader {
  public static override ext: readonly string[] = ["cs"];
  public static override languageNames: readonly string[] = ["csharp"];
  public static override controlFlowKeywords = new Set(["if", "for", "while", "catch"]);
  public static override logicalOperators = new Set(["&&", "||"]);
  public static override caseKeywords = new Set(["case"]);
  public static override ternaryOperators = new Set(["?", "??"]);

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new CSharpStates(context), new CLikeNestingStackStates(context)];
  }

  public static override generateTokens(
    sourceCode: string,
    _addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    return CLikeReader.generateTokens(sourceCode, String.raw`|(?:\?\?)`, tokenFactory);
  }
}

/** Direct translation of lizard_languages.csharp.CSharpStates. */
class CSharpStates extends CLikeStates {
  private in_primary_constructor = false;
  private class_name: string | undefined;

  public constructor(context: FileInfoBuilder) {
    super(context);
  }

  public override statemachine_clone(): CSharpStates {
    return new CSharpStates(this.context);
  }

  public override try_new_function(name: string): void {
    if (this.in_primary_constructor) return;
    super.try_new_function(name);
    if (this.class_name !== undefined && this.context.currentFunction !== undefined) {
      this.context.currentFunction.name = `${this.class_name}::${name}`;
    }
  }

  protected override _state_dec_to_imp(token: string): void {
    if (token === "=>") {
      this.context.confirmNewFunction();
      this.next(this._state_expression_body);
      return;
    }
    super._state_dec_to_imp(token);
  }

  private readonly _state_expression_body = (token: string): void => {
    if (token === ";") {
      this.context.endOfFunction();
      this.next(this.globalState);
    }
  };

  public override _state_global(token: string): void {
    if (["class", "struct", "record"].includes(token)) {
      this.class_name = undefined;
      this.next(this._state_class_declaration);
      return;
    }
    super._state_global(token);
  }

  private readonly _state_class_declaration = (token: string): void => {
    if (token === "(") {
      this.in_primary_constructor = true;
      this.next(this._state_primary_constructor);
    } else if (token === "{") {
      this.next(this.globalState);
    } else if (isAlphabetic(token) && this.class_name === undefined) {
      this.class_name = token;
    }
  };

  private readonly _state_primary_constructor = (token: string): void => {
    this.readInsideBracketsThen(
      "()",
      token,
      this.finishPrimaryConstructor,
      this._state_class_declaration
    );
  };

  private readonly finishPrimaryConstructor = (_token: string): void => {
    this.in_primary_constructor = false;
  };
}

function isAlphabetic(token: string): boolean {
  return /^\p{L}/u.test(token);
}
