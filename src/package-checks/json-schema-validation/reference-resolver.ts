import type { AnySchemaObject } from "ajv";

import type { ResolvedJsonSchemaValidationOptions } from "./options.ts";
import type { SchemaCompileReason } from "./schema-engine.ts";
import { inspectSchemaPolicy, isJsonObject } from "./schema-policy.ts";
import { inspectStrictJsonBytes } from "../json-document/strict-document.ts";
import { normalizeRemoteReference, readBoundedResponse } from "./remote-response.ts";

interface ControlledResolverInput {
  readonly referenceResolution: ResolvedJsonSchemaValidationOptions["referenceResolution"];
  readonly signal: AbortSignal;
}

const MAX_REMOTE_RESPONSE_BYTES = 1_048_576;
const REMOTE_TIMEOUT_MS = 5_000;

export class ControlledReferenceResolver {
  readonly #cache = new Map<string, Promise<AnySchemaObject>>();
  #loadQueue: Promise<void> = Promise.resolve();
  readonly #allowedHttpsSources: readonly Readonly<{
    readonly origin: string;
    readonly pathPrefix: string;
  }>[];
  readonly #resolverInput: ControlledResolverInput;

  constructor(input: ControlledResolverInput) {
    this.#resolverInput = input;
    this.#allowedHttpsSources =
      input.referenceResolution.mode === "allowlisted"
        ? Object.freeze(
            input.referenceResolution.sources.flatMap((source) =>
              source.kind === "https"
                ? [Object.freeze({ origin: source.origin, pathPrefix: source.pathPrefix })]
                : []
            )
          )
        : Object.freeze([]);
  }

  load(referenceUri: string): Promise<AnySchemaObject> {
    let normalizedReferenceUri: string;
    try {
      normalizedReferenceUri = normalizeRemoteReference(referenceUri);
    } catch {
      return Promise.reject(new ReferenceResolutionFailure("unapproved-reference"));
    }
    const cached = this.#cache.get(normalizedReferenceUri);
    if (cached !== undefined) return cached;
    const loading = this.queueLoad(normalizedReferenceUri);
    this.#cache.set(normalizedReferenceUri, loading);
    return loading;
  }

  private queueLoad(referenceUri: string): Promise<AnySchemaObject> {
    const loading = this.#loadQueue.then(
      () => this.loadUncached(referenceUri),
      () => this.loadUncached(referenceUri)
    );
    this.#loadQueue = loading.then(
      () => undefined,
      () => undefined
    );
    return loading;
  }

  private async loadUncached(referenceUri: string): Promise<AnySchemaObject> {
    if (!this.isAllowedReference(referenceUri))
      throw new ReferenceResolutionFailure("unapproved-reference");
    if (this.#resolverInput.signal.aborted) throw new ReferenceTransportFailure();
    const controller = new AbortController();
    const abortForCaller = (): void => controller.abort();
    this.#resolverInput.signal.addEventListener("abort", abortForCaller, { once: true });
    const timeout = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
    try {
      return await this.loadWithController(referenceUri, controller);
    } catch (error) {
      if (
        error instanceof ReferenceResolutionFailure ||
        error instanceof ReferenceTransportFailure
      ) {
        throw error;
      }
      throw new ReferenceTransportFailure();
    } finally {
      clearTimeout(timeout);
      this.#resolverInput.signal.removeEventListener("abort", abortForCaller);
    }
  }

  private async loadWithController(
    referenceUri: string,
    controller: AbortController
  ): Promise<AnySchemaObject> {
    const response = await fetchSchemaResponse(referenceUri, controller.signal);
    assertAllowedResponse(response);
    if (this.#resolverInput.signal.aborted) throw new ReferenceTransportFailure();
    const bytes = await readBoundedResponse(
      response,
      MAX_REMOTE_RESPONSE_BYTES,
      this.#resolverInput.signal
    );
    return schemaFromRemoteBytes(bytes, referenceUri);
  }

  private isAllowedReference(referenceUri: string): boolean {
    let url: URL;
    try {
      url = new URL(referenceUri);
    } catch {
      return false;
    }
    return this.#allowedHttpsSources.some(
      (source) =>
        url.origin === source.origin &&
        (source.pathPrefix === "/" || url.pathname.startsWith(source.pathPrefix))
    );
  }
}

async function fetchSchemaResponse(referenceUri: string, signal: AbortSignal): Promise<Response> {
  if (typeof globalThis.fetch !== "function") throw new ReferenceTransportFailure();
  return globalThis.fetch(referenceUri, {
    credentials: "omit",
    method: "GET",
    redirect: "manual",
    signal
  });
}

function assertAllowedResponse(response: Response): void {
  if (response.redirected || (response.status >= 300 && response.status < 400)) {
    throw new ReferenceResolutionFailure("unapproved-reference");
  }
  if (response.ok) return;
  if (response.status >= 500) throw new ReferenceTransportFailure();
  throw new ReferenceResolutionFailure("unapproved-reference");
}

function schemaFromRemoteBytes(
  bytes: Uint8Array | "too-large",
  referenceUri: string
): AnySchemaObject {
  if (bytes === "too-large") throw new ReferenceResolutionFailure("remote-document-invalid");
  const document = inspectStrictJsonBytes(bytes);
  if (document.kind !== "valid" || !isJsonObject(document.jsonValue)) {
    throw new ReferenceResolutionFailure("remote-document-invalid");
  }
  if (document.jsonValue.$id !== referenceUri) {
    throw new ReferenceResolutionFailure("remote-schema-id-mismatch");
  }
  const referenceReason = inspectSchemaPolicy(document.jsonValue);
  if (referenceReason !== undefined) throw new ReferenceResolutionFailure(referenceReason);
  return document.jsonValue;
}

export class ReferenceResolutionFailure extends Error {
  readonly reason: SchemaCompileReason;

  constructor(reason: SchemaCompileReason) {
    super(reason);
    this.reason = reason;
  }
}

export class ReferenceTransportFailure extends Error {}
