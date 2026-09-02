/**
 * Derived from terryyin/lizard 1.23.0.
 * Source: lizard_languages/java.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript while retaining Java's source-derived
 * C-like state overrides, record handling and nested class lifecycle.
 */

import type { FileInfoBuilder } from "../core.ts";
import { CLikeNestingStackStates, CLikeReader, CLikeStates } from "../shared/clike.ts";

/** Java reader with source-specific declaration and nested-class states. */
export class JavaReader extends CLikeReader {
  public static override ext: readonly string[] = ["java"];
  public static override languageNames: readonly string[] = ["java"];

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new JavaStates(context), new CLikeNestingStackStates(context)];
  }
}

/** Direct translation of lizard_languages.java.JavaStates. */
class JavaStates extends CLikeStates {
  protected class_name: string | undefined;
  protected is_record = false;
  private in_record_constructor = false;
  protected in_method_body = false;
  private handling_dot_class = false;
  private handling_method_ref = false;

  public constructor(context: FileInfoBuilder) {
    super(context);
  }

  public override statemachine_clone(): JavaStates {
    return new JavaStates(this.context);
  }

  protected _consume_java_expression_tokens(token: string): boolean {
    if (token === "::") {
      this.handling_method_ref = true;
      return true;
    }
    if (this.handling_method_ref) {
      this.handling_method_ref = false;
      return true;
    }
    if (token === "." && !this.handling_dot_class) {
      this.handling_dot_class = true;
      return true;
    }
    if (this.handling_dot_class) {
      this.handling_dot_class = false;
      if (token === "class") return true;
    }
    return false;
  }

  protected override _state_old_c_params(token: string): void {
    if (token === "{") this._state_dec_to_imp(token);
  }

  protected override _state_imp(token: string): void {
    this.in_method_body = true;
    this.subState(
      new JavaFunctionBodyStates(this.context),
      () => {
        this.in_method_body = false;
        this.next(this.globalState);
      },
      token
    );
  }

  public override try_new_function(name: string): void {
    if (this.is_record && name === this.class_name) {
      this.in_record_constructor = true;
      this.next(this._state_record_compact_constructor);
      return;
    }
    super.try_new_function(name);
    if (this.class_name !== undefined && this.context.currentFunction !== undefined) {
      this.context.currentFunction.name = `${this.class_name}::${name}`;
    }
  }

  protected _try_start_a_class(token: string): boolean {
    if (token === "class" || token === "enum") {
      this.class_name = undefined;
      this.is_record = false;
      this.in_record_constructor = false;
      this.next(this._state_class_declaration);
      return true;
    }
    if (token === "record") {
      if (this.in_method_body) return false;
      this.next(this._state_after_record_keyword);
      return true;
    }
    return false;
  }

  public override _state_global(token: string): void {
    if (this._consume_java_expression_tokens(token)) return;
    if (token === "@") {
      this.next(this._state_decorator);
      return;
    }
    if (this._try_start_a_class(token)) return;
    if (!this.in_record_constructor) super._state_global(token);
  }

  private readonly _state_decorator = (_token: string): void => {
    this.next(this._state_post_decorator);
  };

  private readonly _state_annotation_arguments = (token: string): void => {
    this.readInsideBracketsThen("()", token, this.ignoreJavaToken, this.globalState);
  };

  private readonly _state_post_decorator = (token: string): void => {
    if (token === ".") {
      this.next(this._state_decorator);
    } else if (token === "(") {
      this.next(this._state_annotation_arguments, token);
    } else {
      this.next(this.globalState, token);
    }
  };

  private readonly _state_after_record_keyword = (token: string): void => {
    if (isAlphabetic(token) || token.startsWith("_")) {
      this.class_name = undefined;
      this.is_record = true;
      this.in_record_constructor = false;
      this.next(this._state_class_declaration, token);
      return;
    }
    this.try_new_function("record");
    this.consume(token);
  };

  private readonly _state_class_declaration = (token: string): void => {
    if (token === "{") {
      this.subState(
        new JavaClassBodyStates(this.class_name, this.is_record, this.context),
        () => this.next(this.globalState),
        token
      );
    } else if (token === "(") {
      this.next(this._state_record_parameters);
    } else if (isAlphabetic(token) && this.class_name === undefined) {
      this.class_name = token;
    }
  };

  private readonly _state_record_parameters = (token: string): void => {
    if (token === ")") this.next(this._state_class_declaration);
  };

  private readonly _state_record_compact_constructor = (token: string): void => {
    if (token === "{") {
      this.next(this._state_record_constructor_body);
      return;
    }
    this.next(this.globalState, token);
  };

  private readonly _state_record_constructor_body = (token: string): void => {
    if (token === "}") {
      this.in_record_constructor = false;
      this.next(this.globalState);
    }
  };

  private readonly ignoreJavaToken = (_token: string): void => {};
}

/** Direct translation of lizard_languages.java.JavaFunctionBodyStates. */
class JavaFunctionBodyStates extends JavaStates {
  private ignore_tokens = false;

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.in_method_body = true;
  }

  public override _state_global(token: string): void {
    this.readInsideBracketsThen("{}", token, this.stateInsideBraces, this._state_dummy);
  }

  private readonly stateInsideBraces = (token: string): void => {
    this.readInsideBracketsThen("()", token, this.stateFunctionBody, this._state_dummy);
  };

  private readonly stateFunctionBody = (token: string): void => {
    if (this._consume_java_expression_tokens(token)) return;
    if (this.ignore_tokens) {
      this.ignore_tokens = false;
      return;
    }
    if (token === "new") {
      this.next(this._state_new);
    } else {
      if (this._try_start_a_class(token)) return;
      if (this.bracketCount === 0) this.returnFromState();
    }
  };

  private readonly _state_dummy = (_token: string): void => {};

  private readonly _state_new = (_token: string): void => {
    this.next(this._state_new_parameters);
  };

  private readonly _state_new_parameters = (token: string): void => {
    if (token === "(") {
      this.subState(new JavaFunctionBodyStates(this.context), undefined, token);
    } else if (token === "{") {
      this.subState(
        new JavaClassBodyStates("(anonymous)", false, this.context),
        () => this.next(this.globalState),
        token
      );
    } else {
      this.next(this.globalState, token);
    }
  };
}

/** Direct translation of lizard_languages.java.JavaClassBodyStates. */
class JavaClassBodyStates extends JavaStates {
  private _after_static_keyword = false;
  private _body_brace_depth = 0;

  public constructor(class_name: string | undefined, is_record: boolean, context: FileInfoBuilder) {
    super(context);
    this.class_name = class_name;
    this.is_record = is_record;
  }

  private _handle_class_body_brace(token: string): boolean {
    if (token === "{") {
      if (this.lastToken !== undefined) this._body_brace_depth += 1;
      return false;
    }
    if (token === "}") {
      if (this._body_brace_depth > 0) {
        this._body_brace_depth -= 1;
        return false;
      }
      return true;
    }
    return false;
  }

  public override _state_global(token: string): void {
    if (this._after_static_keyword) {
      this._after_static_keyword = false;
      if (token === "{") {
        this.subState(new JavaFunctionBodyStates(this.context), () => {}, token);
        return;
      }
      super._state_global("static");
      super._state_global(token);
      if (this._handle_class_body_brace(token)) this.returnFromState();
      return;
    }

    if (token === "static") {
      this._after_static_keyword = true;
      return;
    }

    if (token === "{" && ["{", "}", ";"].includes(this.lastToken ?? "")) {
      this.subState(new JavaFunctionBodyStates(this.context), () => {}, token);
      return;
    }

    super._state_global(token);
    if (this._handle_class_body_brace(token)) this.returnFromState();
  }
}

function isAlphabetic(token: string): boolean {
  return /^\p{L}/u.test(token);
}
