/**
 * Derived from terryyin/lizard 1.23.0.
 * Source: lizard_languages/typescript.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */

import type { FileInfoBuilder } from "../core.ts";
import { CodeReader, CodeStateMachine, type TokenFactory } from "../shared/code-reader.ts";
import { js_style_regex_expression } from "../shared/js-style-regex.ts";

const _TS_TYPE_KEYWORDS = new Set([
  "string",
  "number",
  "boolean",
  "void",
  "any",
  "object",
  "unknown",
  "never"
]);

export class TypeScriptReader extends CodeReader {
  public static override ext = ["ts"];
  public static override languageNames = ["typescript", "ts"];
  public static override controlFlowKeywords = new Set(["if", "elseif", "for", "while", "catch"]);
  public static override logicalOperators = new Set(["&&", "||"]);
  public static override caseKeywords = new Set(["case"]);
  public static override ternaryOperators = new Set(["?"]);

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new TypeScriptStates(context)];
  }

  public static override generateTokens = js_style_regex_expression(function* (
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    function* splitTemplateLiteral(token: string): Generator<string> {
      let content = token.slice(1, -1);
      yield "`";
      if (!content.includes("${")) {
        if (content) yield `\`${content}\``;
        yield "`";
        return;
      }

      let index = 0;
      while (index < content.length) {
        const expressionIndex = content.indexOf("${", index);
        if (expressionIndex === -1) {
          if (index < content.length) yield `\`${content.slice(index)}\``;
          break;
        }
        if (expressionIndex > index) yield `\`${content.slice(index, expressionIndex)}\``;
        yield "${";
        index = expressionIndex + 2;
        const expressionStart = index;
        let braceCount = 1;
        while (index < content.length && braceCount > 0) {
          if (content[index] === "{") braceCount += 1;
          else if (content[index] === "}") braceCount -= 1;
          index += 1;
        }
        if (braceCount > 0) {
          yield token;
          return;
        }
        yield content.slice(expressionStart, index - 1);
        yield "}";
        content = content.slice(index);
        index = 0;
      }
      yield "`";
    }

    const typeScriptAddition = `${addition}|(?:#\\w+)|(?:\\$\\w+)|(?:\\w+\\?)|\`.*?\``;
    for (const token of CodeReader.generateTokens(sourceCode, typeScriptAddition, tokenFactory)) {
      if (token.startsWith("`") && token.endsWith("`") && token.length > 1) {
        yield* splitTemplateLiteral(token);
      } else {
        yield token;
      }
    }
  });

  public override get_comment_from_token(token: string): string | undefined {
    if (token.startsWith("//")) return token.slice(2);
    if (token.startsWith("/*") && token.endsWith("*/")) return token.slice(2, -2);
    return undefined;
  }
}

/** Source-aligned tokenizer base shared with the TSX reader. */
export class Tokenizer {
  public sub_tokenizer: Tokenizer | undefined;
  public _ended: boolean;

  public constructor() {
    this.sub_tokenizer = undefined;
    this._ended = false;
  }

  public *__call__(token: string): Generator<string> {
    if (this.sub_tokenizer) {
      yield* this.sub_tokenizer.__call__(token);
      if (this.sub_tokenizer._ended) this.sub_tokenizer = undefined;
      return;
    }
    yield* this.process_token(token);
  }

  public stop(): void {
    this._ended = true;
  }

  public *process_token(_token: string): Generator<string> {}
}

/** Source-aligned JavaScript brace tokenizer used by TSX embedded expressions. */
export class JSTokenizer extends Tokenizer {
  private depth: number;

  public constructor() {
    super();
    this.depth = 1;
  }

  public override *process_token(token: string): Generator<string> {
    if (token === "{") this.depth += 1;
    else if (token === "}") {
      this.depth -= 1;
      if (this.depth === 0) {
        this.stop();
        return;
      }
    }
    yield token;
  }
}

class TypeScriptStates extends CodeStateMachine {
  private last_tokens = "";
  private function_name = "";
  private started_function = false;
  private as_object = false;
  private _getter_setter_prefix: "get" | "set" | undefined;
  private _ts_declare = false;
  private _static_seen = false;
  private _async_seen = false;
  private _prev_token = "";
  private _in_prop_value = false;
  private _in_abstract_context = false;
  private _generic_depth_in_dec = 0;

  public constructor(context: FileInfoBuilder) {
    super(context);
  }

  public override statemachine_before_return(): void {
    this._pop_function_from_stack();
  }

  public override _state_global(token: string): void {
    if (token === "declare") {
      this._ts_declare = true;
      return;
    }
    if (token === "function" && this._ts_declare) {
      this._ts_declare = false;
      this.next(this.skipDeclaredFunction);
      return;
    }
    this._ts_declare = false;

    if (token === "type" && !this.as_object) {
      let phase = 0;
      let braceCount = 0;
      let genericDepth = 0;
      const handleTypeAlias = (nextToken: string): boolean => {
        if (phase === 0) {
          if (/\p{L}/u.test(nextToken[0] ?? "")) phase = 1;
          else {
            this.last_tokens = "type";
            this.next(this.globalState, nextToken);
            return true;
          }
        } else if (phase === 1) {
          if (nextToken === "<") {
            genericDepth = 1;
            phase = 3;
          } else if (nextToken === "=") phase = 2;
          else if (nextToken === ";") {
            this.next(this.globalState);
            return true;
          }
        } else if (phase === 2) {
          if (nextToken === "{") {
            braceCount = 1;
            phase = 4;
          } else if (nextToken === ";" || this.context.newline) {
            this.next(this.globalState);
            if (nextToken !== ";") this._state_global(nextToken);
            return true;
          }
        } else if (phase === 3) {
          if (nextToken === "<") genericDepth += 1;
          else if (nextToken === ">") {
            genericDepth -= 1;
            if (genericDepth === 0) phase = 1;
          }
        } else if (phase === 4) {
          if (nextToken === "{") braceCount += 1;
          else if (nextToken === "}") {
            braceCount -= 1;
            if (braceCount === 0) {
              this.next(this.globalState);
              return true;
            }
          }
        }
        return false;
      };
      this.next(handleTypeAlias);
      return;
    }
    if (token === "interface") {
      let braceCount = 0;
      let interfaceStarted = false;
      const skipInterface = (nextToken: string): boolean => {
        if (nextToken === "{") {
          interfaceStarted = true;
          braceCount += 1;
        } else if (nextToken === "}" && interfaceStarted) {
          braceCount -= 1;
          if (braceCount === 0) {
            this.next(this.globalState);
            return true;
          }
        }
        return false;
      };
      this.next(skipInterface);
      return;
    }
    if (token === "abstract" && this.as_object) {
      this._in_abstract_context = true;
      return;
    }
    if (token === "static") {
      this._static_seen = true;
      this._prev_token = token;
      return;
    }
    if (token === "async") {
      this._async_seen = true;
      this._prev_token = token;
      return;
    }
    if (token === "new") {
      this._prev_token = token;
      return;
    }

    if (this.as_object) {
      if (token === "get" || token === "set") {
        this._getter_setter_prefix = token;
        return;
      }
      if (this._getter_setter_prefix) {
        this.last_tokens = `${this._getter_setter_prefix} ${token}`;
        this._getter_setter_prefix = undefined;
        return;
      }
      if (token === "[") {
        this._collect_computed_name();
        return;
      }
      if (token === ":") {
        if (isFunctionName(this.last_tokens)) this.function_name = this.last_tokens;
        this._in_prop_value = true;
        return;
      }
      if (token === "<" || (token.startsWith("<") && token.endsWith(">") && token.length > 1)) {
        if (token === "<") this._consume_generic_type_params();
        return;
      }
      if (token === "(") {
        if (this._prev_token === "." || this._prev_token === "new") {
          this.subState(this.cloneState());
          this._prev_token = token;
          return;
        }
        if (
          this._in_prop_value &&
          (!this.function_name || this.last_tokens !== this.function_name)
        ) {
          this.subState(this.cloneState());
          this._prev_token = token;
          return;
        }
        if (!this.started_function) {
          if (this.last_tokens === "=" && this.function_name) this._function(this.function_name);
          else this._function(this.last_tokens);
        }
        this.next(this._function, token);
        return;
      }
      if ((this._async_seen || this._static_seen) && !["*", "function", "=>"].includes(token)) {
        if (token === "=") {
          this._static_seen = false;
          this._async_seen = false;
        } else {
          this.last_tokens = token;
          return;
        }
      }
    }

    if (token === ".") {
      this.next(this._field);
      this.last_tokens += token;
      this._prev_token = token;
      return;
    }
    if (token === "function") {
      if (this.started_function && !this.as_object) this._pop_function_from_stack();
      this.next(this._function);
    } else if (["if", "switch", "for", "while", "catch"].includes(token)) {
      this.next(this._expecting_condition_and_statement_block);
    } else if (["else", "do", "try", "final"].includes(token)) {
      this.next(this._expecting_statement_or_block);
    } else if (token === "=>") {
      this.next(this._arrow_function);
    } else if (token === "=") {
      if (isFunctionName(this.last_tokens)) this.function_name = this.last_tokens;
    } else if (token === "(") {
      if (this._prev_token === "." || this._prev_token === "new") {
        this.subState(this.cloneState());
      } else if (this.function_name) {
        if (
          this.last_tokens !== this.function_name &&
          !["=", "async", ">"].includes(this._prev_token)
        ) {
          this.function_name = "";
          this.subState(this.cloneState());
        } else {
          if (!this.started_function) this._function(this.function_name);
          this.next(this._function, token);
        }
      } else {
        this.subState(this.cloneState());
      }
    } else if (token === "{") {
      if (this.started_function) this.subState(this.cloneState(), this._pop_function_from_stack);
      else this.read_object();
    } else if (token === "}" || token === ")") {
      this.returnFromState();
    } else if (this.context.newline || token === ";") {
      this.function_name = "";
      this._pop_function_from_stack();
      this._static_seen = false;
      this._async_seen = false;
      this._in_abstract_context = false;
      this._in_prop_value = false;
      this._prev_token = "";
    }

    if (token === "`") this.next(this._state_template_literal);
    if (!this.as_object && token === ":") {
      this._consume_type_annotation();
      this._prev_token = token;
      return;
    }
    if (this.as_object && token === ",") this._in_prop_value = false;
    this.last_tokens = token;
    if (this._prev_token !== "new" && this._prev_token !== ".") this._prev_token = token;
  }

  private read_object(): void {
    const objectReader = this.cloneState();
    if (!(objectReader instanceof TypeScriptStates)) {
      throw new TypeError("TypeScriptStates clone did not preserve the concrete state class.");
    }
    objectReader.as_object = true;
    objectReader._static_seen = this._static_seen;
    objectReader._async_seen = this._async_seen;
    this.subState(objectReader, () => this.next(this.globalState));
    this._static_seen = false;
    this._async_seen = false;
  }

  private _push_function_to_stack(): void {
    if (this._in_abstract_context) return;
    this.started_function = true;
    this.context.pushNewFunction(this.function_name || "(anonymous)");
  }

  private readonly _pop_function_from_stack = (): void => {
    if (this.started_function) this.context.endOfFunction();
    this.started_function = false;
    this._in_prop_value = false;
  };

  private readonly skipDeclaredFunction = (token: string): boolean => {
    if (token === ";" || this.context.newline) {
      this.next(this.globalState);
      return true;
    }
    return false;
  };

  private readonly _expecting_condition_and_statement_block = (token: string): void => {
    if (token === "await") return;
    if (token !== "(") {
      this.next(this.globalState, token);
      return;
    }
    this.subState(this.cloneState(), () => this.next(this._expecting_statement_or_block));
  };

  private readonly _expecting_statement_or_block = (token: string): void => {
    if (token === "{") this.subState(this.cloneState(), () => this.next(this.globalState));
    else this.next(this.globalState, token);
  };

  private readonly _arrow_function = (token: string): void => {
    if (!this.started_function) this._push_function_to_stack();
    this.function_name = "";
    this._async_seen = false;
    this._static_seen = false;
    this.next(this.globalState, token);
  };

  private readonly _function = (token: string): void => {
    if (token === "*") return;
    if (token === "<") {
      this._consume_generic_type_params();
      return;
    }
    if (token.startsWith("<") && token.endsWith(">") && token.length > 1) return;
    if (token !== "(") {
      this.function_name = isFunctionName(token) ? token : "";
      this._static_seen = false;
      this._async_seen = false;
      return;
    }
    if (!this.started_function) this._push_function_to_stack();
    this._generic_depth_in_dec = 0;
    this.next(this._dec, token);
  };

  private readonly _field = (token: string): void => {
    this.last_tokens += token;
    this.next(this.globalState);
  };

  private readonly _dec = (token: string): void => {
    if (token === ")") {
      this.next(this._expecting_func_opening_bracket);
    } else if (token !== "(") {
      if (token === ",") {
        if (this._generic_depth_in_dec === 0) this.context.parameter(",");
      } else if (token === "<") {
        this._generic_depth_in_dec += 1;
      } else if (token === ">") {
        if (this._generic_depth_in_dec > 0) this._generic_depth_in_dec -= 1;
      } else if (
        !_TS_TYPE_KEYWORDS.has(token) &&
        !["*", "+", "-", "/", "%", "=", "."].includes(token) &&
        this._generic_depth_in_dec === 0 &&
        isParameter(token)
      ) {
        this.context.parameter(token.replaceAll("?", ""));
      }
      return;
    }
    this.context.addToLongFunctionName(` ${token}`);
  };

  private readonly _expecting_func_opening_bracket = (token: string): void => {
    if (token === ":") {
      this._consume_type_annotation();
    } else if (token === ";" && this.as_object && this._in_abstract_context) {
      if (this.started_function) this._pop_function_from_stack();
      this._in_abstract_context = false;
      this.next(this.globalState);
    } else if (token !== "{" && token !== "=>") {
      if (this.started_function) {
        this.context.forgive = true;
        this.context.endOfFunction();
      }
      this.started_function = false;
    }
    this.next(this.globalState, token);
  };

  private readonly _state_template_literal = (token: string): void => {
    if (token === "`") this.next(this.globalState);
  };

  private _collect_computed_name(): void {
    const tokens: string[] = [];
    const collect = (token: string): boolean => {
      if (token === "]") {
        this.last_tokens = this._to_camel_case(tokens.join(""));
        this.next(this.globalState);
        return true;
      }
      tokens.push(token);
      return false;
    };
    this.next(collect);
  }

  private _consume_generic_type_params(): void {
    let depth = 1;
    const consume = (token: string): void => {
      if (token === "<") depth += 1;
      else if (token === ">") {
        depth -= 1;
        if (depth === 0) this.next(this.globalState);
      }
    };
    this.next(consume);
  }

  private _consume_type_annotation(): void {
    const typeStates = new TypeScriptTypeAnnotationStates(this.context);
    this.subState(typeStates, () => {
      if (typeStates.saved_token !== undefined) this.consume(typeStates.saved_token);
    });
  }

  private _to_camel_case(value: string): string {
    const normalized = value.replace(/["'+ ]/gu, "");
    return normalized ? `${normalized[0]?.toLowerCase()}${normalized.slice(1)}` : normalized;
  }
}

class TypeScriptTypeAnnotationStates extends CodeStateMachine {
  public saved_token: string | undefined;

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.saved_token = undefined;
  }

  public override _state_global(token: string): void {
    if (token === "{") this.next(this._inline_type_annotation, token);
    else this.next(this._state_simple_type, token);
  }

  private readonly _state_simple_type = (token: string): void => {
    if (token === "<") this.next(this._state_generic_type, token);
    else if ("{=;)".includes(token)) {
      this.saved_token = token;
      this.returnFromState();
    } else if (token === "(") this.next(this._function_type_annotation, token);
    else if (token === "=>") {
      this.saved_token = token;
      this.returnFromState();
    }
  };

  private readonly _inline_type_annotation = (token: string): void => {
    this.readInsideBracketsThen("{}", token, () => this.returnFromState());
  };

  private readonly _state_generic_type = (token: string): void => {
    this.readInsideBracketsThen("<>", token, () => this.returnFromState());
  };

  private readonly _function_type_annotation = (token: string): void => {
    this.readInsideBracketsThen("()", token, () => this.returnFromState());
  };
}

function isFunctionName(token: string): boolean {
  return /^[\p{L}_$#]/u.test(token);
}

function isParameter(token: string): boolean {
  const withoutQuestionMark = token.replaceAll("?", "");
  return (
    withoutQuestionMark.length > 0 &&
    /^[\p{L}]/u.test(withoutQuestionMark) &&
    /^[\p{L}\p{N}_]+$/u.test(withoutQuestionMark)
  );
}
