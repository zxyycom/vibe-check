/**
 * Derived from terryyin/lizard 1.24.0.
 * Sources: lizard_languages/erlang.py (MIT) and Pygments 2.18.0
 * pygments/lexers/erlang.py (BSD-2-Clause).
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT AND BSD-2-Clause
 * Modified: translated to the product-owned TypeScript analyzer with a
 * reader-local Pygments-compatible lexer and no Python/Pygments runtime.
 */

import type { FileInfoBuilder } from "../analysis-context.ts";
import { CodeReader, CodeStateMachine, isPythonWhitespace } from "../shared/code-reader.ts";

// Preserve Pygments 2.18's root alternatives in source order: its early `>`
// alternative intentionally tokenizes `>=` as `>` then `=`.
const ERLANG_OPERATORS = [
  "++",
  "+",
  "--",
  "-",
  "*",
  "/",
  "<",
  ">",
  "/=",
  "=:=",
  "=/=",
  "=<",
  ">=",
  "==",
  "=",
  "<-",
  "!",
  "?"
] as const;
const ERLANG_ATOM_IDENTIFIER = /[a-z][\p{L}\p{N}_]*/uy;
const ERLANG_VARIABLE = /[A-Z_][\p{L}\p{N}_]*/uy;
const ERLANG_QUOTED_ATOM = /'[^\n']*[^\\]'/uy;
const ERLANG_BASE_INTEGER = /(?:[2-9]|[12][0-9]|3[0-6])#[0-9A-Za-z]+/uy;
const ERLANG_INTEGER = /\d+/uy;
const ERLANG_STRING_INTERPOLATION = /~[0-9.*]*[~#+BPWXb-ginpswx]/uy;
const ERLANG_PUNCTUATION = new Set([
  "]",
  "[",
  ":",
  "_",
  "@",
  '"',
  ".",
  "{",
  "}",
  "(",
  ")",
  "|",
  ";",
  ","
]);

export class ErlangReader extends CodeReader {
  public static override ext = ["erl", "hrl", "es", "escript"];
  public static override languageNames = ["erlang"];
  public static override controlFlowKeywords = new Set(["if", "catch", "when"]);
  public static override logicalOperators = new Set(["and", "or", "not"]);
  public static override caseKeywords = new Set(["case"]);
  public static override ternaryOperators = new Set(["?"]);

  public constructor(context: FileInfoBuilder) {
    super(context, ErlangReader);
    this.parallelStates = [new ErlangStates(context)];
  }

  public static override *generateTokens(sourceCode: string): Generator<string> {
    yield* generatePygmentsCompatibleErlangTokenValues(sourceCode);
  }

  public override get_comment_from_token(token: string): string | undefined {
    return token.startsWith("%%") ? token.slice(2) : undefined;
  }
}

/**
 * Reader-local value lexer matching the token values that ErlangReader keeps
 * after upstream filters Pygments Whitespace tokens. It intentionally models
 * no reusable lexer API and carries no Pygments dependency into Product code.
 */
function* generatePygmentsCompatibleErlangTokenValues(sourceCode: string): Generator<string> {
  let index = 0;
  let inDirective = false;
  while (index < sourceCode.length) {
    if (inDirective) {
      // RegexLexer resets a non-matching state at a line-feed, yielding its
      // Whitespace token. Horizontal whitespace remains an Error value while
      // `directive` is active, so it cannot take the root whitespace path.
      if (sourceCode[index] === "\n") {
        index += 1;
        inDirective = false;
        continue;
      }
      const directive = consumeErlangDirective(sourceCode, index);
      if (directive !== undefined) {
        yield* directive.values;
        index = directive.end;
        inDirective = false;
        continue;
      }

      // RegexLexer leaves the directive state active after every unmatched
      // character. Its eventual atom match ends that state, so `-16#f.`
      // yields `-`, `1`, `6`, `#`, `f`, `.` rather than a number token.
      yield codePointAt(sourceCode, index);
      index += codePointAt(sourceCode, index).length;
      continue;
    }

    const whitespaceEnd = consumeErlangWhitespace(sourceCode, index);
    if (whitespaceEnd > index) {
      index = whitespaceEnd;
      continue;
    }

    if (sourceCode[index] === "%") {
      const commentEnd = consumeUntilLineEnd(sourceCode, index);
      yield sourceCode.slice(index, commentEnd);
      index = commentEnd;
      continue;
    }

    if (sourceCode[index] === "-" && isPygmentsLineStart(sourceCode, index)) {
      yield "-";
      index += 1;
      inDirective = true;
      continue;
    }

    // The Pygments root operator pattern is intentionally checked before
    // binary/map and number rules. This preserves source token values such as
    // `<<` -> `<`, `<` and `>=` -> `>`, `=`.
    const operator = ERLANG_OPERATORS.find((candidate) => sourceCode.startsWith(candidate, index));
    if (operator) {
      yield operator;
      index += operator.length;
      continue;
    }

    if (sourceCode[index] === '"') {
      const [stringValues, stringEnd] = tokenizeErlangString(sourceCode, index);
      yield* stringValues;
      index = stringEnd;
      continue;
    }

    const baseInteger = matchAt(ERLANG_BASE_INTEGER, sourceCode, index);
    if (baseInteger) {
      yield baseInteger;
      index += baseInteger.length;
      continue;
    }

    const integer = matchAt(ERLANG_INTEGER, sourceCode, index);
    if (integer) {
      yield integer;
      index += integer.length;
      continue;
    }

    // Pygments' punctuation rule precedes variable matching, so `_Tree`
    // becomes `_`, `Tree` rather than one variable token.
    if (ERLANG_PUNCTUATION.has(sourceCode[index] ?? "")) {
      yield sourceCode[index] ?? "";
      index += 1;
      continue;
    }

    const variable = matchAt(ERLANG_VARIABLE, sourceCode, index);
    if (variable) {
      yield variable;
      index += variable.length;
      continue;
    }

    const atomEnd = consumeErlangAtom(sourceCode, index);
    if (atomEnd > index) {
      yield sourceCode.slice(index, atomEnd);
      index = atomEnd;
      continue;
    }

    if (sourceCode[index] === "$") {
      const characterEnd = consumeErlangCharacter(sourceCode, index);
      if (characterEnd !== undefined) {
        yield sourceCode.slice(index, characterEnd);
        index = characterEnd;
        continue;
      }
    }

    if (sourceCode[index] === "#") {
      const recordEnd = consumeErlangRecordLabel(sourceCode, index);
      if (recordEnd > index + 1) {
        yield sourceCode.slice(index, recordEnd);
        index = recordEnd;
        continue;
      }
    }

    const hashbangEnd = consumeErlangHashbang(sourceCode, index);
    if (hashbangEnd !== undefined) {
      // Pygments emits a Comment.Hashbang token including its newline; the
      // upstream reader filters token *types* rather than stripping its value.
      yield sourceCode.slice(index, hashbangEnd);
      index = hashbangEnd;
      continue;
    }

    if (sourceCode.startsWith("#{", index)) {
      yield "#{";
      index += 2;
      continue;
    }

    yield codePointAt(sourceCode, index);
    index += codePointAt(sourceCode, index).length;
  }
}

/** Consume Python/Pygments whitespace, including Python's C0 separators. */
function consumeErlangWhitespace(sourceCode: string, index: number): number {
  let end = index;
  while (end < sourceCode.length) {
    const character = String.fromCodePoint(sourceCode.codePointAt(end) ?? 0);
    if (!isPythonWhitespace(character)) break;
    end += character.length;
  }
  return end;
}

function matchAt(expression: RegExp, sourceCode: string, index: number): string | undefined {
  expression.lastIndex = index;
  return expression.exec(sourceCode)?.[0];
}

function consumeUntilLineEnd(sourceCode: string, index: number): number {
  const lineFeed = sourceCode.indexOf("\n", index);
  return lineFeed < 0 ? sourceCode.length : lineFeed;
}

function tokenizeErlangString(
  sourceCode: string,
  start: number
): readonly [readonly string[], number] {
  const values = ['"'];
  let index = start + 1;
  let segmentStart = index;

  while (index < sourceCode.length) {
    const character = sourceCode[index];
    if (character === '"') {
      if (segmentStart < index) values.push(sourceCode.slice(segmentStart, index));
      values.push('"');
      return [values, index + 1];
    }
    if (character === "\\") {
      if (segmentStart < index) values.push(sourceCode.slice(segmentStart, index));
      const escapeEnd = consumeErlangEscape(sourceCode, index);
      if (escapeEnd === undefined) {
        // RegexLexer emits one Error token for an invalid escape, then resumes
        // the normal string text rule at its following character.
        values.push("\\");
        index += 1;
      } else {
        values.push(sourceCode.slice(index, escapeEnd));
        index = escapeEnd;
      }
      segmentStart = index;
      continue;
    }
    if (character === "~") {
      if (segmentStart < index) values.push(sourceCode.slice(segmentStart, index));
      ERLANG_STRING_INTERPOLATION.lastIndex = index;
      const interpolation = ERLANG_STRING_INTERPOLATION.exec(sourceCode)?.[0] ?? "~";
      values.push(interpolation);
      index += interpolation.length;
      segmentStart = index;
      continue;
    }
    index += 1;
  }

  if (segmentStart < index) values.push(sourceCode.slice(segmentStart, index));
  return [values, index];
}

function consumeErlangCharacter(sourceCode: string, start: number): number | undefined {
  const characterStart = start + 1;
  if (characterStart >= sourceCode.length) return undefined;
  if (sourceCode[characterStart] !== "\\") {
    return characterStart + codePointAt(sourceCode, characterStart).length;
  }

  const escapeEnd = consumeErlangEscape(sourceCode, characterStart);
  if (escapeEnd !== undefined) return escapeEnd;
  const escapedWhitespaceOrPercent = sourceCode[characterStart + 1];
  return escapedWhitespaceOrPercent === " " || escapedWhitespaceOrPercent === "%"
    ? characterStart + 2
    : undefined;
}

/** Exact Pygments 2.18 `escape_re` value boundary. */
function consumeErlangEscape(sourceCode: string, start: number): number | undefined {
  const marker = sourceCode[start + 1];
  if (marker === undefined) return undefined;
  if (/[bdefnrstv'"\\]/u.test(marker)) return start + 2;
  if (marker === "^") {
    return /^[a-zA-Z]$/u.test(sourceCode[start + 2] ?? "") ? start + 3 : undefined;
  }
  if (marker === "x" && /^[0-9a-fA-F]{2}$/u.test(sourceCode.slice(start + 2, start + 4))) {
    return start + 4;
  }
  if (marker === "x" && sourceCode[start + 2] === "{") {
    let index = start + 3;
    while (/^[0-9a-fA-F]$/u.test(sourceCode[index] ?? "")) index += 1;
    return index > start + 3 && sourceCode[index] === "}" ? index + 1 : undefined;
  }
  if (/^[0-7]$/u.test(marker)) {
    let index = start + 2;
    while (
      index < Math.min(sourceCode.length, start + 4) &&
      /[0-7]/u.test(sourceCode[index] ?? "")
    ) {
      index += 1;
    }
    return index;
  }
  return undefined;
}

function consumeErlangRecordLabel(sourceCode: string, start: number): number {
  const firstAtomEnd = consumeErlangAtom(sourceCode, start + 1);
  if (firstAtomEnd === start + 1) return start + 1;
  const dotIndex = sourceCode.startsWith(":.", firstAtomEnd) ? firstAtomEnd + 1 : firstAtomEnd;
  if (sourceCode[dotIndex] !== ".") return firstAtomEnd;
  const secondAtomEnd = consumeErlangAtom(sourceCode, dotIndex + 1);
  return secondAtomEnd > dotIndex + 1 ? secondAtomEnd : firstAtomEnd;
}

/**
 * Pygments 2.18's `directive` state: a valid `define`/`record` declaration
 * or one atom exits it; each other character is emitted as an Error value.
 */
function consumeErlangDirective(
  sourceCode: string,
  index: number
): { readonly values: readonly string[]; readonly end: number } | undefined {
  for (const directiveName of ["define", "record"] as const) {
    if (!sourceCode.startsWith(directiveName, index)) continue;
    let bracket = index + directiveName.length;
    bracket = consumeErlangWhitespace(sourceCode, bracket);
    if (sourceCode[bracket] !== "(") continue;
    const macroEnd = consumeErlangMacro(sourceCode, bracket + 1);
    if (macroEnd === bracket + 1) continue;
    return {
      values: [directiveName, "(", sourceCode.slice(bracket + 1, macroEnd)],
      end: macroEnd
    };
  }

  const atomEnd = consumeErlangAtom(sourceCode, index);
  return atomEnd > index ? { values: [sourceCode.slice(index, atomEnd)], end: atomEnd } : undefined;
}

function consumeErlangMacro(sourceCode: string, index: number): number {
  const variable = matchAt(ERLANG_VARIABLE, sourceCode, index);
  if (variable) return index + variable.length;
  return consumeErlangAtom(sourceCode, index);
}

function consumeErlangAtom(sourceCode: string, index: number): number {
  const quotedAtom = matchAt(ERLANG_QUOTED_ATOM, sourceCode, index);
  if (quotedAtom) return index + quotedAtom.length;
  const identifier = matchAt(ERLANG_ATOM_IDENTIFIER, sourceCode, index);
  return identifier ? index + identifier.length : index;
}

function isPygmentsLineStart(sourceCode: string, index: number): boolean {
  return index === 0 || sourceCode[index - 1] === "\n";
}

/** Exact Pygments 2.18 `\\A#!.+\\n` Hashbang boundary. */
function consumeErlangHashbang(sourceCode: string, index: number): number | undefined {
  if (index !== 0 || !sourceCode.startsWith("#!", index)) return undefined;
  const lineFeed = sourceCode.indexOf("\n", index + 2);
  return lineFeed > index + 2 ? lineFeed + 1 : undefined;
}

function codePointAt(sourceCode: string, index: number): string {
  return String.fromCodePoint(sourceCode.codePointAt(index) ?? 0);
}

/* Source state callbacks retain their method identity; CodeStateMachine supplies the owning receiver. */
/* oxlint-disable typescript/unbound-method */
class ErlangStates extends CodeStateMachine {
  public static readonly func_name_pattern = /^[A-Za-z]+[A-Za-z0-9_]*/u;
  private punctuated = false;
  private lbr = 0;
  private rbr = 0;

  public constructor(context: FileInfoBuilder) {
    super(context);
    this.punctuated = false;
  }

  public override statemachine_clone(): CodeStateMachine {
    return new ErlangStates(this.context);
  }

  public override _state_global(token: string): void {
    if (token === "-") {
      this.punctuated = true;
    } else if (ErlangStates.func_name_pattern.test(token) && !this.punctuated) {
      this.context.pushNewFunction(token);
      this._state = this._state_after_name;
    } else if (token === "end") {
      this._state = this._state_nested_end;
    } else if (token === "." || token === ";") {
      this.statemachine_return();
    } else {
      this.punctuated = false;
    }
  }

  private readonly _state_after_name = (token: string): void => {
    if (token === "(") {
      this._state = this._state_start_of_params;
      this.context.addToLongFunctionName(token);
      this.lbr = 1;
      this.rbr = 0;
    } else {
      this.func_match_failed(token);
    }
  };

  private readonly _state_start_of_params = (token: string): void => {
    if (token === ")") {
      this.rbr += 1;
      if (this.lbr === this.rbr) {
        this._state = this._state_end_of_params;
        this.context.addToLongFunctionName(` ${token}`);
        this.punctuated = false;
        return;
      }
    }
    if (token === "(") this.lbr += 1;
    this.context.parameter(token);
  };

  private readonly _state_end_of_params = (token: string): void => {
    if (token === "-") {
      this.punctuated = true;
    } else if (token === ">" && this.punctuated) {
      if (
        this.context.stackedFunctions.length <= 1 ||
        this.context.currentFunction.name === "fun"
      ) {
        this.next(this._state_func_first_line, token);
      }
    } else {
      this.func_match_failed(token);
    }
  };

  private readonly _state_func_first_line = (_token: string): void => {
    this.sub_state(this.statemachine_clone(), () => {
      this._state = this._state_global;
      this.context.endOfFunction();
    });
    this.punctuated = false;
  };

  private readonly _state_nested_end = (token: string): void => {
    if (
      (token === "." || token === ",") &&
      this.context.stackedFunctions.length > 1 &&
      this.context.stackedFunctions.at(-1)?.name === "fun"
    ) {
      this.statemachine_return();
      return;
    }
    this._state = this._state_global;
  };

  private readonly func_match_failed = (token: string): void => {
    this.punctuated = false;
    this._state = this._state_global;
    const currentComplexity = this.context.currentFunction.cyclomaticComplexity - 1;
    this.context.currentFunction =
      this.context.stackedFunctions.pop() ?? this.context.globalPseudoFunction;
    this.context.addCondition(currentComplexity);
    this.next(this._state_global, token);
  };
}
/* oxlint-enable typescript/unbound-method */
