/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/rubylike.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript with source-aligned nested-state and
 * callback sequencing for Ruby-like readers.
 */

import type { FileInfoBuilder } from "../core.ts";
import { CodeReader, CodeStateMachine } from "./code-reader.ts";
import { ScriptLanguageMixIn } from "./script-language.ts";

/** The embedded-document substate from the upstream module. */
export function state_embedded_doc(token: string): boolean {
  return token === "=end";
}

/** Shared function/block state machine for Ruby-like languages. */
export class RubylikeStateMachine extends CodeStateMachine {
  protected static readonly FUNC_KEYWORD: string = "def";

  public constructor(context: FileInfoBuilder) {
    super(context);
  }

  public override _state_global(token: string): void {
    if (token === "end" || token === "}") {
      this.returnFromState();
    } else if (token === this.getFunctionKeyword()) {
      this.next(this._def);
    } else if (token === "it") {
      this.next(this._it);
    } else if (
      ["begin", "do", "class", "module", "{", "${"].includes(token) &&
      this.lastToken !== "."
    ) {
      this.subState(this.cloneState());
    } else if (["while", "for"].includes(token)) {
      if (this.is_newline()) this.next(this._for_while);
    } else if (["if", "unless"].includes(token)) {
      if (this.is_newline()) {
        this.subState(this.cloneState());
      } else {
        this.next(this._if);
      }
    } else if (token === "=begin") {
      this.subState(state_embedded_doc);
    }
  }

  public is_newline(): boolean {
    return this.context.newline || this.lastToken === ";";
  }

  private getFunctionKeyword(): string {
    const StateMachine = this.stateMachineConstructor;
    if (!hasFunctionKeyword(StateMachine)) return RubylikeStateMachine.FUNC_KEYWORD;
    const keyword = StateMachine.FUNC_KEYWORD;
    return typeof keyword === "string" ? keyword : RubylikeStateMachine.FUNC_KEYWORD;
  }

  /** Source `_def` seam used by Lua's `_anonymous_def` transition. */
  protected readonly _def = (token: string): void => {
    if (token === "(") {
      this.context.pushNewFunction("(anonymous)");
      this.next(this._def_parameters);
      return;
    }
    this.context.pushNewFunction(token);
    this.next(this._def_continue);
  };

  private readonly _it = (token: string): void => {
    if (token === "do" || token === "{") {
      this.context.pushNewFunction(this.lastToken ?? "");
      this.next(this._def_continue);
    }
  };

  /** Source `_def_continue` seam used by Lua _defs. */
  protected readonly _def_continue = (token: string): void => {
    const finishDefinition = (): void => {
      this.context.endOfFunction();
      this.next(this.globalState);
    };

    if (token === ".") {
      this.context.addToFunctionName(token);
      this.next(this._def_class_method);
    } else if (token === "(") {
      this.next(this._def_parameters);
    } else {
      this.subState(this.cloneState(), finishDefinition, token);
    }
  };

  /** Source `_def_class_method` seam used by Lua _defs. */
  protected readonly _def_class_method = (token: string): void => {
    this.context.addToFunctionName(token);
    this.next(this._def_continue);
  };

  /** Source `_def_parameters` seam used by Lua's `_anonymous_def` transition. */
  protected readonly _def_parameters = (token: string): void => {
    if (token === ")") {
      this.next(this._def_continue);
    } else {
      this.context.parameter(token);
      return;
    }
    this.context.addToLongFunctionName(` ${token}`);
  };

  private readonly _if = (token: string): void => {
    if (this.is_newline()) {
      this.next(this.globalState, token);
    } else if (token === "then") {
      this.next(this.globalState);
      this.subState(this.cloneState());
    }
  };

  private readonly _for_while = (token: string): void => {
    if (this.is_newline() || token === "do") {
      this.next(this.globalState);
      if (token !== "end") this.subState(this.cloneState());
    }
  };
}

/** Shared reader configuration for Ruby-like languages. */
export class RubylikeReader extends CodeReader {
  public static override controlFlowKeywords: ReadonlySet<string> = new Set([
    "if",
    "elsif",
    "elseif",
    "until",
    "for",
    "while",
    "rescue",
    "ensure",
    "when"
  ]);
  public static override logicalOperators: ReadonlySet<string> = new Set(["and", "or", "||", "&&"]);
  public static override caseKeywords: ReadonlySet<string> = new Set();
  public static override ternaryOperators: ReadonlySet<string> = new Set(["?"]);

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new RubylikeStateMachine(context)];
  }

  public override get_comment_from_token(token: string): string | undefined {
    return ScriptLanguageMixIn.get_comment_from_token(token);
  }
}

function hasFunctionKeyword(value: object): value is { readonly FUNC_KEYWORD?: unknown } {
  return "FUNC_KEYWORD" in value;
}
