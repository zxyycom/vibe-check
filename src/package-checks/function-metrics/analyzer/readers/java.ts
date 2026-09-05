/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/java.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript while retaining Java's source-derived
 * C-like state overrides, record handling and nested class lifecycle.
 */

import type { FileInfoBuilder } from "../analysis-context.ts";
import { CLikeNestingStackStates, CLikeReader, CLikeStates } from "../shared/clike.ts";
import { createJavaBodyStates } from "./java-body-states.ts";

const JAVA_CLASS_MODIFIERS = new Set([
  "public",
  "private",
  "protected",
  "static",
  "final",
  "strictfp",
  "abstract",
  "synchronized",
  "native",
  "default",
  "transient",
  "volatile",
  "sealed",
  "non-sealed"
]);
const JAVA_TYPE_KEYWORDS = new Set([
  "void",
  "boolean",
  "byte",
  "char",
  "short",
  "int",
  "long",
  "float",
  "double",
  "var"
]);
export const JAVA_BRACE_COUNT: Readonly<Record<string, number>> = { "{": 1, "}": -1 };
const JAVA_STATEMENT_KEYWORDS = new Set([
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "catch",
  "try",
  "finally",
  "synchronized",
  "return",
  "throw",
  "assert",
  "break",
  "continue",
  "instanceof"
]);

function javaRecordBeginsTypeDeclaration(
  lastToken: string | undefined,
  afterUnqualifiedAnnotation: boolean
): boolean {
  if (afterUnqualifiedAnnotation || lastToken === undefined) return true;
  if (JAVA_TYPE_KEYWORDS.has(lastToken) || lastToken === "]" || lastToken === ">") return false;
  if (/^(?:_|\$|\{)/u.test(lastToken)) return false;
  if (/^\p{Ll}/u.test(lastToken) && JAVA_CLASS_MODIFIERS.has(lastToken)) return true;
  if (/^\p{Lu}/u.test(lastToken)) return false;
  return ["{", "}", ";", ")", "@"].includes(lastToken);
}

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
export class JavaStates extends CLikeStates {
  protected class_name: string | undefined;
  protected is_record = false;
  protected in_record_constructor = false;
  protected in_method_body = false;
  protected handling_dot_class = false;
  protected handling_method_ref = false;
  protected _java_after_unqualified_annotation = false;
  protected _new_generic_depth = 0;

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
      new JavaFunctionBodyStates(this.context, true),
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

  protected _try_start_a_class(token: string, afterUnqualifiedAnnotation = false): boolean {
    if (token === "class" || token === "enum") {
      this._java_after_unqualified_annotation = false;
      this.class_name = undefined;
      this.is_record = false;
      this.in_record_constructor = false;
      this.next(this._state_class_declaration);
      return true;
    }
    if (token === "record") {
      if (this.in_method_body) return false;
      if (!javaRecordBeginsTypeDeclaration(this.lastToken, afterUnqualifiedAnnotation)) {
        this._java_after_unqualified_annotation = false;
        return false;
      }
      this._java_after_unqualified_annotation = false;
      this.class_name = undefined;
      this.is_record = true;
      this.in_record_constructor = false;
      this.next(this._state_class_declaration);
      return true;
    }
    return false;
  }

  public override _state_global(token: string): void {
    if (this._consume_java_expression_tokens(token)) return;
    const useAfterAnnotation = this._java_after_unqualified_annotation;
    if (token !== "record") this._java_after_unqualified_annotation = false;
    if (token === "@") {
      this.next(this._state_decorator);
      return;
    }
    if (this._try_start_a_class(token, useAfterAnnotation)) return;
    if (JAVA_STATEMENT_KEYWORDS.has(token)) return;
    if (!this.in_record_constructor) super._state_global(token);
  }

  protected readonly _state_decorator = (_token: string): void => {
    this.next(this._state_post_decorator);
  };

  protected readonly _state_annotation_arguments = (token: string): void => {
    this.readInsideBracketsThen("()", token, this.ignoreJavaToken, this.globalState);
  };

  protected readonly _state_post_decorator = (token: string): void => {
    if (token === ".") {
      this.next(this._state_decorator);
    } else if (token === "(") {
      this.next(this._state_annotation_arguments, token);
    } else {
      this._java_after_unqualified_annotation = true;
      this.next(this.globalState);
    }
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
    } else if (/^\p{L}/u.test(token) && this.class_name === undefined) {
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

  protected readonly _state_new = (_token: string): void => {
    this._new_generic_depth = 0;
    this.next(this._state_new_parameters);
  };

  protected readonly _state_new_parameters = (token: string): void => {
    if (this._new_generic_depth > 0 || token.startsWith("<")) {
      this._new_generic_depth += countCharacters(token, "<") - countCharacters(token, ">");
      return;
    }
    if (token === "(") {
      this.subState(new JavaFunctionBodyStates(this.context, false), undefined, token);
      return;
    }
    if (token === "{") {
      this.subState(
        new JavaClassBodyStates("(anonymous)", false, this.context),
        () => this.next(this.globalState),
        token
      );
      return;
    }
    if (token === "." || /^\p{L}/u.test(token) || token.startsWith("_")) return;
    this.next(this.globalState, token);
  };

  private readonly ignoreJavaToken = (_token: string): void => {};
}

const { JavaClassBodyStates, JavaFunctionBodyStates } = createJavaBodyStates(
  JavaStates,
  JAVA_BRACE_COUNT
);

function countCharacters(value: string, character: string): number {
  return value.split(character).length - 1;
}
