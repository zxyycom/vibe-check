import { opendir } from "node:fs/promises";
import path from "node:path";

import type { MarkdownLinkParseResult, ParsedMarkdownLinkFacts } from "./markdown-parser.ts";
import { MarkdownLinkParseFactsSession } from "./parse-facts-cache.ts";
import {
  directoryTarget,
  fileTargetDescriptor,
  outsideProjectRootTarget,
  projectTarget
} from "./target-descriptor.ts";
import { probeEndpoint, probeRootContainedPath, readRegularFile } from "./filesystem-probes.ts";
import { readRootContainedMarkdownSource } from "./source-reader.ts";
import {
  anchorResolution,
  finding,
  isMarkdownPath,
  isWithinRoot,
  parseLocalDestination,
  sameRootRelativePath,
  unavailable,
  valid,
  type MarkdownLocalResolution,
  type MarkdownLocalResolutionRequest,
  type MarkdownLocalResolver,
  type MarkdownSafeTargetDescriptor,
  type EndpointProbe
} from "./local-resolution.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";

export class LinkLocalResolver implements MarkdownLocalResolver {
  #targetReadCount = 0;
  readonly #canonicalProjectRoot: string;
  readonly #parseFactsCache: MarkdownLinkParseFactsSession;
  readonly #maxTargetReads: number;
  readonly #signal: AbortSignal;
  readonly #targetFactMemo = new Map<string, Promise<ParsedMarkdownLinkFacts | undefined>>();

  constructor(
    canonicalProjectRoot: string,
    maxTargetReads: number,
    cache: ResolvedMarkdownLinkValidationOptions["cache"],
    signal: AbortSignal
  ) {
    this.#canonicalProjectRoot = canonicalProjectRoot;
    this.#maxTargetReads = maxTargetReads;
    this.#parseFactsCache = new MarkdownLinkParseFactsSession(cache);
    this.#signal = signal;
  }

  get targetReadCount(): number {
    return this.#targetReadCount;
  }

  finalize(): Promise<void> {
    return this.#parseFactsCache.finalize(this.#signal);
  }

  readSource(rootRelativePath: string, maxMarkdownBytes: number) {
    return readRootContainedMarkdownSource({
      canonicalProjectRoot: this.#canonicalProjectRoot,
      maxMarkdownBytes,
      parseMarkdownBytes: (bytes) => this.#parseMarkdownBytes(bytes),
      rootRelativePath,
      signal: this.#signal
    });
  }

  async resolve(request: MarkdownLocalResolutionRequest): Promise<MarkdownLocalResolution> {
    if (this.#signal.aborted) return unavailable("target-unavailable");
    const destination = parseLocalDestination(request.rawDestination);
    if (destination === "not-local") {
      return Object.freeze({ kind: "not-local" as const });
    }
    if (destination === null) {
      return unavailable("invalid-local-destination");
    }

    let targetPath: string;
    if (destination.path === "") {
      targetPath = path.resolve(this.#canonicalProjectRoot, request.source.path);
    } else if (destination.isAbsolute) {
      targetPath = path.normalize(destination.path);
    } else {
      targetPath = path.resolve(
        this.#canonicalProjectRoot,
        path.dirname(request.source.path),
        destination.path
      );
    }
    const isSameDocument =
      !destination.isAbsolute &&
      sameRootRelativePath(request.source.path, targetPath, this.#canonicalProjectRoot);
    if (isSameDocument) {
      return this.resolveSameDocument(destination.fragment, request);
    }
    const lexicalTargetIsExternal =
      destination.isAbsolute || !isWithinRoot(this.#canonicalProjectRoot, targetPath);

    if (lexicalTargetIsExternal) {
      return this.resolveExternalTarget(targetPath, destination.fragment, request);
    }

    return this.resolveRootContainedTarget(targetPath, destination.fragment, request);
  }

  async resolveRootContainedTarget(
    targetPath: string,
    fragment: string | null,
    request: MarkdownLocalResolutionRequest
  ): Promise<MarkdownLocalResolution> {
    const rootProbe = await probeRootContainedPath(this.#canonicalProjectRoot, targetPath);
    if (rootProbe.kind === "outside") {
      return this.resolveExternalTarget(targetPath, fragment, request);
    }
    if (rootProbe.kind === "unavailable") {
      return unavailable("target-unavailable");
    }
    if (rootProbe.kind === "missing") {
      if (!this.beginTargetValidation()) {
        return unavailable("target-read-limit-exceeded");
      }
      const target = projectTarget(this.#canonicalProjectRoot, targetPath, fragment);
      return request.requireExistingTargets ? finding("missing-target", target) : valid(target);
    }
    if (!this.beginTargetValidation()) {
      return unavailable("target-read-limit-exceeded");
    }
    return this.resolveEndpoint(
      rootProbe.endpoint ?? (await probeEndpoint(rootProbe.absolutePath)),
      rootProbe.absolutePath,
      fragment,
      request,
      projectTarget(this.#canonicalProjectRoot, targetPath, fragment)
    );
  }

  async resolveExternalTarget(
    targetPath: string,
    fragment: string | null,
    request: MarkdownLocalResolutionRequest
  ): Promise<MarkdownLocalResolution> {
    if (request.rootExternalTargetMode === "ignore") {
      return Object.freeze({ kind: "ignored" as const });
    }
    if (request.rootExternalTargetMode === "report") {
      return finding("target-outside-project-root", outsideProjectRootTarget());
    }
    if (!this.beginTargetValidation()) {
      return unavailable("target-read-limit-exceeded");
    }
    return this.resolveEndpoint(
      await probeEndpoint(targetPath),
      targetPath,
      fragment,
      request,
      outsideProjectRootTarget()
    );
  }

  async resolveEndpoint(
    endpoint: EndpointProbe,
    targetPath: string,
    fragment: string | null,
    request: MarkdownLocalResolutionRequest,
    target: MarkdownSafeTargetDescriptor
  ): Promise<MarkdownLocalResolution> {
    if (endpoint.kind === "missing") {
      return request.requireExistingTargets ? finding("missing-target", target) : valid(target);
    }
    if (endpoint.kind === "unavailable") {
      return unavailable("target-unavailable");
    }
    if (endpoint.kind === "directory") {
      return this.resolveDirectory(targetPath, fragment, request, directoryTarget(target));
    }
    if (endpoint.kind === "unsupported") {
      return finding("unsupported-target-type", target);
    }

    return this.resolveFile(targetPath, fragment, request, fileTargetDescriptor(target));
  }

  async resolveFile(
    targetPath: string,
    fragment: string | null,
    request: MarkdownLocalResolutionRequest,
    target: MarkdownSafeTargetDescriptor
  ): Promise<MarkdownLocalResolution> {
    if (fragment === null || !request.validateCrossDocumentAnchors) {
      return valid(target);
    }
    if (!isMarkdownPath(targetPath)) {
      return finding("anchor-target-not-markdown", target);
    }

    const facts = await this.#targetFacts(targetPath, request.maxMarkdownBytes);
    return facts === undefined
      ? unavailable("target-unavailable")
      : anchorResolution(facts.headings, fragment, target);
  }

  async resolveDirectory(
    targetPath: string,
    fragment: string | null,
    request: MarkdownLocalResolutionRequest,
    target: MarkdownSafeTargetDescriptor
  ): Promise<MarkdownLocalResolution> {
    if (this.#signal.aborted) return unavailable("target-unavailable");
    if (fragment !== null) {
      return finding("anchor-on-directory", target);
    }
    if (!request.requireNonEmptyDirectories) {
      return valid(target);
    }
    try {
      const directory = await opendir(targetPath);
      try {
        return (await directory.read()) === null
          ? finding("empty-directory", target)
          : valid(target);
      } finally {
        await directory.close();
      }
    } catch {
      return unavailable("target-unavailable");
    }
  }

  beginTargetValidation(): boolean {
    if (this.#targetReadCount >= this.#maxTargetReads) {
      return false;
    }
    this.#targetReadCount += 1;
    return true;
  }

  async #targetFacts(
    targetPath: string,
    maxMarkdownBytes: number
  ): Promise<ParsedMarkdownLinkFacts | undefined> {
    if (this.#signal.aborted) return undefined;
    const key = JSON.stringify([targetPath, maxMarkdownBytes]);
    const existing = this.#targetFactMemo.get(key);
    if (existing !== undefined) return existing;

    const pending = this.#readTargetFacts(targetPath, maxMarkdownBytes);
    this.#targetFactMemo.set(key, pending);
    const facts = await pending;
    if (facts === undefined && this.#targetFactMemo.get(key) === pending) {
      this.#targetFactMemo.delete(key);
    }
    return facts;
  }

  async #readTargetFacts(
    targetPath: string,
    maxMarkdownBytes: number
  ): Promise<ParsedMarkdownLinkFacts | undefined> {
    const targetMarkdown = await readRegularFile(targetPath, maxMarkdownBytes);
    if (!targetMarkdown.ok || this.#signal.aborted) return undefined;
    const parsed = await this.#parseMarkdownBytes(targetMarkdown.bytes);
    return this.#signal.aborted || parsed === undefined || !parsed.ok ? undefined : parsed.facts;
  }

  async #parseMarkdownBytes(bytes: Uint8Array): Promise<MarkdownLinkParseResult | undefined> {
    if (this.#signal.aborted) return undefined;
    const parsed = await this.#parseFactsCache.parse(bytes, this.#signal);
    return this.#signal.aborted ? undefined : parsed;
  }

  resolveSameDocument(
    fragment: string | null,
    request: MarkdownLocalResolutionRequest
  ): MarkdownLocalResolution {
    const target = Object.freeze({
      kind: "same-document" as const,
      path: request.source.path,
      fragment
    });
    if (fragment === null || !request.validateSameDocumentAnchors) {
      return valid(target);
    }
    return anchorResolution(request.source.facts.headings, fragment, target);
  }
}
