/**
 * Derived from terryyin/lizard 1.24.1.
 * Source: lizard_ext/lizardcomplextags.py.
 * Upstream revision: 0488a260e74e73ceba3149d7c600faac6a3616e6.
 * SPDX-License-Identifier: MIT
 * Modified: mechanically translated to the Check-private TypeScript port.
 */

import type { AnalyzerReader, TokenStream } from "../contracts.ts";
import type { LizardExtension as LizardExtensionProtocol } from "./protocol.ts";

/** Records every source reader condition token with its current source line. */
export class LizardExtension implements LizardExtensionProtocol {
  public *__call__(tokens: TokenStream, reader: AnalyzerReader): Generator<string> {
    const context = reader.context;
    const conditions = reader.conditions;
    for (const token of tokens) {
      yield token;
      context.current_function.complex_tags ??= [];
      if (conditions.has(token)) {
        context.current_function.complex_tags.push([token, context.current_line]);
      }
    }
  }
}
