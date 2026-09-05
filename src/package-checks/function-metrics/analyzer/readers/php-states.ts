/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/php_states.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer while
 * retaining the source PHP function/class/match state machine.
 */

import type { FileInfoBuilder } from "../analysis-context.ts";
import { CodeStateMachine, isPythonWhitespace } from "../shared/code-reader.ts";

/* Source state callbacks retain their method identity; CodeStateMachine supplies the owning receiver. */
/* oxlint-disable typescript/unbound-method */
export class PHPLanguageStates extends CodeStateMachine {
  private function_name = "";
  private short_function_name = "";
  private class_name: string | undefined;
  private trait_name: string | undefined;
  private in_class = false;
  private in_trait = false;
  private bracket_level = 0;
  private brace_level = 0;
  private started_function = false;
  private last_tokens = "";
  private is_function_declaration = false;
  private readonly assignments: string[] = [];
  private in_match = false;
  private match_case_count = 0;

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.last_token = "";
  }

  public override _state_global(token: string): void {
    if (token === "use") {
      this._state = this._state_use;
    } else if (token === "class") {
      this._state = this._class_declaration;
    } else if (token === "trait") {
      this._state = this._trait_declaration;
    } else if (token === "function") {
      this.is_function_declaration = true;
      this._state = this._function_name;
    } else if (token === "fn") {
      // Source deliberately does not count PHP 7.4 arrow functions.
    } else if (token === "match") {
      this.in_match = true;
      this.match_case_count = 0;
      this.next(this._match_expression);
    } else if (["if", "switch", "for", "foreach", "while", "catch"].includes(token)) {
      this.next(this._condition_expected);
    } else if (["public", "private", "protected", "static"].includes(token)) {
      // Visibility modifiers do not alter this source state machine.
    } else if (token === "=>" && this.in_match) {
      this.match_case_count += 1;
    } else if (token === "}" && this.in_match) {
      this.in_match = false;
      for (let count = 0; count < this.match_case_count - 1; count += 1) {
        this.context.addCondition();
      }
      this.match_case_count = 0;
    } else if (token === "=") {
      this.function_name = this.last_tokens.trim();
      this.assignments.push(this.function_name);
    } else if (token === "{") {
      this.brace_level += 1;
    } else if (token === "}") {
      this.brace_level -= 1;
      if (this.brace_level === 0) {
        if (this.in_class) {
          this.in_class = false;
          this.class_name = undefined;
        }
        if (this.in_trait) {
          this.in_trait = false;
          this.trait_name = undefined;
        }
      }
    }

    this.last_token = token;
    if (![" ", "\t", "\n"].includes(token)) {
      if (!["=", ";", "{", "}", "(", ")", ","].includes(token)) {
        this.last_tokens = token;
      } else if (token !== "=" || !this.last_tokens) {
        this.last_tokens = "";
      }
    }
  }

  private readonly _state_use = (token: string): void => {
    if (token === ";") this._state = this._state_global;
  };

  private readonly _trait_declaration = (token: string): void => {
    if (token && !isPythonWhitespace(token) && !["{", "("].includes(token)) {
      this.trait_name = token;
      this.in_trait = true;
      this._state = this._state_global;
    } else if (token === "{") {
      this.brace_level += 1;
      this._state = this._state_global;
    }
  };

  private readonly _class_declaration = (token: string): void => {
    if (
      token &&
      !isPythonWhitespace(token) &&
      !["{", "(", "extends", "implements"].includes(token)
    ) {
      this.class_name = token;
      this.in_class = true;
      this._state = this._state_global;
    } else if (token === "{") {
      this.brace_level += 1;
      this._state = this._state_global;
    }
  };

  private readonly _function_name = (token: string): void => {
    if (token && !isPythonWhitespace(token) && token !== "(") {
      const methodName = token;
      if (this.in_class && this.class_name) {
        this.function_name = `${this.class_name}::${methodName}`;
        this.short_function_name = methodName;
      } else if (this.in_trait && this.trait_name) {
        this.function_name = `${this.trait_name}::${methodName}`;
        this.short_function_name = methodName;
      } else {
        this.function_name = methodName;
        this.short_function_name = methodName;
      }
      this._state = this._function_args;
    } else if (token === "(") {
      if (this.in_class) {
        this.function_name = `${this.class_name}::(anonymous)`;
      } else if (this.in_trait) {
        this.function_name = `${this.trait_name}::(anonymous)`;
      } else {
        this.function_name = this.assignments.at(-1) || "(anonymous)";
        if (this.assignments.at(-1)) this.assignments.pop();
      }
      this.bracket_level = 1;
      this._state = this._function_args_continue;
      this.context.pushNewFunction(this.function_name);
      this.started_function = true;
    }
  };

  private readonly _function_args = (token: string): void => {
    if (token !== "(") return;
    this.bracket_level = 1;
    if (this.in_class && this.class_name && !this.is_function_declaration) {
      this.context.pushNewFunction(this.short_function_name);
    } else {
      this.context.pushNewFunction(this.function_name);
    }
    this.started_function = true;
    this._state = this._function_args_continue;
  };

  private readonly _function_args_continue = (token: string): void => {
    if (token === "(") {
      this.bracket_level += 1;
    } else if (token === ")") {
      this.bracket_level -= 1;
      if (this.bracket_level === 0) this._state = this._function_return_type_or_body;
    } else if (token.startsWith("$") && this.started_function) {
      this.context.addToLongFunctionName(` ${token}`);
      this.context.parameter(token);
    }
  };

  private readonly _function_return_type_or_body = (token: string): void => {
    if (token === ":") {
      this._state = this._function_body_or_return_type;
    } else if (token === "{") {
      this.brace_level += 1;
      this._state = this._function_body;
    } else if (token === ";") {
      if (this.started_function) {
        this.context.endOfFunction();
        this.started_function = false;
      }
      this._state = this._state_global;
    }
  };

  private readonly _function_body_or_return_type = (token: string): void => {
    if (token === "{") {
      this.brace_level += 1;
      this._state = this._function_body;
    }
  };

  private readonly _function_body = (token: string): void => {
    if (token === "{") {
      this.brace_level += 1;
    } else if (token === "}") {
      this.brace_level -= 1;
      if (this.brace_level === Number(this.in_class)) {
        if (this.started_function) {
          this.context.endOfFunction();
          this.started_function = false;
        }
        this._state = this._state_global;
      }
    }
  };

  private readonly _condition_expected = (token: string): void => {
    if (token === "(") {
      this.bracket_level = 1;
      this._state = this._condition_continue;
    }
  };

  private readonly _condition_continue = (token: string): void => {
    if (token === "(") {
      this.bracket_level += 1;
    } else if (token === ")") {
      this.bracket_level -= 1;
      if (this.bracket_level === 0) this._state = this._state_global;
    }
  };

  private readonly _match_expression = (token: string): void => {
    if (token === "(") {
      this.bracket_level = 1;
      this._state = this._match_expression_continue;
    }
  };

  private readonly _match_expression_continue = (token: string): void => {
    if (token === "(") {
      this.bracket_level += 1;
    } else if (token === ")") {
      this.bracket_level -= 1;
      if (this.bracket_level === 0) this._state = this._state_global;
    }
  };
}
/* oxlint-enable typescript/unbound-method */
