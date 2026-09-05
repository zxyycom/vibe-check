/**
 * Derived from terryyin/lizard 1.24.0.
 * Source: lizard.py OutputScheme and extension output lifecycle.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: Apache-2.0
 * Modified: private extension reporting compatibility isolated from analysis execution.
 */

import { extensionMetadata, invokeExtensionPrintResult } from "./extensions/protocol.ts";
import type { FunctionInfoDefinition } from "./extensions/protocol.ts";
import type { AnalyzerProcessor } from "./contracts.ts";
import { AttributeError, FileInformation, FunctionInfo } from "./analysis-model.ts";
import { isPythonWhitespace } from "./shared/code-reader.ts";

export interface OutputSchemeItem {
  caption?: string;
  value: string;
  avg_caption?: string;
}

/**
 * Lizard's extension-owned output schema. The class remains analyzer-internal:
 * report invocation stays in the separately excluded CLI/report entry surface.
 */
export class OutputScheme {
  public extensions: readonly AnalyzerProcessor[];
  public items: OutputSchemeItem[];

  public constructor(ext: readonly AnalyzerProcessor[]) {
    this.extensions = ext;
    this.items = [
      { caption: "  NLOC  ", value: "nloc", avg_caption: " Avg.NLOC " },
      { caption: "  CCN  ", value: "cyclomatic_complexity", avg_caption: " AvgCCN " },
      { caption: " token ", value: "token_count", avg_caption: " Avg.token " },
      { caption: " PARAM ", value: "parameter_count" },
      { caption: " length ", value: "length" },
      ...Array.from(this._ext_member_info(), ([caption, value, averageCaption]) => ({
        caption,
        value,
        // The source owns the key even when its value is None. That key controls
        // `patch_for_extensions`, so keep the JavaScript property present too.
        avg_caption: averageCaption
      }))
    ];
    this.items.push({ caption: " location  ", value: "location" });
  }

  public patch_for_extensions(): void {
    for (const item of this.items) {
      if (!("avg_caption" in item)) continue;
      const name = item.value;
      Object.defineProperty(FileInformation.prototype, `average_${name}`, {
        configurable: true,
        get(this: FileInformation): number {
          return this.functions_average(name);
        }
      });
    }
  }

  public patchForExtensions(): void {
    this.patch_for_extensions();
  }

  public any_silent(): boolean {
    return this.extensions.some(
      (extension) => extensionMetadata(extension).silent_all_others !== undefined
    );
  }

  public anySilent(): boolean {
    return this.any_silent();
  }

  public value_columns(): string[] {
    return this.items.map((item) => item.value);
  }

  public valueColumns(): string[] {
    return this.value_columns();
  }

  public *_ext_member_info(): Generator<[string | undefined, string, string | undefined]> {
    for (const extension of this.extensions) {
      const functionInfo = extensionMetadata(extension).FUNCTION_INFO;
      if (functionInfo === undefined) continue;
      for (const [name, definition] of Object.entries(functionInfo)) {
        yield [definition.caption, name, definition.average_caption];
      }
    }
  }

  public *extMemberInfo(): Generator<[string | undefined, string, string | undefined]> {
    yield* this._ext_member_info();
  }

  public captions(): string {
    return this.items.flatMap((item) => (item.caption ? [item.caption] : [])).join("");
  }

  public static _head(captions: string): string {
    const width = Array.from(captions).length;
    return ["=".repeat(width), captions, "-".repeat(width)].join("\n");
  }

  public function_info_head(): string {
    return OutputScheme._head(this.captions());
  }

  public functionInfoHead(): string {
    return this.function_info_head();
  }

  public function_info(functionInfo: FunctionInfo): string {
    let rendered = "";
    for (const item of this.items) {
      if (!item.caption) continue;
      rendered += pythonRightJustify(
        pythonString(readFunctionInfoAttribute(functionInfo, item.value)),
        Array.from(item.caption).length
      );
    }
    return rendered;
  }

  public functionInfo(functionInfo: FunctionInfo): string {
    return this.function_info(functionInfo);
  }

  public average_captions(): string {
    return this.items.flatMap((item) => (item.avg_caption ? [item.avg_caption] : [])).join("");
  }

  public averageCaptions(): string {
    return this.average_captions();
  }

  public average_formatter(): string {
    return this.items
      .flatMap((item) => {
        if (!item.avg_caption) return [];
        return [`{module.average_${item.value}:${Array.from(item.avg_caption).length}.1f}`];
      })
      .join("");
  }

  public averageFormatter(): string {
    return this.average_formatter();
  }

  public clang_warning_format(): string {
    return (
      "{f.filename}:{f.start_line}: warning: {f.name} has {f.nloc} NLOC, " +
      "{f.cyclomatic_complexity} CCN, {f.token_count} token, {f.parameter_count} PARAM, " +
      "{f.length} length, {f.max_nesting_depth} ND"
    );
  }

  public clangWarningFormat(): string {
    return this.clang_warning_format();
  }

  public msvs_warning_format(): string {
    return (
      "{f.filename}({f.start_line}): warning: {f.name} ({f.long_name}) has " +
      this.items
        .slice(0, -1)
        .map((item) => `{f.${item.value}} ${outputCaption(item.caption)}`)
        .join(", ")
    );
  }

  public msvsWarningFormat(): string {
    return this.msvs_warning_format();
  }
}

/** Compatibility bridge for existing internal callers of OutputScheme metadata. */
export function collectFunctionInfoDefinitions(
  processors: readonly AnalyzerProcessor[]
): readonly FunctionInfoDefinitionEntry[] {
  const definitions: FunctionInfoDefinitionEntry[] = [];
  for (const processor of processors) {
    const functionInfo = extensionMetadata(processor).FUNCTION_INFO;
    if (functionInfo === undefined) continue;
    for (const [name, definition] of Object.entries(functionInfo)) {
      definitions.push({ name, definition });
    }
  }
  return definitions;
}

/** Compatibility bridge for the source `OutputScheme.patch_for_extensions` lifecycle. */
export function patchFunctionInfoAverages(processors: readonly AnalyzerProcessor[]): void {
  new OutputScheme(processors).patch_for_extensions();
}

/** Compatibility bridge for the source `OutputScheme.any_silent` lifecycle. */
export function hasSilentAllOthers(processors: readonly AnalyzerProcessor[]): boolean {
  return new OutputScheme(processors).any_silent();
}

/** Invoke extension result hooks in source registration order. */
export function printExtensionResults(processors: readonly AnalyzerProcessor[]): void {
  for (const processor of processors) {
    invokeExtensionPrintResult(processor);
  }
}

/** Source `print_extension_results` spelling for the retained hook lifecycle. */
export function print_extension_results(processors: readonly AnalyzerProcessor[]): void {
  printExtensionResults(processors);
}

/** One entry from an extension's source-aligned FUNCTION_INFO mapping. */
export interface FunctionInfoDefinitionEntry {
  readonly name: string;
  readonly definition: FunctionInfoDefinition;
}

function readFunctionInfoAttribute(functionInfo: FunctionInfo, attribute: string): unknown {
  if (!(attribute in functionInfo)) throw new AttributeError("FunctionInfo", attribute);
  return Reflect.get(functionInfo, attribute);
}

function pythonString(value: unknown): string {
  if (value === null) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  // oxlint-disable-next-line typescript/no-base-to-string -- Python's str() deliberately dispatches dynamic extension metric values.
  return String(value);
}

function pythonRightJustify(value: string, width: number): string {
  const characterCount = Array.from(value).length;
  return characterCount >= width ? value : `${" ".repeat(width - characterCount)}${value}`;
}

function outputCaption(caption: string | undefined): string {
  if (caption === undefined) throw new AttributeError("NoneType", "strip");
  return stripPythonWhitespace(caption);
}

function stripPythonWhitespace(value: string): string {
  const characters = Array.from(value);
  let firstCharacter = 0;
  while (
    firstCharacter < characters.length &&
    isPythonWhitespace(characters[firstCharacter] ?? "")
  ) {
    firstCharacter += 1;
  }
  let lastCharacter = characters.length;
  while (
    lastCharacter > firstCharacter &&
    isPythonWhitespace(characters[lastCharacter - 1] ?? "")
  ) {
    lastCharacter -= 1;
  }
  return characters.slice(firstCharacter, lastCharacter).join("");
}
