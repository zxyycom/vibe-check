import { opendir } from "node:fs/promises";
import path from "node:path";

import { parseMarkdownLinkFacts } from "./markdown-parser.ts";
import {
  directoryTarget,
  fileTargetDescriptor,
  outsideProjectRootTarget,
  projectTarget
} from "./target-descriptor.ts";
import { probeEndpoint, probeRootContainedPath, readRegularFile } from "./filesystem-probes.ts";
import {
  anchorResolution,
  finding,
  isMarkdownPath,
  isRootRelativePath,
  isWithinRoot,
  parseLocalDestination,
  sameRootRelativePath,
  sourceUnavailable,
  toSlashPath,
  unavailable,
  valid,
  type MarkdownLocalResolution,
  type MarkdownLocalResolutionRequest,
  type MarkdownLocalResolver,
  type MarkdownSafeTargetDescriptor,
  type MarkdownSourceReadResult
} from "./local-resolution.ts";

export class LinkLocalResolver implements MarkdownLocalResolver {
  #targetReadCount = 0;
  readonly #canonicalProjectRoot: string;
  readonly #maxTargetReads: number;

  constructor(canonicalProjectRoot: string, maxTargetReads: number) {
    this.#canonicalProjectRoot = canonicalProjectRoot;
    this.#maxTargetReads = maxTargetReads;
  }

  get targetReadCount(): number {
    return this.#targetReadCount;
  }

  async readSource(
    rootRelativePath: string,
    maxMarkdownBytes: number
  ): Promise<MarkdownSourceReadResult> {
    if (!isRootRelativePath(this.#canonicalProjectRoot, rootRelativePath)) {
      return sourceUnavailable();
    }

    const sourcePath = path.resolve(this.#canonicalProjectRoot, rootRelativePath);
    const rootProbe = await probeRootContainedPath(this.#canonicalProjectRoot, sourcePath);
    if (
      rootProbe.kind === "outside" ||
      rootProbe.kind === "unavailable" ||
      rootProbe.kind === "missing"
    ) {
      return sourceUnavailable();
    }

    const sourceBytes = await readRegularFile(rootProbe.absolutePath, maxMarkdownBytes);
    if (!sourceBytes.ok) {
      return sourceBytes.reason === "too-large"
        ? Object.freeze({ ok: false as const, reason: "source-too-large" as const })
        : sourceUnavailable();
    }

    let markdown: string;
    try {
      markdown = new TextDecoder("utf-8", { fatal: true }).decode(sourceBytes.bytes);
    } catch {
      return sourceUnavailable();
    }

    const parsed = parseMarkdownLinkFacts(markdown);
    if (!parsed.ok) {
      return Object.freeze({ ok: false as const, reason: "markdown-parse-failed" as const });
    }

    return Object.freeze({
      ok: true as const,
      source: Object.freeze({
        path: toSlashPath(path.relative(this.#canonicalProjectRoot, sourcePath)),
        facts: parsed.facts
      })
    });
  }

  async resolve(request: MarkdownLocalResolutionRequest): Promise<MarkdownLocalResolution> {
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
    return this.resolveEndpoint(targetPath, fragment, request, outsideProjectRootTarget());
  }

  async resolveEndpoint(
    targetPath: string,
    fragment: string | null,
    request: MarkdownLocalResolutionRequest,
    target: MarkdownSafeTargetDescriptor
  ): Promise<MarkdownLocalResolution> {
    const endpoint = await probeEndpoint(targetPath);
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

    const targetMarkdown = await readRegularFile(targetPath, request.maxMarkdownBytes);
    if (!targetMarkdown.ok) {
      return unavailable("target-unavailable");
    }
    let decodedTarget: string;
    try {
      decodedTarget = new TextDecoder("utf-8", { fatal: true }).decode(targetMarkdown.bytes);
    } catch {
      return unavailable("target-unavailable");
    }
    const parsedTarget = parseMarkdownLinkFacts(decodedTarget);
    if (!parsedTarget.ok) {
      return unavailable("target-unavailable");
    }
    return anchorResolution(parsedTarget.facts.headings, fragment, target);
  }

  async resolveDirectory(
    targetPath: string,
    fragment: string | null,
    request: MarkdownLocalResolutionRequest,
    target: MarkdownSafeTargetDescriptor
  ): Promise<MarkdownLocalResolution> {
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
