/**
 * Derived from terryyin/lizard 1.24.0 tests.
 * Sources: lizard_languages/code_reader.py and lizard_languages/rubylike.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: source-derived subclass state and keyword dispatch coverage.
 */

import { strict as assert } from "node:assert";
import test from "node:test";

import { analyzeSourceCode } from "../pipeline.ts";
import { FileInfoBuilder } from "../analysis-context.ts";
import { RubylikeReader, RubylikeStateMachine } from "./rubylike.ts";

test("Ruby-like states clone the runtime subclass and resolve its function keyword", () => {
  const context = new FileInfoBuilder("custom.ruby");
  assert.ok(
    new FunctionKeywordStateMachine(context).cloneState() instanceof FunctionKeywordStateMachine
  );

  const fileInformation = analyzeSourceCode(
    "custom.ruby",
    "function outer()\nend",
    FunctionKeywordReader
  );
  assert.deepEqual(
    {
      nloc: fileInformation.nloc,
      tokenCount: fileInformation.tokenCount,
      functions: fileInformation.functionList.map((functionInfo) => ({
        ccn: functionInfo.cyclomaticComplexity,
        endLine: functionInfo.endLine,
        name: functionInfo.name,
        nloc: functionInfo.nloc,
        startLine: functionInfo.startLine,
        tokenCount: functionInfo.tokenCount
      }))
    },
    {
      nloc: 2,
      tokenCount: 5,
      functions: [{ ccn: 1, endLine: 2, name: "outer", nloc: 2, startLine: 1, tokenCount: 4 }]
    }
  );
});

test("Ruby-like states expose inherited _def callbacks to Lua anonymous _defs", () => {
  const fileInformation = analyzeSourceCode(
    "anonymous.lua",
    "worker = function(value) return value end",
    LuaLikeReader
  );

  assert.deepEqual(
    fileInformation.functionList.map((functionInfo) => ({
      ccn: functionInfo.cyclomaticComplexity,
      name: functionInfo.name,
      parameters: functionInfo.parameters
    })),
    [{ ccn: 1, name: "worker", parameters: ["value"] }]
  );
});

class FunctionKeywordStateMachine extends RubylikeStateMachine {
  protected static override readonly FUNC_KEYWORD = "function";
}

class FunctionKeywordReader extends RubylikeReader {
  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new FunctionKeywordStateMachine(context)];
  }
}

/** Minimal source-shaped consumer of Lua's inherited `_anonymous_def` seams. */
class LuaLikeStateMachine extends RubylikeStateMachine {
  private probable_function_name: string | undefined;

  public override _state_global(token: string): void {
    if (token === "=") {
      this.next(this.assigning);
      return;
    }
    this.probable_function_name = token;
    super._state_global(token);
  }

  private readonly assigning = (token: string): void => {
    if (token === "function") {
      this.next(this._anonymous_def);
      return;
    }
    // Lua's source callback returns to its inherited prototype state; the
    // shared machine deliberately supplies its receiver on dispatch.
    // oxlint-disable-next-line typescript/unbound-method
    this.next(this._state_global, token);
  };

  private readonly _anonymous_def = (token: string): void => {
    if (token !== "(") {
      this.next(this._def, token);
      return;
    }
    this.context.pushNewFunction(this.probable_function_name ?? "(anonymous)");
    this.next(this._def_parameters);
  };
}

class LuaLikeReader extends RubylikeReader {
  public constructor(context: FileInfoBuilder) {
    super(context);
    this.parallelStates = [new LuaLikeStateMachine(context)];
  }
}
