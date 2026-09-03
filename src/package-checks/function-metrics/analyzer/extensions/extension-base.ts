/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_ext/extension_base.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to TypeScript while retaining the extension token-state
 * lifecycle and per-reader context assignment.
 */

import { FileInfoBuilder, type AnalyzerReader, type TokenStream } from "../core.ts";
import { CodeStateMachine } from "../shared/code-reader.ts";
import type { LizardExtension } from "./protocol.ts";

/** Base state machine for translated extension bodies. */
export class ExtensionBase extends CodeStateMachine implements LizardExtension {
  public constructor(context?: FileInfoBuilder) {
    // Upstream extension constructors commonly pass None and receive the real
    // context at __call__ time. The placeholder is never observed after that
    // source-aligned handoff.
    super(context ?? new FileInfoBuilder(""));
  }

  public *__call__(tokens: TokenStream, reader: AnalyzerReader): Generator<string> {
    this.context = reader.context;
    for (const token of tokens) {
      // ExtensionBase invokes its current state directly, unlike CodeReader's
      // full state-machine call path; retain that distinction from upstream.
      this.invokeCurrentState(token);
      yield token;
    }
  }
}
