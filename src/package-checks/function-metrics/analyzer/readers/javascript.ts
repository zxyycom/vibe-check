/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_languages/javascript.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */

import type { FileInfoBuilder } from "../analysis-context.ts";
import { TypeScriptReader } from "./typescript.ts";

export class JavaScriptReader extends TypeScriptReader {
  public static override ext = ["js", "cjs", "mjs"];
  public static override languageNames = ["javascript", "js"];

  public constructor(context: FileInfoBuilder) {
    super(context);
  }
}
