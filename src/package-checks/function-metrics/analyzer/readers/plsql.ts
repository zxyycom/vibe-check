/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/plsql.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer with the
 * source PL/SQL preprocessing and declaration/body state lifecycle retained.
 */

import type { FileInfoBuilder } from "../analysis-context.ts";
import type { TokenStream } from "../contracts.ts";
import { CCppCommentsMixin } from "../shared/clike.ts";
import {
  CodeReader,
  CodeStateMachine,
  isPythonWhitespace,
  type TokenFactory
} from "../shared/code-reader.ts";

/** PL/SQL reader for procedures, functions, triggers, package bodies, and nested declarations. */
export class PLSQLReader extends CodeReader {
  public static override ext = ["sql", "pks", "pkb", "pls", "plb", "pck"];
  public static override languageNames = ["plsql", "pl/sql"];
  public static override controlFlowKeywords = new Set(["if", "elsif", "when", "while", "for"]);
  public static override logicalOperators = new Set(["and", "or"]);
  public static override caseKeywords = new Set<string>();
  public static override ternaryOperators = new Set<string>();

  public constructor(context: FileInfoBuilder) {
    super(context, PLSQLReader);
    this.parallelStates = [new PLSQLStates(context)];
    this.conditions = new Set([
      ...this.conditions,
      ...[...this.conditions].map((condition) => condition.toUpperCase())
    ]);
  }

  public *preprocess(tokens: TokenStream): Generator<string> {
    let lastNonWhitespaceToken: string | undefined;
    let pendingTokens: string[] = [];

    for (const token of tokens) {
      if (!isPythonWhitespace(token) || token === "\n") {
        const upper = token.toUpperCase();
        if (lastNonWhitespaceToken?.toUpperCase() === "END") {
          if (["IF", "LOOP", "CASE", "WHILE", "FOR"].includes(upper)) {
            yield `END_${upper}`;
            lastNonWhitespaceToken = undefined;
            pendingTokens = [];
            continue;
          }
        }
        if (lastNonWhitespaceToken?.toUpperCase() === "EXIT" && upper === "WHEN") {
          pendingTokens = [];
          continue;
        }
        if (lastNonWhitespaceToken) yield lastNonWhitespaceToken;
        yield* pendingTokens;
        pendingTokens = [];
        lastNonWhitespaceToken = token;
      } else {
        pendingTokens.push(token);
      }
    }

    if (lastNonWhitespaceToken) yield lastNonWhitespaceToken;
    yield* pendingTokens;
  }

  public static override generateTokens(
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    return CodeReader.generateTokens(sourceCode, String.raw`|--[^\n]*` + addition, tokenFactory);
  }

  public override get_comment_from_token(token: string): string | undefined {
    if (token.startsWith("--")) return token;
    return CCppCommentsMixin.get_comment_from_token(token);
  }
}

/** Source-aligned PL/SQL declaration and BEGIN/END state machine. */
/* Source state callbacks retain their method identity; CodeStateMachine supplies the owning receiver. */
/* oxlint-disable typescript/unbound-method */
class PLSQLStates extends CodeStateMachine {
  private in_parameter_list = false;
  private last_control_keyword: string | undefined;
  private declaring_nested_function = false;
  private nested_br_level: number | undefined;
  private seen_trigger_name_token = false;

  public constructor(context: FileInfoBuilder) {
    super(context);
  }

  public override _state_global(token: string): void {
    const lower = token.toLowerCase();
    if (lower === "procedure") {
      this.next(this._procedure_name);
    } else if (lower === "function") {
      this.next(this._function_name);
    } else if (lower === "trigger") {
      this.next(this._trigger_name);
    }
  }

  private readonly _procedure_name = (token: string): void => {
    if (isPythonWhitespace(token)) return;
    if (token === "(") {
      this.in_parameter_list = true;
      this.next(this._parameters, "(");
    } else if (["is", "as"].includes(token.toLowerCase())) {
      this.context.confirmNewFunction();
      this.next(this._state_before_begin);
    } else {
      if (this.declaring_nested_function) {
        this.context.pushNewFunction(token);
        this.declaring_nested_function = false;
      } else {
        this.context.tryNewFunction(token);
      }
      this.next(this._procedure_after_name);
    }
  };

  private readonly _procedure_after_name = (token: string): void => {
    if (token === ".") {
      this.next(this._procedure_name_after_dot);
    } else if (token === "(") {
      this.in_parameter_list = true;
      this.next(this._parameters, "(");
    } else if (["is", "as"].includes(token.toLowerCase())) {
      this.context.confirmNewFunction();
      this.next(this._state_before_begin);
    }
  };

  private readonly _procedure_name_after_dot = (token: string): void => {
    if (isPythonWhitespace(token)) return;
    this.context.currentFunction.name = token;
    this.next(this._procedure_after_name);
  };

  private readonly _function_name = (token: string): void => {
    if (isPythonWhitespace(token)) return;
    if (token === "(") {
      this.in_parameter_list = true;
      this.next(this._parameters, "(");
    } else if (token.toLowerCase() === "return") {
      this.next(this._return_type);
    } else if (["is", "as"].includes(token.toLowerCase())) {
      this.context.confirmNewFunction();
      this.next(this._state_before_begin);
    } else {
      if (this.declaring_nested_function) {
        this.context.pushNewFunction(token);
        this.declaring_nested_function = false;
      } else {
        this.context.tryNewFunction(token);
      }
      this.next(this._function_after_name);
    }
  };

  private readonly _function_after_name = (token: string): void => {
    if (token === ".") {
      this.next(this._function_name_after_dot);
    } else if (token === "(") {
      this.in_parameter_list = true;
      this.next(this._parameters, "(");
    } else if (token.toLowerCase() === "return") {
      this.next(this._return_type);
    } else if (["is", "as"].includes(token.toLowerCase())) {
      this.context.confirmNewFunction();
      this.next(this._state_before_begin);
    }
  };

  private readonly _function_name_after_dot = (token: string): void => {
    if (isPythonWhitespace(token)) return;
    this.context.currentFunction.name = token;
    this.next(this._function_after_name);
  };

  private readonly _return_type = (token: string): void => {
    if (["is", "as"].includes(token.toLowerCase())) {
      this.context.confirmNewFunction();
      this.next(this._state_before_begin);
    }
  };

  private readonly _parameters = (token: string): void => {
    if (token === ")") {
      this.in_parameter_list = false;
      this.next(this._after_parameters);
    } else if (token === ",") {
      this.context.parameter(token);
    } else if (!isPythonWhitespace(token)) {
      this.context.parameter(token);
    }
  };

  private readonly _after_parameters = (token: string): void => {
    if (token.toLowerCase() === "return") {
      this.next(this._return_type);
    } else if (["is", "as"].includes(token.toLowerCase())) {
      this.context.confirmNewFunction();
      this.next(this._state_before_begin);
    }
  };

  private readonly _trigger_name = (token: string): void => {
    if (isPythonWhitespace(token)) return;
    this.context.tryNewFunction(token);
    this.seen_trigger_name_token = false;
    this.next(this._trigger_after_name);
  };

  private readonly _trigger_after_name = (token: string): void => {
    const lower = token.toLowerCase();
    if (token === "." && !this.seen_trigger_name_token) {
      this.next(this._trigger_name_after_dot);
      return;
    }
    if (!isPythonWhitespace(token)) this.seen_trigger_name_token = true;
    if (lower === "declare") {
      this.context.confirmNewFunction();
      this.next(this._state_before_begin);
    } else if (lower === "begin") {
      this.context.confirmNewFunction();
      this.br_count = 1;
      this.next(this._state_body);
    }
  };

  private readonly _trigger_name_after_dot = (token: string): void => {
    if (isPythonWhitespace(token)) return;
    this.context.currentFunction.name = token;
    this.seen_trigger_name_token = false;
    this.next(this._trigger_after_name);
  };

  private readonly _state_before_begin = (token: string): void => {
    const lower = token.toLowerCase();
    if (lower === "procedure") {
      this.declaring_nested_function = true;
      if (this.nested_br_level === undefined) this.nested_br_level = 0;
      this.next(this._procedure_name);
      return;
    }
    if (lower === "function") {
      this.declaring_nested_function = true;
      if (this.nested_br_level === undefined) this.nested_br_level = 0;
      this.next(this._function_name);
      return;
    }
    if (lower === "begin") {
      if (this.nested_br_level !== undefined) {
        this.br_count = this.nested_br_level + 1;
        this.nested_br_level = undefined;
      } else {
        this.br_count = 1;
      }
      this.next(this._state_body);
    }
  };

  private readonly _state_body = (token: string): void => {
    const lower = token.toLowerCase();
    const upper = token.toUpperCase();
    if (lower.startsWith("end_")) {
      this.last_control_keyword = undefined;
      return;
    }
    if (lower === "procedure") {
      this.next(this._procedure_name);
      return;
    }
    if (lower === "function") {
      this.next(this._function_name);
      return;
    }
    if (["FOR", "WHILE"].includes(upper)) {
      this.last_control_keyword = upper;
    } else if (upper === "LOOP") {
      if (!["FOR", "WHILE"].includes(this.last_control_keyword ?? "")) this.context.addCondition();
      this.last_control_keyword = undefined;
    }
    if (lower === "begin") {
      this.br_count += 1;
      this.context.addBareNesting();
    } else if (lower === "end") {
      this.br_count -= 1;
      if (this.br_count === 0) {
        const hasParent = this.context.stackedFunctions.length > 0;
        this.context.endOfFunction();
        this.next(hasParent ? this._state_before_begin : this._state_global);
        return;
      }
      this.context.popNesting();
    }
  };
}
/* oxlint-enable typescript/unbound-method */
