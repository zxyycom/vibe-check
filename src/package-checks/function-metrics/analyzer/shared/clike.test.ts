/**
 * Derived from terryyin/lizard 1.24.0 tests.
 * Sources: test/testCyclomaticComplexity.py and test/testNestedStructures.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: focused C-like state-machine parity coverage.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { analyzeSourceCode, FileInfoBuilder } from "../core.ts";
import { CSharpReader } from "../readers/csharp.ts";
import { CLikeReader, CLikeStates } from "./clike.ts";

describe("Lizard C-like shared states", () => {
  it("keeps r-value-reference CCN corrections and namespace-qualified function state", () => {
    const references = analyzeSourceCode(
      "references.cpp",
      "int make(Args&&... args){}\nint f() {Args&& a=b; if(a && b) { return 1; }}",
      CLikeReader
    );
    assert.deepEqual(
      references.functionList.map((functionInfo) => ({
        ccn: functionInfo.cyclomaticComplexity,
        name: functionInfo.name,
        parameters: functionInfo.parameters
      })),
      [
        { ccn: 1, name: "make", parameters: ["args"] },
        { ccn: 3, name: "f", parameters: [] }
      ]
    );

    const nesting = analyzeSourceCode(
      "nesting.cpp",
      "namespace one { struct Two { void run(int value) { if (value) { return; } } }; }",
      CLikeReader
    );
    assert.deepEqual(
      nesting.functionList.map((functionInfo) => ({
        ccn: functionInfo.cyclomaticComplexity,
        name: functionInfo.name,
        parameters: functionInfo.parameters,
        topNestingLevel: functionInfo.topNestingLevel
      })),
      [{ ccn: 2, name: "one::Two::run", parameters: ["value"], topNestingLevel: 2 }]
    );
  });

  it("uses Unicode code points for C-like names and initializes all derived condition categories", () => {
    const astralIdentifier = analyzeSourceCode("astral.cpp", "int 𝒇() {}", CLikeReader);
    assert.deepEqual(
      astralIdentifier.functionList.map((functionInfo) => ({
        ccn: functionInfo.cyclomaticComplexity,
        endLine: functionInfo.endLine,
        name: functionInfo.name,
        nloc: functionInfo.nloc,
        startLine: functionInfo.startLine,
        tokenCount: functionInfo.tokenCount
      })),
      [{ ccn: 1, endLine: 1, name: "𝒇", nloc: 1, startLine: 1, tokenCount: 5 }]
    );
    assert.deepEqual(
      { nloc: astralIdentifier.nloc, tokenCount: astralIdentifier.tokenCount },
      { nloc: 1, tokenCount: 6 }
    );

    const csharpReader = new CSharpReader(new FileInfoBuilder("condition-categories.cs"));
    assert.deepEqual([...csharpReader.controlFlowKeywords], ["if", "for", "while", "catch"]);
    assert.deepEqual([...csharpReader.logicalOperators], ["&&", "||"]);
    assert.deepEqual([...csharpReader.caseKeywords], ["case"]);
    assert.deepEqual([...csharpReader.ternaryOperators], ["?", "??"]);
    assert.deepEqual(
      [...csharpReader.conditions],
      ["if", "for", "while", "catch", "&&", "||", "case", "?", "??"]
    );
  });

  it("dispatches CLike source override seams through declaration and implementation transitions", () => {
    const ordinary = new SourceOverrideSeamStates(new FileInfoBuilder("ordinary.cpp"));
    for (const token of ["ordinary", "(", ")", "{", "}"]) ordinary.consume(token);

    const oldC = new SourceOverrideSeamStates(new FileInfoBuilder("old-c.cpp"));
    for (const token of ["legacy", "(", ")", "int", "{"]) oldC.consume(token);

    assert.deepEqual(ordinary.events, [
      "declaration:(",
      "declaration:)",
      "declaration-to-implementation:{",
      "entering-implementation:{",
      "implementation:{",
      "implementation:}"
    ]);
    assert.deepEqual(oldC.events, [
      "declaration:(",
      "declaration:)",
      "declaration-to-implementation:int",
      "old-c-parameters:{",
      "declaration-to-implementation:{",
      "entering-implementation:{",
      "implementation:{"
    ]);

    const ttcnParameters = new ParenthesisOnlyCLikeStates(new FileInfoBuilder("parameters.ttcn"));
    for (const token of ["function", "(", "List", "<", "Type", ">", "value", ")", "{"])
      ttcnParameters.consume(token);
    assert.deepEqual(ttcnParameters.context.currentFunction.fullParameters, [
      "List < Type > value"
    ]);
  });
});

class SourceOverrideSeamStates extends CLikeStates {
  public readonly events: string[] = [];

  protected override _state_dec(token: string): void {
    this.events.push(`declaration:${token}`);
    super._state_dec(token);
  }

  protected override _state_dec_to_imp(token: string): void {
    this.events.push(`declaration-to-implementation:${token}`);
    super._state_dec_to_imp(token);
  }

  protected override _state_old_c_params(token: string): void {
    this.events.push(`old-c-parameters:${token}`);
    super._state_old_c_params(token);
  }

  protected override _state_entering_imp(token: string): void {
    this.events.push(`entering-implementation:${token}`);
    super._state_entering_imp(token);
  }

  protected override _state_imp(token: string): void {
    this.events.push(`implementation:${token}`);
    super._state_imp(token);
  }
}

/** Source-equivalent TTCN parameter-bracket class-attribute override. */
class ParenthesisOnlyCLikeStates extends CLikeStates {
  protected static override readonly parameter_bracket_open: ReadonlySet<string> = new Set(["("]);
  protected static override readonly parameter_bracket_close: ReadonlySet<string> = new Set([")"]);
}
