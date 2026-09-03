/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/golike.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript while retaining Go-like function and
 * nested-block state transitions.
 */

import { CodeStateMachine } from "./code-reader.ts";

/**
 * Shared state machine for Go-like readers.
 *
 * Function transition methods deliberately remain prototype methods: source
 * subclasses use `super` and the state machine invokes stored methods with its
 * owning receiver. This preserves both override dispatch and state identity.
 */
/* oxlint-disable typescript/unbound-method */
export class GoLikeStates extends CodeStateMachine {
  protected static readonly FUNC_KEYWORD: string = "func";
  private _type_param_open: string | undefined;
  private _type_param_close: string | undefined;

  public override _state_global(token: string): void {
    if (token === this.getFunctionKeyword()) {
      this.next(this._function_name);
      this.context.pushNewFunction("");
    } else if (token === "type") {
      this.next(this._type_definition);
    } else if (token === "{") {
      this.subState(this.cloneState());
    } else if (token === "}") {
      this.returnFromState();
    }
  }

  protected readonly _type_definition = (_token: string): void => {
    this.next(this._after_type_name);
  };

  private readonly _after_type_name = (token: string): void => {
    if (token === "struct") {
      this.next(this._struct_definition);
    } else if (token === "interface") {
      this.next(this._interface_definition);
    } else {
      this.next(this.globalState);
    }
  };

  private readonly _struct_definition = (token: string): void => {
    this.readInsideBracketsThen("{}", token, this.ignoreToken, this.globalState);
  };

  private readonly _interface_definition = (token: string): void => {
    this.readInsideBracketsThen("{}", token, this.ignoreToken, this.globalState);
  };

  /** Source `_function_name` virtual seam used by Kotlin. */
  protected _function_name(token: string): void {
    if (token === "`") return;
    if (token === "(") {
      const parentFunction = this.context.stackedFunctions.at(-1);
      if (parentFunction?.name !== "*global*") {
        this.next(this._function_dec, token);
      } else {
        this.next(this._member_function, token);
      }
    } else if (token === "{") {
      this.next(this._expect_function_impl, token);
    } else {
      this.context.addToFunctionName(token);
      this.next(this._expect_function_dec);
    }
  }

  private readonly _expect_function_dec = (token: string): void => {
    if (token === "(") {
      this.next(this._function_dec, token);
    } else if (token === "<" || token === "[") {
      this.next(this._skip_type_parameters, token);
    } else {
      this.next(this.globalState);
    }
  };

  private readonly _skip_type_parameters = (token: string): void => {
    if (this.br_count === 0) {
      this._type_param_open = token;
      this._type_param_close = token === "<" ? ">" : "]";
    }
    let typeParameterDelta = 0;
    if (token === this._type_param_open) typeParameterDelta = 1;
    else if (token === this._type_param_close) typeParameterDelta = -1;
    this.br_count += typeParameterDelta;
    if (this.br_count === 0) this.next(this._expect_function_dec);
  };

  private readonly _member_function = (token: string): void => {
    this.readInsideBracketsThen("()", token, this.addMemberFunctionToken, this._function_name);
  };

  private readonly addMemberFunctionToken = (token: string): void => {
    this.context.addToLongFunctionName(token);
  };

  private readonly _function_dec = (token: string): void => {
    this.readInsideBracketsThen("()", token, this.addFunctionParameter, this._expect_function_impl);
  };

  private readonly addFunctionParameter = (token: string): void => {
    if (!"()".includes(token)) this.context.parameter(token);
  };

  /** Source `_expect_function_impl` virtual seam used by Scala and Kotlin. */
  protected _expect_function_impl(token: string): void {
    if (token === "{" && this.lastToken !== "interface") {
      this.next(this._function_impl, token);
    }
  }

  protected readonly _function_impl = (_token: string): void => {
    this.subState(this.cloneState(), () => {
      this.next(this.globalState);
      this.context.endOfFunction();
    });
  };

  private readonly ignoreToken = (_token: string): void => {};

  private getFunctionKeyword(): string {
    const StateMachine = this.stateMachineConstructor;
    if (!hasFunctionKeyword(StateMachine)) return GoLikeStates.FUNC_KEYWORD;
    const keyword = StateMachine.FUNC_KEYWORD;
    return typeof keyword === "string" ? keyword : GoLikeStates.FUNC_KEYWORD;
  }
}
/* oxlint-enable typescript/unbound-method */

function hasFunctionKeyword(value: object): value is { readonly FUNC_KEYWORD?: unknown } {
  return "FUNC_KEYWORD" in value;
}
