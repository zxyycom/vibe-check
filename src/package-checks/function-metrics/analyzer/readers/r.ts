/**
 * Derived from terryyin/lizard 1.23.0.
 * Source: lizard_languages/r.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript for the product-owned analyzer.
 */

import type { FileInfoBuilder, TokenStream } from "../core.ts";
import { CodeReader, CodeStateMachine, isPythonWhitespace } from "../shared/code-reader.ts";
import { ScriptLanguageMixIn } from "../shared/script-language.ts";

export class RReader extends CodeReader {
  public static override ext: readonly string[] = ["r", "R"];
  public static override languageNames: readonly string[] = ["r", "R"];
  public static override controlFlowKeywords = new Set([
    "if",
    "else if",
    "for",
    "while",
    "repeat",
    "switch",
    "tryCatch",
    "try",
    "ifelse"
  ]);
  public static override logicalOperators = new Set(["&&", "||", "&", "|"]);
  public static override caseKeywords = new Set<string>();
  public static override ternaryOperators = new Set<string>();

  public constructor(context: FileInfoBuilder) {
    super(context, RReader);
    this.parallelStates = [new RStates(context)];
  }

  public *preprocess(tokens: TokenStream): Generator<string> {
    yield* tokens;
  }

  public static override generateTokens(sourceCode: string): Generator<string> {
    return ScriptLanguageMixIn.generate_common_tokens(
      sourceCode,
      String.raw`|<-|->|%[a-zA-Z_*/>]+%|\.\.\.|:::|::`
    );
  }

  public override get_comment_from_token(token: string): string | undefined {
    return ScriptLanguageMixIn.get_comment_from_token(token);
  }
}

class RStates extends CodeStateMachine {
  private recent_tokens: string[] = [];
  private brace_count = 0;
  private in_braced_function = false;
  private additional_function_names: string[] = [];

  public constructor(context: FileInfoBuilder) {
    super(context);
  }

  public override _state_global(token: string): void {
    if (!isPythonWhitespace(token) && token !== "\n") {
      this.recent_tokens.push(token);
      if (this.recent_tokens.length > 10) this.recent_tokens.shift();
    }

    if (token !== "function") return;
    if (this.recent_tokens.length >= 2) {
      const assignmentOperator = this.recent_tokens.at(-2);
      if (assignmentOperator === "<-" || assignmentOperator === "=") {
        const functionNames = this._extract_function_names();
        this._start_function(functionNames[0] ?? "(anonymous)");
        this.next(this._function_params);
        this.additional_function_names = functionNames.length > 1 ? functionNames.slice(1) : [];
        return;
      }
    }

    this._start_function("(anonymous)");
    this.next(this._function_params);
  }

  public override statemachine_before_return(): void {
    if (
      this.state === this._function_body ||
      this.state === this._check_right_assignment ||
      this.state === this._read_right_assignment_name
    ) {
      this._finalize_function_with_multiple_assignments();
    }
  }

  private readonly _function_params = (token: string): void => {
    if (token === "(") {
      this.context.addToLongFunctionName("(");
      this.next(this._read_params);
    } else {
      this.next(this._function_body, token);
    }
  };

  private readonly _read_params = (token: string): void => {
    if (token === ")") {
      this.context.addToLongFunctionName(")");
      this.next(this._function_body);
    } else if (token !== "\n" && !isPythonWhitespace(token)) {
      this.context.parameter(token);
      if (token !== "(") this.context.addToLongFunctionName(` ${token}`);
    }
  };

  private readonly _function_body = (token: string): void => {
    if (!isPythonWhitespace(token) && token !== "\n") {
      this.recent_tokens.push(token);
      if (this.recent_tokens.length > 10) this.recent_tokens.shift();
    }

    if (token === "{") {
      if (this.brace_count === 0) this.in_braced_function = true;
      this.brace_count += 1;
    } else if (token === "}") {
      this.brace_count -= 1;
      if (this.brace_count === 0 && this.in_braced_function) {
        this._end_current_function();
        return;
      }
    }

    if (token === "function" && this.recent_tokens.length >= 2) {
      const assignmentOperator = this.recent_tokens.at(-2);
      if (assignmentOperator === "<-" || assignmentOperator === "=") {
        this.context.endOfFunction();
        const functionNames = this._extract_function_names();
        this._start_function(functionNames[0] ?? "(anonymous)");
        this.next(this._function_params);
        this.brace_count = 0;
        this.in_braced_function = false;
        this.additional_function_names = functionNames.length > 1 ? functionNames.slice(1) : [];
      }
    } else if (token === "\n" && !this.in_braced_function) {
      this._end_current_function();
    }
  };

  private readonly _check_right_assignment = (token: string): void => {
    if (isPythonWhitespace(token) || token === "\n" || token.startsWith("#")) return;
    if (token === "->") {
      this.next(this._read_right_assignment_name);
      return;
    }
    this._finalize_function_with_multiple_assignments();
    this.next(this.globalState, token);
  };

  private readonly _read_right_assignment_name = (token: string): void => {
    if (isPythonWhitespace(token) || token === "\n") return;
    if (isRNameFragment(token)) {
      this.context.currentFunction.name = token;
      this._finalize_function_with_multiple_assignments();
      this.next(this.globalState);
      return;
    }
    this._finalize_function_with_multiple_assignments();
    this.next(this.globalState, token);
  };

  private _extract_function_names(): string[] {
    if (this.recent_tokens.length < 3) return ["(anonymous)"];

    const functionNames: string[] = [];
    let index = this.recent_tokens.length - 3;
    let currentNameTokens: string[] = [];
    while (index >= 0) {
      const token = this.recent_tokens[index];
      if (token === "<-" || token === "=") {
        if (currentNameTokens.length > 0) {
          functionNames.push(currentNameTokens.reverse().join(""));
          currentNameTokens = [];
        }
        index -= 1;
        continue;
      }
      if (["function", "(", ")", "{", "}", "\n"].includes(token)) break;
      if (isRNameFragment(token)) {
        currentNameTokens.push(token);
        index -= 1;
      } else {
        break;
      }
    }
    if (currentNameTokens.length > 0) functionNames.push(currentNameTokens.reverse().join(""));
    const ordered = functionNames.reverse();
    return ordered.length > 0 ? ordered : ["(anonymous)"];
  }

  private _extract_function_name(): string {
    return this._extract_function_names()[0] ?? "(anonymous)";
  }

  private _start_function(name: string): void {
    this.context.restartNewFunction(name);
  }

  private _end_current_function(): void {
    this.next(this._check_right_assignment);
    this.brace_count = 0;
    this.in_braced_function = false;
  }

  private _finalize_function_with_multiple_assignments(): void {
    const currentFunction = this.context.currentFunction;
    this.context.endOfFunction();

    for (const functionName of this.additional_function_names) {
      this.context.restartNewFunction(functionName);
      this.context.currentFunction.cyclomaticComplexity = currentFunction.cyclomaticComplexity;
      this.context.currentFunction.startLine = currentFunction.startLine;
      this.context.currentFunction.endLine = currentFunction.endLine;
      this.context.endOfFunction();
    }
    this.additional_function_names = [];
  }
}

function isRNameFragment(token: string): boolean {
  return (
    token
      .replaceAll("_", "a")
      .replaceAll(".", "a")
      .match(/^[\p{L}\p{N}]+$/u) !== null || token === "."
  );
}
