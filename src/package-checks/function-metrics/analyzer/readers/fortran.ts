/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/fortran.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */

import type { FileInfoBuilder } from "../analysis-context.ts";
import type { TokenStream } from "../contracts.ts";
import {
  CodeReader,
  CodeStateMachine,
  isPythonWhitespace,
  type TokenFactory
} from "../shared/code-reader.ts";

/** Source mixin retained as a constructable class despite TypeScript's single inheritance. */
export class FortranCommentsMixin {
  public static get_comment_from_token(token: string): string | undefined {
    return token.startsWith("!") ? token.slice(1) : undefined;
  }

  public static getCommentFromToken(token: string): string | undefined {
    return this.get_comment_from_token(token);
  }
}

export class FortranReader extends CodeReader {
  public static override ext = ["f70", "f90", "f95", "f03", "f08", "f", "for", "ftn", "fpp"];
  public static override languageNames = ["fortran"];
  public static override controlFlowKeywords = new Set(["IF", "DO", "if", "do"]);
  public static override logicalOperators = new Set([".AND.", ".OR.", ".and.", ".or."]);
  public static override caseKeywords = new Set(["CASE", "case"]);
  public static override ternaryOperators = new Set<string>();
  public static readonly _blocks = [
    "PROGRAM",
    "MODULE",
    "SUBMODULE",
    "SUBROUTINE",
    "FUNCTION",
    "TYPE",
    "INTERFACE",
    "BLOCK",
    "IF",
    "DO",
    "FORALL",
    "WHERE",
    "SELECT",
    "ASSOCIATE"
  ] as const;
  public macro_disabled = false;

  public constructor(context: FileInfoBuilder) {
    super(context, FortranReader);
    this.parallelStates = [new FortranStates(context, this)];
  }

  public static override *generateTokens(
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    const untilEnd = String.raw`(?:\\\n|[^\n])*`;
    const endings = FortranReader._blocks.map((block) => String.raw`END\s*${block}`).join("|");
    const sourceAddition = String.raw`(?i)//|#${untilEnd}|!${untilEnd}|^\*${untilEnd}|\.OR\.|\.AND\.|ELSE\s+IF|MODULE\s+PROCEDURE|${endings}${addition}`;
    yield* CodeReader.generateTokens(sourceCode, sourceAddition, tokenFactory);
  }

  public *preprocess(tokens: TokenStream): Generator<string> {
    let macroDepth = 0;
    let newLine = true;
    for (let token of tokens) {
      if (newLine && (token[0]?.toUpperCase() === "C" || token[0] === "*")) {
        token = `!${token.slice(1)}`;
      }
      newLine = token === "\n";

      const macro = /^#\s*(\w+)/u.exec(token)?.[1]?.toLowerCase();
      if (macro) {
        if (["if", "ifdef", "ifndef", "elif"].includes(macro)) this.context.addCondition();
        if (macroDepth > 0) {
          if (["if", "ifdef", "ifndef"].includes(macro)) macroDepth += 1;
          else if (macro === "endif") macroDepth -= 1;
        } else if (["else", "elif"].includes(macro)) {
          macroDepth += 1;
        }
        this.macro_disabled = macroDepth !== 0;
      } else if (!isPythonWhitespace(token) || token === "\n") {
        yield token;
      }
    }
  }

  public override get_comment_from_token(token: string): string | undefined {
    return FortranCommentsMixin.get_comment_from_token(token);
  }
}

/* Source state callbacks retain their method identity; CodeStateMachine supplies the owning receiver. */
/* oxlint-disable typescript/unbound-method */
class FortranStates extends CodeStateMachine {
  private readonly reader: FortranReader;
  private in_interface = false;
  public static readonly _ends = new RegExp(`END\\s*(?:${FortranReader._blocks.join("|")})`, "iu");
  public static readonly IGNORE_NEXT_TOKENS = new Set(["%", "::", "SAVE", "DATA"]);
  public static readonly IGNORE_VAR_TOKENS = new Set([
    "INTEGER",
    "REAL",
    "COMPLEX",
    "LOGICAL",
    "CHARACTER"
  ]);
  public static readonly RESET_STATE_TOKENS = new Set(["RECURSIVE", "ELEMENTAL"]);
  public static readonly FUNCTION_NAME_TOKENS = new Set(["SUBROUTINE", "FUNCTION"]);
  public static readonly NESTING_KEYWORDS = new Set([
    "FORALL",
    "WHERE",
    "SELECT",
    "INTERFACE",
    "ASSOCIATE"
  ]);
  public static readonly PROCEDURE_TOKENS = new Set(["PROCEDURE", "MODULE PROCEDURE"]);

  public constructor(context: FileInfoBuilder, reader: FortranReader) {
    super(context);
    this.reader = reader;
    this.last_token = undefined;
  }

  public override consume(token: string): boolean {
    if (this.reader.macro_disabled) return false;

    // fortran.py defines its own `__call__`; unlike the shared base it keeps a
    // completed callback installed. Retain that reader-local source behavior.
    if (this.invokeCurrentState(token)) {
      this.next(this.saved_state);
      this.callback?.();
    }
    this.last_token = token;
    return this.to_exit;
  }

  public override _state_global(token: string): void {
    const upper = token.toUpperCase();
    if (FortranStates.IGNORE_NEXT_TOKENS.has(upper)) this._state = this._ignore_next;
    else if (FortranStates.IGNORE_VAR_TOKENS.has(upper)) {
      this._state = this._ignore_var;
    } else if (token === "(") {
      this.next(this._ignore_expr, token);
    } else if (FortranStates.RESET_STATE_TOKENS.has(upper)) {
      this.reset_state();
    } else if (FortranStates.FUNCTION_NAME_TOKENS.has(upper)) {
      this._state = this._function_name;
    } else if (upper === "PROGRAM") {
      this._state = this._namespace;
    } else if (upper === "MODULE") {
      this._state = this._module_or_procedure;
    } else if (upper === "SUBMODULE") {
      this._state = this._module;
      this._module(token);
    } else if (upper === "TYPE") {
      this._state = this._type;
    } else if (upper === "IF") {
      this._state = this._if;
    } else if (upper === "BLOCK") {
      this._state = this._ignore_if_paren;
    } else if (upper === "DO") {
      this._state = this._ignore_if_label;
    } else if (FortranStates.NESTING_KEYWORDS.has(upper)) {
      this.context.addBareNesting();
      if (upper === "INTERFACE") this.in_interface = true;
    } else if (upper === "ELSE") {
      this.context.popNesting();
      this.context.addBareNesting();
    } else if (upper.replaceAll(" ", "") === "ELSEIF") {
      this.context.popNesting();
      if (upper === "ELSEIF") this.context.addCondition();
      this._state = this._if;
    } else if (upper === "END" || FortranStates._ends.test(token)) {
      if (upper.replaceAll(" ", "").startsWith("ENDINTERFACE")) this.in_interface = false;
      this.context.popNesting();
    }
  }

  private readonly reset_state = (token?: string): void => {
    this._state = this._state_global;
    if (token !== undefined) this._state_global(token);
  };

  private readonly _ignore_next = (_token: string): void => {
    this.reset_state();
  };

  private readonly _ignore_var = (token: string): void => {
    if (FortranStates.FUNCTION_NAME_TOKENS.has(token.toUpperCase())) this.reset_state(token);
    else this.reset_state();
  };

  private readonly _ignore_if_paren = (token: string): void => {
    if (token === "(") this.next(this._ignore_expr, token);
    else {
      this.context.addBareNesting();
      this.reset_state();
    }
  };

  private readonly _ignore_if_label = (token: string): void => {
    if (/^\d+$/u.test(token)) this.reset_state();
    else {
      this.context.addBareNesting();
      this.reset_state(token);
    }
  };

  private readonly _ignore_expr = (token: string): void => {
    this.readInsideBracketsThen("()", token, () => {}, this._state_global);
  };

  private readonly _function_name = (token: string): void => {
    this.context.restartNewFunction(token);
    this.context.addToLongFunctionName("(");
    this._state = this._function_has_param;
  };

  private readonly _function_has_param = (token: string): void => {
    if (token === "(") this.next(this._function_params, token);
    else this._function(token);
  };

  private readonly _function_params = (token: string): void => {
    this.readInsideBracketsThen(
      "()",
      token,
      (parameterToken) => {
        if (!"()".includes(parameterToken)) this.context.parameter(parameterToken);
      },
      this._function
    );
  };

  private readonly _function = (token: string): void => {
    this.context.addToLongFunctionName(" )");
    this.context.addBareNesting();
    this.reset_state(token);
  };

  private readonly _module = (token: string): void => {
    const upper = token.toUpperCase();
    if (FortranStates.FUNCTION_NAME_TOKENS.has(upper)) this._state = this._function_name;
    else if (FortranStates.PROCEDURE_TOKENS.has(upper)) this._state = this._procedure;
    else this._namespace(token);
  };

  private readonly _procedure = (token: string): void => {
    this.context.restartNewFunction(token);
    this.context.addBareNesting();
    this.reset_state();
  };

  private readonly _type = (token: string): void => {
    if (token === "," || token === "::" || /^\p{L}/u.test(token)) this._namespace(token);
    else this.reset_state(token);
  };

  private readonly _namespace = (token: string): void => {
    this.context.addNamespace(token);
    this.reset_state();
  };

  private readonly _if = (token: string): void => {
    if (token === "(") this.next(this._if_cond, token);
    else this.reset_state(token);
  };

  private readonly _if_cond = (token: string): void => {
    this.readInsideBracketsThen("()", token, () => {}, this._if_then);
  };

  private readonly _if_then = (token: string): void => {
    if (token.toUpperCase() === "THEN") {
      this.context.addBareNesting();
      this.reset_state();
    } else {
      this.reset_state(token);
    }
  };

  private readonly _module_or_procedure = (token: string): void => {
    if (token.toUpperCase() === "PROCEDURE") this._state = this._procedure;
    else this._module(token);
  };
}
/* oxlint-enable typescript/unbound-method */
