/**
 * Derived from terryyin/lizard 1.23.0.
 * Source: lizard_languages/javascript.py.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the product-owned TypeScript analyzer.
 */

import type { FileInfoBuilder } from "../core.ts";
import { TypeScriptReader } from "./typescript.ts";

export class JavaScriptReader extends TypeScriptReader {
  public static override ext = ["js", "cjs", "mjs"];
  public static override languageNames = ["javascript", "js"];

  public constructor(context: FileInfoBuilder) {
    super(context);
  }
}
