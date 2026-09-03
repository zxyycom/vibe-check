/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard_ext/lizardnd.py.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the Check-private TypeScript port. Python's
 * import-time FileInfoBuilder/FunctionInfo monkey patches are represented by
 * typed private members on those host classes in core.ts.
 */

import type { AnalyzerReader, FileInfoBuilder, TokenStream } from "../core.ts";
import type {
  ExtensionArgumentRegistrar,
  LizardExtension as LizardExtensionProtocol
} from "./protocol.ts";

export const DEFAULT_ND_THRESHOLD = 7;

const DEFAULT_LOOPS = new Set([
  "if",
  "foreach",
  "for",
  "while",
  "&&",
  "||",
  "?",
  "catch",
  "case",
  "try",
  "def"
]);

/** Source lizardnd.py processor and its FUNCTION_INFO/set_args lifecycle. */
export class LizardExtension implements LizardExtensionProtocol {
  public static readonly FUNCTION_INFO = {
    max_nesting_depth: { caption: "  ND  ", average_caption: " Avg.ND " }
  };

  public static set_args(parser: ExtensionArgumentRegistrar): void {
    parser.add_argument("-N", "--ND", {
      default: DEFAULT_ND_THRESHOLD,
      dest: "ND",
      help: `Threshold for nesting depth number\n            warning. The default value is ${DEFAULT_ND_THRESHOLD}.\n            Functions with ND bigger than it will generate warning\n            `,
      type: "int"
    });
  }

  public *__call__(tokens: TokenStream, reader: AnalyzerReader, lDepth = 0): Generator<string> {
    const loops = reader.loops === undefined ? DEFAULT_LOOPS : new Set(reader.loops);
    const bracket = reader.bracket ?? "}";
    const loopIndicator = reader.loop_indicator ?? "{";
    const indentIndicator = reader.indent_indicator ?? ";";
    let nestingDepth = lDepth;

    for (const token of tokens) {
      if (token === "else") {
        reader.context.set_prev_was_else(true);
      } else if (token === loopIndicator || token === indentIndicator) {
        reader.context.clear_prev_was_else();
      } else if (token === "if" && loops.has(token) && reader.context.get_prev_was_else()) {
        reader.context.clear_prev_was_else();
      } else if (token === "(") {
        reader.context.set_in_condition(true);
        reader.context.increment_condition_depth();
        reader.context.set_logical_operator_added(false);
      } else if (token === ")") {
        reader.context.decrement_condition_depth();
        if (reader.context.get_condition_depth() === 0) {
          reader.context.set_in_condition(false);
          reader.context.set_logical_operator_added(false);
        }
      } else if (token === "&&" || token === "||") {
        if (reader.context.get_in_condition()) {
          if (!reader.context.get_logical_operator_added()) {
            nestingDepth = reader.context.add_nd_condition();
            if (!reader.context.get_loop_status()) {
              reader.context.add_hidden_bracket_condition();
              reader.context.loop_bracket_status();
            }
            reader.context.set_logical_operator_added(true);
          }
        } else {
          nestingDepth = reader.context.add_nd_condition();
          if (!reader.context.get_loop_status()) {
            reader.context.add_hidden_bracket_condition();
            reader.context.loop_bracket_status();
          }
        }
      } else if (loops.has(token) && token !== "&&" && token !== "||") {
        nestingDepth = reader.context.add_nd_condition();
        if (!reader.context.get_loop_status()) {
          reader.context.add_hidden_bracket_condition();
          reader.context.loop_bracket_status();
        }
      }

      if (token === loopIndicator) reader.context.loop_bracket_status();
      if (token === bracket) nestingDepth = reader.context.add_nd_condition(-1);
      if (token === indentIndicator) {
        check_loop_brackets(reader.context, nestingDepth, reader.context.get_hidden_bracket());
      }
      if (nestingDepth < 0) {
        nestingDepth = 0;
        reader.context.reset_nd_complexity();
      }
      yield token;
    }
  }
}

/** Source lizardnd.py's FileInfoBuilder patch target, supplied by core.ts. */
export type NDFileInfoAddition = Pick<
  FileInfoBuilder,
  | "add_nd_condition"
  | "reset_nd_complexity"
  | "add_hidden_bracket_condition"
  | "get_hidden_bracket"
  | "loop_bracket_status"
  | "get_loop_status"
  | "set_in_condition"
  | "get_in_condition"
  | "increment_condition_depth"
  | "decrement_condition_depth"
  | "get_condition_depth"
  | "reset_condition_tracking"
  | "set_logical_operator_added"
  | "get_logical_operator_added"
  | "set_prev_was_else"
  | "get_prev_was_else"
  | "clear_prev_was_else"
>;

/** Source check_loop_brackets; TypeScript returns no value like Python. */
export function check_loop_brackets(
  context: FileInfoBuilder,
  lDepth: number,
  hiddenBrackets: number
): void {
  if (hiddenBrackets > 0) {
    context.add_hidden_bracket_condition(-1);
    context.add_nd_condition(-1);
  }
}
