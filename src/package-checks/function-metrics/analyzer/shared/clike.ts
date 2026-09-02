/**
 * Derived from terryyin/lizard 1.23.0.
 * Source: lizard_languages/clike.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript with the upstream state ordering and
 * intermediate reader context preserved.
 */

import type { FileInfoBuilder, TokenStream } from "../core.ts";
import {
  CodeReader,
  CodeStateMachine,
  isPythonWhitespace,
  type TokenFactory
} from "./code-reader.ts";

const _CPP_RAW_STRING_TOKEN = String.raw`|(?:u8|u|U|L)?R"\((?:[^)]|\)(?!"))*\)"`;

/** Source-aligned C/C++ comment extraction shared by C-like readers. */
export class CCppCommentsMixin {
  public static get_comment_from_token(token: string): string | undefined {
    if (token.startsWith("/*") || token.startsWith("//")) return token.slice(2);
    return undefined;
  }

  /** TS-facing call sites share the source method's one implementation. */
  public static getCommentFromToken(token: string): string | undefined {
    return this.get_comment_from_token(token);
  }
}

/** Base reader for C, C++, and Java-like source structures. */
export class CLikeReader extends CodeReader {
  public static override ext: readonly string[] = ["c", "cpp", "cc", "cxx", "h", "hpp"];
  public static override languageNames: readonly string[] = ["cpp", "c"];
  private static readonly macro_pattern = /^#\s*(\w+)\s*(.*)/msu;

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [
      new CLikeStates(context),
      new CLikeNestingStackStates(context),
      new CppRValueRefStates(context)
    ];
  }

  public static override generateTokens(
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    const cLikeAddition =
      _CPP_RAW_STRING_TOKEN +
      String.raw`|(?:\d*\.\d+(?:[eE][-+]?\d+)?)` +
      String.raw`|(?:\d+\.(?:\d+)?(?:[eE][-+]?\d+)?)` +
      addition;
    return CodeReader.generateTokens(sourceCode, cLikeAddition, tokenFactory);
  }

  public override get_comment_from_token(token: string): string | undefined {
    return CCppCommentsMixin.get_comment_from_token(token);
  }

  public *preprocess(tokens: TokenStream): Generator<string> {
    let tilde = false;
    for (const token of tokens) {
      if (token === "~") {
        tilde = true;
      } else if (tilde) {
        tilde = false;
        yield `~${token}`;
      } else if (!isPythonWhitespace(token) || token === "\n") {
        const macro = CLikeReader.macro_pattern.exec(token);
        if (macro) {
          const macroName = macro[1] ?? "";
          const macroBody = macro[2] ?? "";
          if (["if", "ifdef", "elif"].includes(macroName)) {
            this.context.addCondition();
          } else if (macroName === "include") {
            yield "#include";
            yield macroBody || '""';
          }
          for (const _line of macroBody.split("\n").slice(1)) {
            yield "\n";
          }
        } else {
          yield token;
        }
      }
    }
  }
}

class CppRValueRefStates extends CodeStateMachine {
  public override statemachine_clone(): CppRValueRefStates {
    return new CppRValueRefStates(this.context);
  }

  public override _state_global(token: string): void {
    if (token === "&&") {
      this.next(this._r_value_ref);
    } else if (token === "typedef") {
      this.next(this._typedef);
    }
  }

  private readonly _r_value_ref = (token: string): void => {
    this.readUntilThen("=;{})", token, this.finishRValueReference);
  };

  private readonly finishRValueReference = (token: string): void => {
    if (token === "=") this.context.addCondition(-1);
    this.next(this.globalState);
  };

  private readonly _typedef = (token: string): void => {
    this.readUntilThen(";", token, this.finishTypedefinition);
  };

  private readonly finishTypedefinition = (
    _token: string,
    _saved_tokens: readonly string[]
  ): void => {
    this.context.addCondition(-_saved_tokens.filter((savedToken) => savedToken === "&&").length);
    this.next(this.globalState);
  };
}

/** Tracks C-like namespace/class and brace nesting independently of functions. */
export class CLikeNestingStackStates extends CodeStateMachine {
  private static readonly __namespace_separators = new Set([
    "<",
    ":",
    "final",
    "[",
    "extends",
    "implements"
  ]);

  public override statemachine_clone(): CLikeNestingStackStates {
    return new CLikeNestingStackStates(this.context);
  }

  public override _state_global(token: string): void {
    if (token === "template") {
      this.next(this._template_declaration);
    } else if (token === ".") {
      this.next(this._dot);
    } else if (["struct", "class", "namespace", "union"].includes(token)) {
      this.next(this._read_namespace);
    } else if (token === "{") {
      this.context.addBareNesting();
    } else if (token === "}") {
      this.context.popNesting();
    }
  }

  private readonly _dot = (_token: string): void => {
    this.next(this.globalState);
  };

  private readonly _read_namespace = (token: string): void => {
    if (token === "[") {
      this.next(this._read_attribute);
      this._read_attribute(token);
    } else {
      this.next(this._read_namespace_name);
      this._read_namespace_name(token);
    }
  };

  private readonly _read_namespace_name = (token: string): void => {
    this.readUntilThen(")({;", token, this.finishNamespaceName);
  };

  private readonly finishNamespaceName = (
    token: string,
    _saved_tokens: readonly string[]
  ): void => {
    this.next(this.globalState);
    if (token !== "{") return;

    let name = "";
    for (const savedToken of _saved_tokens) {
      if (CLikeNestingStackStates.__namespace_separators.has(savedToken)) break;
      name += savedToken;
    }
    this.context.addNamespace(name);
  };

  private readonly _template_declaration = (token: string): void => {
    this.readInsideBracketsThen("<>", token, this.ignoreToken, this.globalState);
  };

  private readonly _read_attribute = (token: string): void => {
    this.readInsideBracketsThen("[]", token, this.ignoreToken, this._read_namespace);
  };

  private readonly ignoreToken = (_token: string): void => {};
}

/**
 * Finds C-like declarations, parameters, and implementations.
 *
 * The following virtual methods are intentionally retained as unbound state
 * slots. `CodeStateMachine` invokes its stored state as `this.state(token)`,
 * which restores this instance as the receiver; preserving the method identity
 * is required for source-derived subclass override and state comparisons.
 */
/* oxlint-disable typescript/unbound-method */
export class CLikeStates extends CodeStateMachine {
  /** Source class attribute `parameter_bracket_open`; TTCN overrides it. */
  protected static readonly parameter_bracket_open: ReadonlySet<string> = new Set(["(", "<"]);
  /** Source class attribute `parameter_bracket_close`; TTCN overrides it. */
  protected static readonly parameter_bracket_close: ReadonlySet<string> = new Set([")", ">"]);
  private readonly bracket_stack: string[] = [];
  private _saved_tokens: string[] = [];

  public constructor(context: FileInfoBuilder) {
    super(context);
  }

  public override statemachine_clone(): CLikeStates {
    return new CLikeStates(this.context);
  }

  protected get parameter_bracket_open(): ReadonlySet<string> {
    const StateMachine = this.stateMachineConstructor;
    return hasParameterBracketDefinitions(StateMachine)
      ? StateMachine.parameter_bracket_open
      : CLikeStates.parameter_bracket_open;
  }

  protected get parameter_bracket_close(): ReadonlySet<string> {
    const StateMachine = this.stateMachineConstructor;
    return hasParameterBracketDefinitions(StateMachine)
      ? StateMachine.parameter_bracket_close
      : CLikeStates.parameter_bracket_close;
  }

  public try_new_function(name: string): void {
    this.context.try_new_function(name);
    this.next(name === "operator" ? this._state_operator : this._state_function);
  }

  public override _state_global(token: string): void {
    if (/^[\p{L}_~]/u.test(token)) {
      this.try_new_function(token);
    } else if (token === "[" && !("className" in this)) {
      this.next(this._state_lambda_check);
    }
  }

  protected readonly _state_function = (token: string): void => {
    if (token === "(") {
      this.next(this._state_dec, token);
    } else if (token === "::") {
      this.context.addToFunctionName(token);
      this.next(this._state_name_with_space);
    } else if (token === "<") {
      this.next(this._state_template_in_name, token);
    } else {
      this.next(this.globalState, token);
    }
  };

  private readonly _state_template_in_name = (token: string): void => {
    this.readInsideBracketsThen("<>", token, this.addTemplateToken, this._state_function);
  };

  private readonly addTemplateToken = (token: string): void => {
    this.context.addToFunctionName(token);
  };

  private readonly _state_operator = (token: string): void => {
    if (token !== "(") this.next(this._state_operator_next);
    this.context.addToFunctionName(` ${token}`);
  };

  private readonly _state_operator_next = (token: string): void => {
    if (token === "(") {
      this._state_function(token);
    } else {
      this.context.addToFunctionName(` ${token}`);
    }
  };

  private readonly _state_name_with_space = (token: string): void => {
    this.next(token === "operator" ? this._state_operator : this._state_function);
    this.context.addToFunctionName(token);
  };

  /** Source override seam: _state_dec. */
  protected _state_dec(token: string): void {
    this.readInsideBracketsThen("()", token, this.readDeclarationToken, this._state_dec_to_imp);
  }

  private readonly readDeclarationToken = (token: string): void => {
    if (this.parameter_bracket_open.has(token)) {
      this.bracket_stack.push(token);
    } else if (this.parameter_bracket_close.has(token)) {
      if (this.bracket_stack.length > 0) {
        this.bracket_stack.pop();
      } else {
        this.next(this.globalState);
      }
    } else if (this.bracket_stack.length === 1) {
      if (token !== "void") this.context.parameter(token);
      return;
    }
    this.context.addToLongFunctionName(token);
  };

  /** Source override seam: _state_dec_to_imp. */
  protected _state_dec_to_imp(token: string): void {
    if (["const", "&", "&&"].includes(token)) {
      this.context.addToLongFunctionName(` ${token}`);
    } else if (token === "throw") {
      this.next(this._state_throw);
    } else if (token === "throws") {
      this.next(this._state_throws);
    } else if (token === "->") {
      this.next(this._state_trailing_return);
    } else if (token === "noexcept") {
      this.next(this._state_noexcept);
    } else if (token === "(") {
      const longName = this.context.currentFunction.longName;
      this.try_new_function(longName);
      this._state_function(token);
    } else if (token === "{") {
      this.next(this._state_entering_imp, "{");
    } else if (token === ":") {
      this.next(this._state_initialization_list);
    } else if (token === "[") {
      this.next(this._state_attribute);
      this._state_attribute(token);
    } else if (!/^[\p{L}_]/u.test(token)) {
      this.next(this.globalState);
      this.globalState(token);
    } else {
      this.next(this._state_old_c_params);
      this._saved_tokens = [token];
    }
  }

  private readonly _state_throw = (token: string): void => {
    this.readInsideBracketsThen("()", token, this.finishThrow);
  };

  private readonly finishThrow = (_token: string): void => {
    this.next(this._state_dec_to_imp);
  };

  private readonly _state_throws = (token: string): void => {
    this.readUntilThen(";{", token, this.finishThrows);
  };

  private readonly finishThrows = (token: string, _savedTokens: readonly string[]): void => {
    this.next(this._state_dec_to_imp);
    this._state_dec_to_imp(token);
  };

  private readonly _state_noexcept = (token: string): void => {
    if (token === "(") {
      this.next(this._state_throw);
      this._state_throw(token);
    } else {
      this.next(this._state_dec_to_imp);
      this._state_dec_to_imp(token);
    }
  };

  private readonly _state_trailing_return = (token: string): void => {
    this.readUntilThen(";{", token, this.finishTrailingReturn);
  };

  private readonly finishTrailingReturn = (
    token: string,
    _savedTokens: readonly string[]
  ): void => {
    this.next(this._state_dec_to_imp);
    this._state_dec_to_imp(token);
  };

  /** Source override seam: _state_old_c_params. */
  protected _state_old_c_params(token: string): void {
    this._saved_tokens.push(token);
    if (token === ";") {
      this._saved_tokens = [];
      this.next(this._state_dec_to_imp);
    } else if (token === "{") {
      if (this._saved_tokens.length === 2) {
        this._saved_tokens = [];
        this._state_dec_to_imp(token);
        return;
      }
      const _saved_tokens = this._saved_tokens;
      this.next(this.globalState);
      for (const savedToken of _saved_tokens) this.globalState(savedToken);
    } else if (token === "(") {
      const _saved_tokens = this._saved_tokens;
      this.next(this.globalState);
      for (const savedToken of _saved_tokens) this.globalState(savedToken);
    }
  }

  private readonly _state_initialization_list = (token: string): void => {
    this.next(this._state_one_initialization);
    if (token === "{") this.next(this._state_entering_imp, "{");
  };

  private readonly _state_one_initialization = (token: string): void => {
    this.readUntilThen("({", token, this.finishOneInitialization);
  };

  private readonly finishOneInitialization = (
    token: string,
    _savedTokens: readonly string[]
  ): void => {
    this.next(
      token === "(" ? this._state_initialization_value1 : this._state_initialization_value2
    );
    if (token === "(") {
      this._state_initialization_value1(token);
    } else {
      this._state_initialization_value2(token);
    }
  };

  private readonly _state_initialization_value1 = (token: string): void => {
    this.readInsideBracketsThen("()", token, this.finishInitializationValue);
  };

  private readonly _state_initialization_value2 = (token: string): void => {
    this.readInsideBracketsThen("{}", token, this.finishInitializationValue);
  };

  private readonly finishInitializationValue = (_token: string): void => {
    this.next(this._state_initialization_list);
  };

  /** Source override seam: _state_entering_imp. */
  protected _state_entering_imp(token: string): void {
    this.context.confirmNewFunction();
    this.next(this._state_imp, token);
  }

  /** Source override seam: _state_imp. */
  protected _state_imp(token: string): void {
    this.readInsideBracketsThen("{}", token, this.finishImplementation);
  }

  private readonly finishImplementation = (_token: string): void => {
    this.next(this.globalState);
  };

  private readonly _state_attribute = (token: string): void => {
    this.readInsideBracketsThen("[]", token, this.ignoreToken, this._state_dec_to_imp);
  };

  private readonly _state_lambda_check = (token: string): void => {
    if (token === "]") {
      this.next(this._state_lambda_params);
    } else if (token === "[") {
      this.next(this._state_attribute);
    } else {
      this.next(this._state_lambda_capture);
    }
  };

  private readonly _state_lambda_params = (token: string): void => {
    if (token === "(") {
      this.bracket_stack.push("(");
      this.next(this._state_lambda_param_list);
    } else {
      this.next(this._state_lambda_body);
      this._state_lambda_body(token);
    }
  };

  private readonly _state_lambda_param_list = (token: string): void => {
    if (token === "(") {
      this.bracket_stack.push("(");
    } else if (token === ")") {
      if (this.bracket_stack.at(-1) === "(") {
        this.bracket_stack.pop();
        if (this.bracket_stack.length === 0) this.next(this._state_lambda_body);
      }
    } else if (["<", "["].includes(token)) {
      this.bracket_stack.push(token);
    } else if (token === ">" && this.bracket_stack.at(-1) === "<") {
      this.bracket_stack.pop();
    } else if (token === "]" && this.bracket_stack.at(-1) === "[") {
      this.bracket_stack.pop();
    }
  };

  private readonly _state_lambda_body = (token: string): void => {
    if (token === "{") {
      this.bracket_stack.push("{");
      this.next(this._state_lambda_body_skip);
    } else if (["mutable", "noexcept", "constexpr", "consteval", "->"].includes(token)) {
      // The upstream state deliberately remains in the lambda qualifier/return type.
    } else if ([";", ",", ")"].includes(token)) {
      this.next(this.globalState);
      this.globalState(token);
    }
  };

  private readonly _state_lambda_body_skip = (token: string): void => {
    if (token === "{") {
      this.bracket_stack.push("{");
    } else if (token === "}" && this.bracket_stack.at(-1) === "{") {
      this.bracket_stack.pop();
      if (this.bracket_stack.length === 0) this.next(this.globalState);
    }
  };

  private readonly _state_lambda_capture = (token: string): void => {
    if (token === "]") this.next(this._state_lambda_params);
  };

  private readonly ignoreToken = (_token: string): void => {};
}
/* oxlint-enable typescript/unbound-method */

interface ParameterBracketDefinitions {
  readonly parameter_bracket_close: ReadonlySet<string>;
  readonly parameter_bracket_open: ReadonlySet<string>;
}

function hasParameterBracketDefinitions(
  stateMachineConstructor: typeof CodeStateMachine
): stateMachineConstructor is typeof CodeStateMachine & ParameterBracketDefinitions {
  return (
    Reflect.get(stateMachineConstructor, "parameter_bracket_open") instanceof Set &&
    Reflect.get(stateMachineConstructor, "parameter_bracket_close") instanceof Set
  );
}
