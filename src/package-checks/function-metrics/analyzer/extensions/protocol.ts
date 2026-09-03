/**
 * Derived from terryyin/lizard 1.24.0.
 * Sources: lizard_ext/extension_base.py and lizard_ext/lizard*.py extension
 * contracts.
 * Upstream revision: 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec.
 * SPDX-License-Identifier: MIT
 * Modified: translated to the analyzer-internal extension protocol; this is
 * not exported through the product API as a plugin surface.
 */

import type { AnalyzerReader, FileInformation, TokenStream } from "../core.ts";

/** Metadata an extension contributes to FunctionInfo/report schemas. */
export interface FunctionInfoDefinition {
  readonly caption?: string;
  readonly average_caption?: string;
}

/** The source-aligned FUNCTION_INFO mapping owned by one extension. */
export type FunctionInfoDefinitions = Readonly<Record<string, FunctionInfoDefinition>>;

/** Python `argparse.add_argument` keyword options used by translated bodies. */
export interface ExtensionArgumentKeywordOptions {
  readonly default?: number;
  readonly dest?: string;
  readonly help?: string;
  /** The source `type=int` conversion contract. */
  readonly type?: "int";
}

/** The minimal internal parser seam consumed by source set_args hooks. */
export interface ExtensionArgumentRegistrar {
  add_argument(...arguments_: readonly (string | ExtensionArgumentKeywordOptions)[]): void;
}

/** A source-aligned extension token processor. */
export type ExtensionCall = (tokens: TokenStream, reader: AnalyzerReader) => TokenStream;

/** A source-aligned extension cross-file processor. */
export type ExtensionCrossFileProcess = {
  bivarianceHack(
    fileInfos: Iterable<FileInformation> | undefined
  ): Iterable<FileInformation> | undefined;
}["bivarianceHack"];

/** Preserve the distinction between an absent hook and a present hook returning undefined. */
export type ExtensionCrossFileProcessOutcome =
  | { readonly hookPresent: false }
  | {
      readonly hookPresent: true;
      readonly result: Iterable<FileInformation> | undefined;
    };

/** A source-aligned extension result printer. */
export type ExtensionPrintResult = () => void;

/** A source-aligned extension argument registrar. */
export type ExtensionSetArgs = (parser: ExtensionArgumentRegistrar) => void;

/**
 * The internal protocol shared by translated Lizard extension bodies.  Hooks
 * are optional here because Python permits class-level static hooks that are
 * resolved from an instantiated extension.
 */
export interface LizardExtension {
  __call__?: ExtensionCall;
  readonly ordering_index?: number;
  readonly FUNCTION_INFO?: FunctionInfoDefinitions;
  readonly silent_all_others?: boolean;
  cross_file_process?: ExtensionCrossFileProcess;
  print_result?: ExtensionPrintResult;
  set_args?: ExtensionSetArgs;
}

/** Python resolves extension class attributes and static methods through instances. */
export interface LizardExtensionClassMetadata {
  readonly ordering_index?: number;
  readonly FUNCTION_INFO?: FunctionInfoDefinitions;
  readonly silent_all_others?: boolean;
}

/** A directly registered class is an opaque descriptor, not a constructor to invoke at load time. */
export type LizardExtensionConstructor = LizardExtensionClassMetadata & {
  readonly prototype: LizardExtension;
};

/** One non-string value retained verbatim by source-aligned registration. */
export type RegisteredLizardExtension = LizardExtension | LizardExtensionConstructor;

/** Any processor object on which upstream performs hasattr-style lifecycle lookup. */
export type LizardExtensionDescriptor = object;

/** Accepted internal extension registration inputs. */
export type ExtensionInput = string | RegisteredLizardExtension;

/** Ordinary hook names resolved through Python's instance attribute lookup. */
export type ExtensionHookName = "cross_file_process" | "print_result" | "set_args";

/** Resolve metadata with the same descriptor precedence used by extension hooks. */
export function extensionMetadata(
  extension: LizardExtensionDescriptor
): LizardExtensionClassMetadata {
  return {
    get ordering_index(): number | undefined {
      const attribute = resolveExtensionAttribute(extension, "ordering_index");
      return attribute === undefined ? undefined : readOrderingIndex(attribute.value);
    },
    get FUNCTION_INFO(): FunctionInfoDefinitions | undefined {
      const attribute = resolveExtensionAttribute(extension, "FUNCTION_INFO");
      return attribute === undefined ? undefined : readFunctionInfoDefinitions(attribute.value);
    },
    get silent_all_others(): boolean | undefined {
      const attribute = resolveExtensionAttribute(extension, "silent_all_others");
      // Upstream tests presence with hasattr; the stored value is not interpreted.
      return attribute === undefined ? undefined : true;
    }
  };
}

/** Resolve a cross-file hook through ordinary Python instance attribute lookup. */
export function resolveExtensionHook(
  extension: LizardExtensionDescriptor,
  hookName: "cross_file_process"
): ExtensionCrossFileProcess | undefined;
/** Resolve a result hook through ordinary Python instance attribute lookup. */
export function resolveExtensionHook(
  extension: LizardExtensionDescriptor,
  hookName: "print_result"
): ExtensionPrintResult | undefined;
/** Resolve an argument hook through ordinary Python instance attribute lookup. */
export function resolveExtensionHook(
  extension: LizardExtensionDescriptor,
  hookName: "set_args"
): ExtensionSetArgs | undefined;
export function resolveExtensionHook(
  extension: LizardExtensionDescriptor,
  hookName: ExtensionHookName
): ((...arguments_: never[]) => unknown) | undefined {
  const hook = resolveExtensionAttribute(extension, hookName);
  if (hook === undefined) return undefined;
  if (!isUnknownFunction(hook.value)) {
    throw new TypeError(`Lizard extension ${hookName} hook is not callable.`);
  }
  return hook.value.bind(hook.receiver);
}

/** Resolve Python's special __call__ lookup from the extension type, ignoring its own dictionary. */
export function resolveExtensionCall(
  extension: LizardExtensionDescriptor
): ExtensionCall | undefined {
  const call = resolveExtensionSpecialMethod(extension, "__call__");
  if (call === undefined) return undefined;
  if (!isExtensionCall(call.value)) {
    throw new TypeError("Lizard extension __call__ hook is not callable.");
  }
  return call.value.bind(call.receiver);
}

/** Invoke a token hook and reject an extension that supplies neither source hook form. */
export function invokeExtensionCall(
  extension: LizardExtensionDescriptor,
  tokens: TokenStream,
  reader: AnalyzerReader
): TokenStream {
  const call = resolveExtensionCall(extension);
  if (call === undefined)
    throw new TypeError("Lizard extension is missing a callable __call__ hook.");
  return call(tokens, reader);
}

/** Invoke an optional cross-file hook with source instance/static resolution. */
export function invokeExtensionCrossFileProcess(
  extension: LizardExtensionDescriptor,
  fileInfos: Iterable<FileInformation> | undefined
): Iterable<FileInformation> | undefined {
  const outcome = invokeExtensionCrossFileProcessOutcome(extension, fileInfos);
  return outcome.hookPresent ? outcome.result : undefined;
}

/** Invoke a cross-file hook without collapsing a present undefined result into absence. */
export function invokeExtensionCrossFileProcessOutcome(
  extension: LizardExtensionDescriptor,
  fileInfos: Iterable<FileInformation> | undefined
): ExtensionCrossFileProcessOutcome {
  const crossFileProcess = resolveExtensionHook(extension, "cross_file_process");
  if (crossFileProcess === undefined) return { hookPresent: false };
  return { hookPresent: true, result: crossFileProcess(fileInfos) };
}

/** Invoke an optional result hook with source instance/static resolution. */
export function invokeExtensionPrintResult(extension: LizardExtensionDescriptor): void {
  resolveExtensionHook(extension, "print_result")?.();
}

/** Invoke an optional argument hook with source instance/static resolution. */
export function invokeExtensionSetArgs(
  extension: LizardExtensionDescriptor,
  parser: ExtensionArgumentRegistrar
): void {
  resolveExtensionHook(extension, "set_args")?.(parser);
}

interface ResolvedExtensionAttribute {
  readonly receiver: object;
  readonly value: unknown;
}

/**
 * Model Python's per-class MRO precedence across TypeScript's split prototype
 * and static namespaces. An own instance member wins at its class level, while
 * a subclass static member still shadows an inherited instance member.
 */
function resolveExtensionAttribute(
  extension: LizardExtensionDescriptor,
  attributeName: string
): ResolvedExtensionAttribute | undefined {
  if (typeof extension === "function") {
    return resolveClassAttribute(extension, attributeName);
  }

  const ownAttribute = readOwnAttribute(extension, extension, attributeName);
  if (ownAttribute !== undefined) return ownAttribute;

  return resolveInstanceTypeAttribute(extension, attributeName);
}

function resolveExtensionSpecialMethod(
  extension: LizardExtensionDescriptor,
  methodName: "__call__"
): ResolvedExtensionAttribute | undefined {
  if (typeof extension === "function") {
    return resolveClassAttribute(extension, methodName);
  }
  return resolveInstanceTypeAttribute(extension, methodName);
}

function resolveInstanceTypeAttribute(
  extension: object,
  attributeName: string
): ResolvedExtensionAttribute | undefined {
  let prototype = readPrototype(extension);
  while (prototype !== null && prototype !== Object.prototype) {
    const instanceAttribute = readOwnAttribute(prototype, extension, attributeName);
    if (instanceAttribute !== undefined) return instanceAttribute;

    const constructorDescriptor = Object.getOwnPropertyDescriptor(prototype, "constructor");
    const extensionClass: unknown = constructorDescriptor?.value;
    if (isRecord(extensionClass)) {
      const staticAttribute = readOwnAttribute(extensionClass, extensionClass, attributeName);
      if (staticAttribute !== undefined) return staticAttribute;
    }

    prototype = readPrototype(prototype);
  }
  return undefined;
}

function resolveClassAttribute(
  extensionClass: object,
  attributeName: string
): ResolvedExtensionAttribute | undefined {
  let currentClass: object | null = extensionClass;
  while (currentClass !== null && currentClass !== Function.prototype) {
    const attribute = readOwnAttribute(currentClass, currentClass, attributeName);
    if (attribute !== undefined) return attribute;
    currentClass = readPrototype(currentClass);
  }
  return undefined;
}

function readOwnAttribute(
  owner: object,
  receiver: object,
  attributeName: string
): ResolvedExtensionAttribute | undefined {
  if (Object.getOwnPropertyDescriptor(owner, attributeName) === undefined) return undefined;
  const value: unknown = Reflect.get(owner, attributeName, receiver);
  return {
    receiver,
    value
  };
}

function readPrototype(value: object): object | null {
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype === null || isRecord(prototype)) return prototype;
  throw new TypeError("Lizard extension prototype must be an object or null.");
}

function readOrderingIndex(value: unknown): number {
  if (typeof value !== "number") {
    throw new TypeError("Lizard extension ordering_index metadata must be a number.");
  }
  return value;
}

function readFunctionInfoDefinitions(value: unknown): FunctionInfoDefinitions {
  if (!isObjectRecord(value)) {
    throw new TypeError("Lizard extension FUNCTION_INFO metadata must be a record.");
  }
  const definitions: Record<string, FunctionInfoDefinition> = {};
  for (const [name, definition] of Object.entries(value)) {
    if (!isObjectRecord(definition)) {
      throw new TypeError(`Lizard extension FUNCTION_INFO['${name}'] must be a record.`);
    }
    const caption = readOptionalCaption(definition.caption, name, "caption");
    const averageCaption = readOptionalCaption(definition.average_caption, name, "average_caption");
    definitions[name] = {
      ...(caption === undefined ? {} : { caption }),
      ...(averageCaption === undefined ? {} : { average_caption: averageCaption })
    };
  }
  return definitions;
}

function readOptionalCaption(
  value: unknown,
  definitionName: string,
  captionName: "average_caption" | "caption"
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new TypeError(
      `Lizard extension FUNCTION_INFO['${definitionName}'].${captionName} must be a string.`
    );
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnknownFunction(value: unknown): value is (...arguments_: unknown[]) => unknown {
  return typeof value === "function";
}

function isExtensionCall(value: unknown): value is ExtensionCall {
  return typeof value === "function";
}
