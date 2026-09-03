/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/java_body_states.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript while retaining Java method- and
 * class-body nesting states.
 */

import type { FileInfoBuilder } from "../core.ts";
import type { JavaStates } from "./java.ts";

/**
 * Binds source body-state subclasses after JavaStates exists, avoiding an ESM
 * initialization cycle while retaining the source module's class boundaries.
 */
export function createJavaBodyStates(
  JavaStatesBase: typeof JavaStates,
  javaBraceCount: Readonly<Record<string, number>>
): {
  readonly JavaClassBodyStates: new (
    className: string | undefined,
    isRecord: boolean,
    context: FileInfoBuilder
  ) => JavaStates;
  readonly JavaFunctionBodyStates: new (
    context: FileInfoBuilder,
    exitWithBraceDepth?: boolean
  ) => JavaStates;
} {
  /** Direct translation of lizard_languages.java_body_states.JavaFunctionBodyStates. */
  class JavaFunctionBodyStates extends JavaStatesBase {
    private ignore_tokens = false;
    private readonly _exit_with_brace_depth: boolean;
    private _java_block_brace = 0;

    public constructor(context: FileInfoBuilder, exitWithBraceDepth = true) {
      super(context);
      this.in_method_body = true;
      this._exit_with_brace_depth = exitWithBraceDepth;
    }

    public override _state_global(token: string): void {
      this.readInsideBracketsThen("{}", token, this.stateInsideBraces, this._state_dummy);
    }

    private readonly stateInsideBraces = (token: string): void => {
      this.readInsideBracketsThen("()", token, this.stateFunctionBody, this._state_dummy);
    };

    private readonly stateFunctionBody = (token: string): void => {
      if (this._consume_java_expression_tokens(token)) return;
      const useAfterAnnotation = this._java_after_unqualified_annotation;
      if (token !== "record") this._java_after_unqualified_annotation = false;
      if (token === "@") {
        this.next(this._state_decorator);
        return;
      }
      if (this._try_start_a_class(token, useAfterAnnotation)) return;
      if (this.ignore_tokens) {
        this.ignore_tokens = false;
        return;
      }
      if (token === "new") {
        this.next(this._state_new);
      } else if (this._exit_with_brace_depth) {
        const braceDelta = javaBraceCount[token];
        if (braceDelta !== undefined) {
          this._java_block_brace += braceDelta;
          if (this._java_block_brace === 0) this.returnFromState();
        }
      } else if (this.br_count === 0) {
        this.returnFromState();
      }
    };

    private readonly _state_dummy = (_token: string): void => {};
  }

  /** Direct translation of lizard_languages.java_body_states.JavaClassBodyStates. */
  class JavaClassBodyStates extends JavaStatesBase {
    private _after_static_keyword = false;
    private _class_body_brace = 0;

    public constructor(className: string | undefined, isRecord: boolean, context: FileInfoBuilder) {
      super(context);
      this.class_name = className;
      this.is_record = isRecord;
    }

    public override _state_global(token: string): void {
      if (this._after_static_keyword) {
        this._after_static_keyword = false;
        if (token === "{") {
          this._class_body_brace += 1;
          this.subState(
            new JavaFunctionBodyStates(this.context, true),
            () => {
              this._class_body_brace -= 1;
            },
            token
          );
          return;
        }
        super._state_global("static");
        super._state_global(token);
        if (token === "}" && this._class_body_brace === 0) this.returnFromState();
        return;
      }

      if (token === "static") {
        this._after_static_keyword = true;
        return;
      }

      if (token === "{" && ["{", "}", ";"].includes(this.lastToken ?? "")) {
        this._class_body_brace += 1;
        this.subState(
          new JavaFunctionBodyStates(this.context, true),
          () => {
            this._class_body_brace -= 1;
          },
          token
        );
        return;
      }

      if (token === "new") {
        this.next(this._state_new);
        return;
      }

      super._state_global(token);
      const braceDelta = javaBraceCount[token];
      if (braceDelta !== undefined) this._class_body_brace += braceDelta;
      if (token === "}" && this._class_body_brace === 0) this.returnFromState();
    }
  }

  return { JavaClassBodyStates, JavaFunctionBodyStates };
}
