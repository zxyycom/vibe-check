/**
 * Derived from terryyin/lizard 1.24.1.
 * Source: lizard_languages/kotlin.py and lizard_languages/swift.py.
 * Upstream revision: 0488a260e74e73ceba3149d7c600faac6a3616e6.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */

import type { FunctionInfo } from "../analysis-model.ts";
import type { FileInfoBuilder } from "../analysis-context.ts";
import type { TokenStream } from "../contracts.ts";
import { CCppCommentsMixin } from "../shared/clike.ts";
import { CodeReader, type TokenFactory } from "../shared/code-reader.ts";
import { GoLikeStates } from "../shared/golike.ts";
import { SwiftReplaceLabel } from "./swift.ts";

export class KotlinReader extends CodeReader {
  public static override ext = ["kt", "kts"];
  public static override languageNames = ["kotlin"];
  public static override controlFlowKeywords = new Set(["if", "for", "while", "catch"]);
  public static override logicalOperators = new Set(["&&", "||"]);
  public static override caseKeywords = new Set<string>();
  public static override ternaryOperators = new Set(["?:"]);

  private readonly replaceLabel: SwiftReplaceLabel;

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new KotlinStates(context)];
    this.replaceLabel = new SwiftReplaceLabel(this.conditions);
  }

  public static override generateTokens(
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    return CodeReader.generateTokens(
      sourceCode,
      String.raw`|\`\w+\`|\w+\?|\w+\!\!|\?\?|\?:${addition}`,
      tokenFactory
    );
  }

  public *preprocess(tokens: TokenStream): Generator<string> {
    yield* this.replaceLabel.preprocess(tokens);
  }

  public override get_comment_from_token(token: string): string | undefined {
    return CCppCommentsMixin.get_comment_from_token(token);
  }
}

/* oxlint-disable typescript/unbound-method -- CodeStateMachine invokes stored source methods with this state. */
class KotlinStates extends GoLikeStates {
  protected static override readonly FUNC_KEYWORD = "fun";

  private static readonly _EXPRESSION_BODY_ENDERS = new Set([
    "fun",
    "class",
    "interface",
    "val",
    "var",
    "get",
    "set"
  ]);
  private readonly _in_when_cases: boolean;
  private _expr_nesting = 0;
  private _when_return_state = this.globalState;
  private expressionBoundary:
    | {
        readonly functionInfo: FunctionInfo;
        endLine: number;
        nloc: number;
      }
    | undefined;

  public constructor(context: FileInfoBuilder, _in_when_cases = false) {
    super(context);
    this._in_when_cases = _in_when_cases;
  }

  public override _state_global(token: string): void {
    if (token === "get" || token === "set") {
      this.context.pushNewFunction(token);
      this.next(this._expect_function_impl);
    } else if (token === "->") {
      if (this._in_when_cases) {
        this.context.addCondition();
      } else {
        this.context.pushNewFunction("(anonymous)");
        this.next(super._expect_function_impl);
      }
    } else if (token === "val" || token === "var" || token === ",") {
      this.next(this._expect_declaration_name);
    } else if (token === "interface") {
      this.next(this._interface);
    } else if (token === "when") {
      this._start_when(this.globalState);
    } else {
      super._state_global(token);
    }
  }

  protected override _expect_function_impl(token: string): void {
    if (token === "=") {
      this._expr_nesting = 0;
      const functionInfo = this.context.currentFunction;
      this.expressionBoundary = {
        functionInfo,
        endLine: functionInfo.endLine,
        nloc: functionInfo.nloc
      };
      this.next(this._expression_body);
    } else if (token === "{") {
      this.next(this._function_impl, token);
    }
  }

  public override consume(token: string): boolean {
    const result = super.consume(token);
    // Counters run before reader states. Snapshot only a consumed body token,
    // including when sub-state tokens, never the ender belonging to its parent.
    const boundary = this.expressionBoundary;
    if (boundary !== undefined) {
      boundary.endLine = boundary.functionInfo.endLine;
      boundary.nloc = boundary.functionInfo.nloc;
    }
    return result;
  }

  public override statemachine_before_return(): void {
    if (this._state === this._expression_body) this._end_expression_body();
  }

  private readonly _start_when = (returnState: typeof this.globalState): void => {
    this._when_return_state = returnState;
    this.next(this._when_cases);
  };

  private readonly _expression_body = (token: string): void => {
    if (token === "when") {
      this._start_when(this._expression_body);
      return;
    }
    if (token === "{" || token === "(" || token === "[") {
      this._expr_nesting += 1;
      return;
    }
    if (token === ")" || token === "]" || token === "}") {
      if (this._expr_nesting > 0) this._expr_nesting -= 1;
      else if (token === "}") this._end_expression_body(token);
      return;
    }
    if (this._expr_nesting === 0 && this._is_expression_body_ender(token)) {
      this._end_expression_body(token);
    }
  };

  private readonly _is_expression_body_ender = (token: string): boolean => {
    if (token === "class" && this.last_token === "::") return false;
    return KotlinStates._EXPRESSION_BODY_ENDERS.has(token);
  };

  private readonly _end_expression_body = (token?: string): void => {
    const boundary = this.expressionBoundary;
    if (boundary !== undefined) {
      boundary.functionInfo.endLine = boundary.endLine;
      boundary.functionInfo.nloc = boundary.nloc;
      this.expressionBoundary = undefined;
    }
    this.context.endOfFunction();
    this.next(this.globalState, token);
  };

  protected override _function_name(token: string): void {
    if (token === "<") {
      this.next(this._template, token);
      return;
    }
    super._function_name(token);
  }

  private readonly _expect_declaration_name = (_token: string): void => {
    this.next(this.globalState);
  };

  private readonly _interface = (token: string): void => {
    this.readInsideBracketsThen("{}", token, (endToken) => {
      if (endToken === "}") this.next(this.globalState);
    });
  };

  private readonly _template = (token: string): void => {
    this.readInsideBracketsThen("<>", token, () => undefined, this._function_name);
  };

  private readonly _when_cases = (token: string): void => {
    if (token !== "{") return;
    this.subState(new KotlinStates(this.context, true), () => {
      this.context.addCondition(-1);
      this.next(this._when_return_state);
    });
  };
}
/* oxlint-enable typescript/unbound-method */
