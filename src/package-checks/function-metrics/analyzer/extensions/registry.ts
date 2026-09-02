/**
 * Derived from terryyin/lizard 1.23.0.
 * Sources: lizard.py:get_extensions and lizard_ext/lizard*.py module names.
 * Upstream revision: 06284ec87c1966fee4ddbf3f068ccf89b987b0f8.
 * SPDX-License-Identifier: Apache-2.0 AND MIT
 * Modified: translated to an analyzer-internal registration table. Deferred
 * bodies fail explicitly rather than pretending to process source.
 */

import { DEFAULT_TOKEN_PROCESSORS, type AnalyzerProcessor } from "../core.ts";
import type { ExtensionInput, RegisteredLizardExtension } from "./protocol.ts";
import { extensionMetadata } from "./protocol.ts";

export type ExtensionBodyStatus = "deferred-extension-body";

/** One known upstream extension module whose body has not yet been translated. */
export interface ExtensionRegistration {
  readonly name: string;
  readonly sourcePath: string;
  readonly status: ExtensionBodyStatus;
}

/** Explicitly fail named loads until their source body is translated. */
export class DeferredExtensionBodyError extends Error {
  public readonly extensionName: string;
  public readonly sourcePath: string;

  public constructor(registration: ExtensionRegistration) {
    super(
      `Lizard extension body '${registration.name}' is deferred and cannot be loaded: ${registration.sourcePath}`
    );
    this.name = "DeferredExtensionBodyError";
    this.extensionName = registration.name;
    this.sourcePath = registration.sourcePath;
  }
}

/** All 19 upstream Lizard extension bodies in the current translation scope. */
export const EXTENSION_REGISTRATIONS: readonly ExtensionRegistration[] = Object.freeze([
  deferred("boolcount"),
  deferred("complextags"),
  deferred("cpre"),
  deferred("dependencycount"),
  deferred("dumpcomments"),
  deferred("duplicate"),
  deferred("duplicated_param_list"),
  deferred("exitcount"),
  deferred("gotocount"),
  deferred("ignoreassert"),
  deferred("io"),
  deferred("mccabe"),
  deferred("modified"),
  deferred("nd"),
  deferred("nonstrict"),
  deferred("ns"),
  deferred("outside"),
  deferred("statementcount"),
  deferred("wordcount")
]);

/**
 * Source-aligned get_extensions semantics: start with the five default
 * processors, then resolve and insert each supplied extension by ordering_index.
 */
export function getExtensions(
  extensionInputs: readonly ExtensionInput[] = []
): AnalyzerProcessor[] {
  const processors: AnalyzerProcessor[] = [...DEFAULT_TOKEN_PROCESSORS];
  for (const extensionInput of extensionInputs) {
    const extension = resolveExtension(extensionInput);
    insertAtOrderingIndex(processors, extension);
  }
  return processors;
}

/** Source `get_extensions` spelling for translated analyzer-internal callers. */
export function get_extensions(
  extensionNames: readonly ExtensionInput[] = []
): AnalyzerProcessor[] {
  return getExtensions(extensionNames);
}

/** Resolve an object/class directly, or report a known named body as deferred. */
export function loadExtension(extensionInput: ExtensionInput): RegisteredLizardExtension {
  return resolveExtension(extensionInput);
}

function deferred(name: string): ExtensionRegistration {
  return {
    name,
    sourcePath: `lizard_ext/lizard${name}.py`,
    status: "deferred-extension-body"
  };
}

function resolveExtension(extensionInput: ExtensionInput): RegisteredLizardExtension {
  if (typeof extensionInput === "string") return loadNamedExtension(extensionInput);
  return extensionInput;
}

function loadNamedExtension(name: string): never {
  const registration = EXTENSION_REGISTRATIONS.find(
    (candidate) => candidate.name === name.toLowerCase()
  );
  if (registration === undefined) {
    throw new Error(`Unknown Lizard extension '${name}'.`);
  }
  throw new DeferredExtensionBodyError(registration);
}

function insertAtOrderingIndex(
  processors: AnalyzerProcessor[],
  extension: RegisteredLizardExtension
): void {
  const orderingIndex = extensionMetadata(extension).ordering_index;
  if (orderingIndex === undefined) {
    processors.push(extension as AnalyzerProcessor);
    return;
  }

  if (!Number.isInteger(orderingIndex)) {
    throw new RangeError(
      `Invalid Lizard extension ordering_index '${String(orderingIndex)}'; expected a finite integer.`
    );
  }

  const index = normalizePythonInsertIndex(orderingIndex, processors.length);
  processors.splice(index, 0, extension as AnalyzerProcessor);
}

function normalizePythonInsertIndex(index: number, length: number): number {
  if (index < 0) return Math.max(length + index, 0);
  return Math.min(index, length);
}
