/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/objc.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript while retaining Objective-C's CLikeStates
 * declaration override, selector lifecycle and typedef suppression.
 */

import type { FileInfoBuilder } from "../analysis-context.ts";
import { CLikeNestingStackStates, CLikeReader, CLikeStates } from "../shared/clike.ts";

/** Objective-C reader with source-compatible C-like and selector state fan-out. */
export class ObjCReader extends CLikeReader {
  public static override ext: readonly string[] = ["m", "mm"];
  public static override languageNames: readonly string[] = ["objectivec", "objective-c", "objc"];

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new ObjCStates(context), new CLikeNestingStackStates(context)];
  }

  public fake_and_useless(): void {}

  public useless_and_fake(): void {}
}

/** Direct translation of lizard_languages.objc.ObjCStates. */
class ObjCStates extends CLikeStates {
  private _objc_param_paren_depth = 0;

  public override statemachine_clone(): ObjCStates {
    return new ObjCStates(this.context);
  }

  public override _state_global(token: string): void {
    super._state_global(token);
    if (token === "typedef") {
      this.next(this._typedef, token);
    } else if (token === "(") {
      this.next((currentToken) => this._state_dec(currentToken), token);
    }
  }

  protected override _state_dec_to_imp(token: string): void {
    if (token === "+" || token === "-") {
      this.next(this.globalState);
      return;
    }
    super._state_dec_to_imp(token);
    if (this.state !== this._state_imp) {
      this.next(this._state_objc_dec_begin);
      this.context.restartNewFunction(token);
    }
  }

  private readonly _state_objc_dec_begin = (token: string): void => {
    if (token === ":") {
      this.next(this._state_objc_dec);
      this.context.addToFunctionName(token);
    } else if (token === "{") {
      this.next((currentToken) => this._state_entering_imp(currentToken), "{");
    } else {
      this.next(this.globalState);
    }
  };

  private readonly _state_objc_dec = (token: string): void => {
    if (token === "(") {
      this._objc_param_paren_depth = 0;
      this.next(this._state_objc_param_type);
      this.context.addToLongFunctionName(token);
    } else if (token === ",") {
      // Source ignores selector commas.
    } else if (token === "{") {
      this.next((currentToken) => this._state_entering_imp(currentToken), "{");
    } else {
      this.next(this._state_objc_dec_begin);
      this.context.addToFunctionName(` ${token}`);
    }
  };

  private readonly _state_objc_param_type = (token: string): void => {
    if (token === "(") {
      this._objc_param_paren_depth += 1;
    } else if (token === ")") {
      if (this._objc_param_paren_depth > 0) {
        this._objc_param_paren_depth -= 1;
      } else {
        this.next(this._state_objc_param);
      }
    }
    this.context.addToLongFunctionName(` ${token}`);
  };

  private readonly _state_objc_param = (_token: string): void => {
    this.next(this._state_objc_dec);
  };

  private readonly _typedef = (token: string): void => {
    this.readUntilThen(";", token, this.finishTypedef);
  };

  private readonly finishTypedef = (_token: string, _savedTokens: readonly string[]): void => {
    this.next(this.globalState);
  };
}
