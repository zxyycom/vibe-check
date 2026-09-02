/**
 * Derived from terryyin/lizard 1.23.0 tests.
 * Sources: lizard_languages/golike.py, lizard_languages/go.py,
 * lizard_languages/rust.py, lizard_languages/scala.py,
 * lizard_languages/solidity.py, and lizard_languages/kotlin.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: focused shared Go-like keyword-dispatch parity coverage.
 */

import { strict as assert } from "node:assert";
import test from "node:test";

import { analyzeSourceCode, FileInfoBuilder, type ReaderConstructor } from "../core.ts";
import { GoReader } from "../readers/go.ts";
import { CodeReader } from "./code-reader.ts";
import { GoLikeStates } from "./golike.ts";

test("Go-like shared states retain Go func behavior and resolve every source-derived keyword override", () => {
  const readers: readonly [string, ReaderConstructor][] = [
    ["func", GoReader],
    ["fn", FnReader],
    ["def", DefReader],
    ["function", FunctionReader],
    ["fun", FunReader]
  ];

  for (const [keyword, Reader] of readers) {
    const file = analyzeSourceCode(
      `keyword.${keyword}`,
      `${keyword} reader_sample(value) { if (value) {} }`,
      Reader
    );
    assert.deepEqual(
      file.functionList.map((functionInfo) => ({
        ccn: functionInfo.cyclomaticComplexity,
        endLine: functionInfo.endLine,
        name: functionInfo.name,
        nloc: functionInfo.nloc,
        parameterCount: functionInfo.parameterCount,
        startLine: functionInfo.startLine
      })),
      [
        {
          ccn: 2,
          endLine: 1,
          name: "reader_sample",
          nloc: 1,
          parameterCount: 1,
          startLine: 1
        }
      ]
    );
  }
});

test("Go-like source override seams preserve super dispatch and state receiver binding", () => {
  const file = analyzeSourceCode("seam.go", "func seam() {}", SuperDispatchReader);
  const state = SuperDispatchReader.lastState;

  assert.deepEqual(
    file.functionList.map((functionInfo) => functionInfo.name),
    ["seam"]
  );
  assert.ok(state);
  assert.deepEqual(state.events, ["function-name:seam", "expect-implementation:{"]);
});

class FnStates extends GoLikeStates {
  protected static override readonly FUNC_KEYWORD = "fn";
}

class DefStates extends GoLikeStates {
  protected static override readonly FUNC_KEYWORD = "def";
}

class FunctionStates extends GoLikeStates {
  protected static override readonly FUNC_KEYWORD = "function";
}

class FunStates extends GoLikeStates {
  protected static override readonly FUNC_KEYWORD = "fun";
}

class KeywordReader extends CodeReader {
  public constructor(context: FileInfoBuilder, states: GoLikeStates) {
    super(context);
    this.parallelStates = [states];
  }
}

class FnReader extends KeywordReader {
  public constructor(context: FileInfoBuilder) {
    super(context, new FnStates(context));
  }
}

class DefReader extends KeywordReader {
  public constructor(context: FileInfoBuilder) {
    super(context, new DefStates(context));
  }
}

class FunctionReader extends KeywordReader {
  public constructor(context: FileInfoBuilder) {
    super(context, new FunctionStates(context));
  }
}

class FunReader extends KeywordReader {
  public constructor(context: FileInfoBuilder) {
    super(context, new FunStates(context));
  }
}

class SuperDispatchStates extends GoLikeStates {
  public readonly events: string[] = [];

  protected override _function_name(token: string): void {
    this.events.push(`function-name:${token}`);
    super._function_name(token);
  }

  protected override _expect_function_impl(token: string): void {
    this.events.push(`expect-implementation:${token}`);
    super._expect_function_impl(token);
  }
}

class SuperDispatchReader extends CodeReader {
  public static lastState: SuperDispatchStates | undefined;

  public constructor(context: FileInfoBuilder) {
    super(context);
    const state = new SuperDispatchStates(context);
    SuperDispatchReader.lastState = state;
    this.parallelStates = [state];
  }
}
