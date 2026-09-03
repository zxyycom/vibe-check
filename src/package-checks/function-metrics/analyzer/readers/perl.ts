/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/perl.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript for the product-owned analyzer.
 */

import type { FileInfoBuilder, TokenStream } from "../core.ts";
import { CodeReader, CodeStateMachine, isPythonWhitespace } from "../shared/code-reader.ts";
import { ScriptLanguageMixIn } from "../shared/script-language.ts";

/** Source mixin retained even though PerlReader composes ScriptLanguageMixIn instead. */
export class PerlCommentsMixin {
  public static get_comment_from_token(token: string): string | undefined {
    return token.startsWith("#") ? token : undefined;
  }

  public static getCommentFromToken(token: string): string | undefined {
    return this.get_comment_from_token(token);
  }
}

export class PerlReader extends CodeReader {
  public static override ext: readonly string[] = ["pl", "pm"];
  public static override languageNames: readonly string[] = ["perl"];
  public static override controlFlowKeywords = new Set([
    "if",
    "elsif",
    "unless",
    "while",
    "until",
    "for",
    "foreach",
    "when",
    "given",
    "default",
    "do"
  ]);
  public static override logicalOperators = new Set(["&&", "||"]);
  public static override caseKeywords = new Set<string>();
  public static override ternaryOperators = new Set(["?", ":"]);

  public constructor(context: FileInfoBuilder) {
    super(context, PerlReader);
    this.parallelStates = [new PerlStates(context)];
  }

  public _state(token: string): boolean | void {
    const currentState = this.parallel_states.at(-1);
    if (token === "\n") return undefined;
    return currentState?.consume(token);
  }

  public *preprocess(tokens: TokenStream): Generator<string> {
    let comment: string | undefined;
    for (const token of tokens) {
      if (comment !== undefined) {
        if (token === "\n") {
          yield comment;
          comment = undefined;
          yield token;
        } else {
          comment += token;
        }
      } else if (token === "#") {
        comment = token;
      } else {
        yield token;
      }
    }
    if (comment !== undefined) yield comment;
  }

  public static override generateTokens(sourceCode: string): Generator<string> {
    return ScriptLanguageMixIn.generate_common_tokens(sourceCode, "");
  }

  public override get_comment_from_token(token: string): string | undefined {
    if (!token.startsWith("#")) return undefined;
    const stripped = token.replace(/^#+/u, "").trim();
    if (stripped.startsWith("lizard forgives") || stripped.startsWith("#lizard forgives")) {
      return "#lizard forgives";
    }
    return stripped;
  }
}

class PerlStates extends CodeStateMachine {
  private function_name = "";
  private package_name = "";
  private variable_name = "";
  private brace_count = 0;
  private paren_count = 0;
  private in_attribute = false;
  private anonymous_count = 0;

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.next(this._state_global);
  }

  public override readonly _state_global = (token: string): void => {
    if (token === "package") {
      this.next(this._state_package_dec);
    } else if (token === "sub") {
      this.function_name = "";
      this.next(this._state_function_dec);
    } else if (token === "{") {
      this.brace_count += 1;
    } else if (token === "}") {
      this.brace_count -= 1;
    } else if (token === "(") {
      this.paren_count += 1;
      this.next(this._state_function_call);
    } else if (["$", "my", "our", "local"].includes(token)) {
      this.variable_name = "";
      this.next(this._state_variable);
    }
  };

  private readonly _state_package_dec = (token: string): void => {
    if (!isPythonWhitespace(token)) {
      this.package_name = token;
      this.next(this._state_global);
    }
  };

  private readonly _state_variable = (token: string): void => {
    if (token === "$") {
      return;
    }
    if (token === "=") {
      this.next(this._state_assignment);
    } else if (token === ";") {
      this.variable_name = "";
      this.next(this._state_global);
    } else if (!isPythonWhitespace(token) && this.variable_name === "") {
      this.variable_name = token;
    }
  };

  private readonly _state_assignment = (token: string): void => {
    if (token === "sub") {
      this.next(this._state_anon_sub);
    } else if (token === ";") {
      this.variable_name = "";
      this.next(this._state_global);
    }
  };

  private readonly _state_function_call = (token: string): void => {
    if (token === "sub") {
      this.anonymous_count += 1;
      let full_name = "<anonymous>";
      if (this.package_name) full_name = `${this.package_name}::${full_name}`;
      this.context.tryNewFunction(full_name);
      this.context.confirmNewFunction();
      this.next(this._state_anon_brace_search);
    } else if (token === ")") {
      this.paren_count -= 1;
      if (this.paren_count === 0) this.next(this._state_global);
    } else if (token === "(") {
      this.paren_count += 1;
    }
  };

  private readonly _state_anon_sub = (token: string): void => {
    if (token !== "{") return;
    this.brace_count = 1;
    let full_name = "<anonymous>";
    if (this.variable_name) full_name = `$${this.variable_name}`;
    if (this.package_name) full_name = `${this.package_name}::${full_name}`;
    this.context.tryNewFunction(full_name);
    this.context.confirmNewFunction();
    this.next(this._state_function_body);
  };

  private readonly _state_function_dec = (token: string): void => {
    if (token === "{") {
      this.brace_count = 1;
      if (this.function_name) {
        let full_name = this.function_name;
        if (this.package_name) full_name = `${this.package_name}::${this.function_name}`;
        this.context.tryNewFunction(full_name);
        this.context.confirmNewFunction();
      }
      this.next(this._state_function_body);
    } else if (token === ":") {
      this.in_attribute = true;
    } else if (token === ";") {
      if (this.function_name) {
        let full_name = this.function_name;
        if (this.package_name) full_name = `${this.package_name}::${this.function_name}`;
        this.context.tryNewFunction(full_name);
        this.context.confirmNewFunction();
        this.context.endOfFunction();
      }
      this.next(this._state_global);
    } else if (token === "(") {
      this.paren_count = 1;
      this.next(this._state_function_prototype);
    } else if (token === "sub") {
      this.anonymous_count += 1;
      let full_name = "<anonymous>";
      if (this.package_name) full_name = `${this.package_name}::${full_name}`;
      this.context.tryNewFunction(full_name);
      this.context.confirmNewFunction();
      this.next(this._state_anon_brace_search);
    } else if (!isPythonWhitespace(token)) {
      if (!this.in_attribute) this.function_name = token;
      else this.in_attribute = false;
    }
  };

  private readonly _state_function_prototype = (token: string): void => {
    if (token === ")") {
      this.paren_count -= 1;
      if (this.paren_count === 0) this.next(this._state_function_dec);
    } else if (token === "(") {
      this.paren_count += 1;
    }
  };

  private readonly _state_anon_brace_search = (token: string): void => {
    if (token === "{") {
      this.brace_count = 1;
      this.next(this._state_function_body);
    } else if (token === "(") {
      this.paren_count += 1;
    } else if (token === ")") {
      this.paren_count -= 1;
      if (this.paren_count === 0) this.next(this._state_global);
    }
  };

  private readonly _state_function_body = (token: string): void => {
    if (token === "{") {
      this.brace_count += 1;
    } else if (token === "}") {
      this.brace_count -= 1;
      if (this.brace_count === 0) {
        this.context.endOfFunction();
        this.next(this._state_global);
      }
    } else if (token === "?") {
      this.context.addCondition();
    } else if (token === ":") {
      this.context.addCondition();
    } else if (token === "sub") {
      this.next(this._state_nested_sub_dec);
    } else if (token === "(") {
      this.paren_count += 1;
      this.next(this._state_nested_call);
    }
  };

  private readonly _state_nested_sub_dec = (token: string): void => {
    if (isPythonWhitespace(token)) return;
    if (token === "{") {
      this.brace_count += 1;
      this.anonymous_count += 1;
      this.context.addCondition();
      this.next(this._state_function_body);
      return;
    }
    let full_name = token;
    if (this.package_name) full_name = `${this.package_name}::${token}`;
    this.context.tryNewFunction(full_name);
    this.context.confirmNewFunction();
    this.next(this._state_nested_named_sub_brace_search);
  };

  private readonly _state_nested_named_sub_brace_search = (token: string): void => {
    if (token === "{") {
      this.brace_count = 1;
      this.next(this._state_nested_sub_body);
    } else if (isPythonWhitespace(token)) {
      return;
    } else if (token === ":") {
      this.in_attribute = true;
    } else if (token === ";") {
      this.context.endOfFunction();
      this.next(this._state_function_body);
    }
  };

  private readonly _state_nested_sub_body = (token: string): void => {
    if (token === "{") {
      this.brace_count += 1;
    } else if (token === "}") {
      this.brace_count -= 1;
      if (this.brace_count === 0) {
        this.context.endOfFunction();
        this.next(this._state_function_body);
      }
    }
  };

  private readonly _state_nested_call = (token: string): void => {
    if (token === "sub") {
      this.anonymous_count += 1;
      let full_name = "<anonymous>";
      if (this.package_name) full_name = `${this.package_name}::${full_name}`;
      this.context.tryNewFunction(full_name);
      this.context.confirmNewFunction();
      this.next(this._state_nested_anon_search);
    } else if (token === ")") {
      this.paren_count -= 1;
      if (this.paren_count === 0) this.next(this._state_function_body);
    } else if (token === "(") {
      this.paren_count += 1;
    }
  };

  private readonly _state_nested_anon_search = (token: string): void => {
    if (token === "{") {
      this.brace_count += 1;
      this.next(this._state_nested_anon_body);
    } else if (token === "(") {
      this.paren_count += 1;
    } else if (token === ")") {
      this.paren_count -= 1;
      if (this.paren_count === 0) this.next(this._state_function_body);
    }
  };

  private readonly _state_nested_anon_body = (token: string): void => {
    if (token === "{") {
      this.brace_count += 1;
    } else if (token === "}") {
      this.brace_count -= 1;
      if (this.brace_count === 1) {
        this.context.endOfFunction();
        this.next(this._state_function_body);
      }
    }
  };
}
