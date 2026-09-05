/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/tsx.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */

import type { FileInfoBuilder } from "../analysis-context.ts";
import { CodeReader, isPythonWhitespace, type TokenFactory } from "../shared/code-reader.ts";
import { js_style_regex_expression } from "../shared/js-style-regex.ts";
import { JSTokenizer, Tokenizer, TypeScriptReader } from "./typescript.ts";

export class TSXReader extends TypeScriptReader {
  public static override ext = ["tsx", "jsx"];
  public static override languageNames = ["tsx", "jsx"];

  public constructor(context: FileInfoBuilder) {
    super(context);
  }

  public static override generateTokens = js_style_regex_expression(function* (
    sourceCode: string,
    addition = "",
    tokenFactory?: TokenFactory
  ): Generator<string> {
    const tsxAddition = `${addition}|(?:<[A-Za-z][A-Za-z0-9]*(?:\\.[A-Za-z][A-Za-z0-9]*)*>)|(?:<\\/[A-Za-z][A-Za-z0-9]*(?:\\.[A-Za-z][A-Za-z0-9]*)*>)|(?:#\\w+)|(?:\\$\\w+)|(?:<\\/\\w+>)|(?:=>)|\`.*?\``;
    const tokenizer = new TSXTokenizer();
    for (const token of CodeReader.generateTokens(sourceCode, tsxAddition, tokenFactory)) {
      yield* tokenizer.__call__(token);
    }
  });
}

class TSXTokenizer extends JSTokenizer {
  public constructor() {
    super();
  }

  public override *process_token(token: string): Generator<string> {
    if (token === "<") {
      this.sub_tokenizer = new XMLTagWithAttrTokenizer();
      return;
    }
    if (token === "=>") {
      yield token;
      return;
    }
    yield* super.process_token(token);
  }
}

class XMLTagWithAttrTokenizer extends Tokenizer {
  private tag: string | undefined;
  private cache = ["<"];
  private state: (token: string) => readonly string[] | undefined;
  private _attr_expr_active = false;

  public constructor() {
    super();
    this.state = this._global_state;
  }

  public override *__call__(token: string): Generator<string> {
    if (this.sub_tokenizer) {
      yield* this.sub_tokenizer.__call__(token);
      if (this.sub_tokenizer._ended) {
        this.sub_tokenizer = undefined;
        if (this._attr_expr_active) {
          this._attr_expr_active = false;
          yield ";";
        }
      }
      return;
    }
    yield* this.process_token(token);
  }

  public override *process_token(token: string): Generator<string> {
    this.cache.push(token);
    if (isPythonWhitespace(token)) return;
    const result = this.state(token);
    if (result) yield* result;
  }

  private abort(): readonly string[] {
    this.stop();
    return this.cache;
  }

  private flush(): readonly string[] {
    const tokens = [this.cache.join("")];
    this.cache = [];
    return tokens;
  }

  private readonly _global_state = (token: string): readonly string[] | undefined => {
    if (!isidentifier(token)) return this.abort();
    this.tag = token;
    this.state = this._after_tag;
    return undefined;
  };

  private readonly _after_tag = (token: string): readonly string[] | undefined => {
    if (token === ">") {
      this.state = this._body;
      return undefined;
    }
    if (token === "/") {
      this.state = this._expecting_self_closing;
      return undefined;
    }
    if (isidentifier(token)) {
      this.state = this._expecting_equal_sign;
      return undefined;
    }
    return this.abort();
  };

  private readonly _expecting_self_closing = (token: string): readonly string[] | undefined => {
    if (token === ">") {
      this.stop();
      return this.flush();
    }
    return this.abort();
  };

  private readonly _expecting_equal_sign = (token: string): readonly string[] | undefined => {
    if (token === "=") this.state = this._expecting_value;
    else return this.abort();
    return undefined;
  };

  private readonly _expecting_value = (token: string): readonly string[] | undefined => {
    if (token.startsWith("'") || token.startsWith('"')) this.state = this._after_tag;
    else if (token === "{") {
      this.state = this._after_tag;
      this.sub_tokenizer = new TSXTokenizer();
      this._attr_expr_active = true;
    }
    return undefined;
  };

  private readonly _body = (token: string): readonly string[] | undefined => {
    if (["=", "=>", ";", ")"].includes(token)) return this.abort();
    if (token === "<") {
      this.sub_tokenizer = new XMLTagWithAttrTokenizer();
      this.cache.pop();
      return this.flush();
    }
    if (token.startsWith("</")) {
      this.stop();
      return this.flush();
    }
    if (token === "{") {
      this.sub_tokenizer = new TSXTokenizer();
      return this.flush();
    }
    return undefined;
  };
}

function isidentifier(token: string): boolean {
  return /^\p{ID_Start}\p{ID_Continue}*$/u.test(token);
}
