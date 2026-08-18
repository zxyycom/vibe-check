import { parseArgs } from "node:util";
import type { ParseArgsConfig, ParseArgsOptionsConfig } from "node:util";

export type ScriptArgValues = Readonly<
  Record<string, boolean | string | readonly (boolean | string)[] | undefined>
>;

export type ParsedScriptArgs = {
  readonly positionals: readonly string[];
  readonly tokens: readonly ScriptArgToken[];
  readonly values: ScriptArgValues;
};

export type ScriptArgToken = {
  readonly index: number;
  readonly inlineValue?: boolean;
  readonly kind: "option" | "option-terminator" | "positional";
  readonly name?: string;
  readonly rawName?: string;
  readonly value?: string;
};

export type BooleanOptionInput = {
  readonly defaultValue?: boolean;
  readonly name: string;
  readonly values: ParsedScriptArgs["values"];
};

export function parseScriptArgs({
  allowPositionals = false,
  args,
  options
}: {
  readonly allowPositionals?: boolean;
  readonly args: readonly string[];
  readonly options: ParseArgsOptionsConfig;
}): ParsedScriptArgs {
  const config = {
    allowPositionals,
    args: [...args],
    options,
    strict: true,
    tokens: true
  } satisfies ParseArgsConfig;
  const result = parseArgs(config);

  return {
    positionals: result.positionals,
    tokens: result.tokens,
    values: result.values
  };
}

export function stringOption(values: ParsedScriptArgs["values"], name: string): string | undefined {
  const value = values[name];
  return typeof value === "string" ? value : undefined;
}

export function stringArrayOption(
  values: ParsedScriptArgs["values"],
  name: string
): readonly string[] {
  const value = values[name];
  if (Array.isArray(value)) return value.filter((entry) => typeof entry === "string");
  return typeof value === "string" ? [value] : [];
}

export function booleanOption({ defaultValue = false, name, values }: BooleanOptionInput): boolean {
  const value = values[name];
  return typeof value === "boolean" ? value : defaultValue;
}

export function parsePositiveInteger(value: number | string, label: string): number {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== String(value)) {
    throw new Error(`${label} must be a positive integer: ${value}`);
  }

  return parsed;
}
