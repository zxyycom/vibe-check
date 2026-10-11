/**
 * Derived from terryyin/lizard 1.24.1.
 * Source: lizard_languages/gdscript.py.
 * Upstream revision: 0488a260e74e73ceba3149d7c600faac6a3616e6.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript for the product-owned analyzer.
 */

import type { FileInfoBuilder } from "../analysis-context.ts";
import { PythonReader, PythonStates } from "./python.ts";

export class GDScriptReader extends PythonReader {
  public static override ext: readonly string[] = ["gd"];
  public static override languageNames: readonly string[] = ["GDScript"];
  public static override controlFlowKeywords = new Set([
    "if",
    "elif",
    "for",
    "while",
    "catch",
    "do"
  ]);
  public static override logicalOperators = new Set(["&&", "||"]);
  public static override caseKeywords = new Set(["case"]);
  public static override ternaryOperators = new Set(["?"]);

  public constructor(context: FileInfoBuilder) {
    super(context, GDScriptReader);
    this.parallelStates = [new GDScriptStates(context, this)];
  }
}

class GDScriptStates extends PythonStates {
  public constructor(context: FileInfoBuilder, reader: PythonReader) {
    super(context, reader);
    this.next(this._state_global);
  }

  public override readonly _state_global = (token: string): void => {
    if (token === "func") this.next(this._function);
  };
}
