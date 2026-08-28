import { constants } from "node:fs";
import { lstat, open, opendir, readlink, realpath } from "node:fs/promises";
import path from "node:path";

import { parseMarkdownLinkFacts } from "./markdown-parser.ts";
import type { MarkdownHeading, ParsedMarkdownLinkFacts } from "./markdown-parser.ts";

type RootExternalTargetMode = "ignore" | "report" | "validate";
const NOT_LOCAL_FILE_URI: unique symbol = Symbol("not-local-file-uri");

/** Markdown local-link finding Record 的稳定 reason。 */
export type MarkdownLinkFindingReason =
  | "anchor-on-directory"
  | "anchor-target-not-markdown"
  | "empty-directory"
  | "missing-anchor"
  | "missing-target"
  | "target-outside-project-root"
  | "unsupported-target-type";

type MarkdownLocalResolutionReason =
  | "invalid-local-destination"
  | "target-read-limit-exceeded"
  | "target-unavailable";

type MarkdownSourceReadFailureReason =
  | "markdown-parse-failed"
  | "source-unavailable"
  | "source-too-large";

interface MarkdownLinkSource {
  readonly path: string;
  readonly facts: ParsedMarkdownLinkFacts;
}

interface MarkdownLocalResolver {
  readSource(rootRelativePath: string, maxMarkdownBytes: number): Promise<MarkdownSourceReadResult>;
  resolve(request: MarkdownLocalResolutionRequest): Promise<MarkdownLocalResolution>;
  readonly targetReadCount: number;
}

interface MarkdownLocalResolutionRequest {
  readonly source: MarkdownLinkSource;
  readonly rawDestination: string;
  readonly rootExternalTargetMode: RootExternalTargetMode;
  readonly requireExistingTargets: boolean;
  readonly requireNonEmptyDirectories: boolean;
  readonly validateSameDocumentAnchors: boolean;
  readonly validateCrossDocumentAnchors: boolean;
  readonly maxMarkdownBytes: number;
}

type MarkdownLocalResolverCreation =
  | Readonly<{ readonly ok: true; readonly resolver: MarkdownLocalResolver }>
  | Readonly<{ readonly ok: false; readonly reason: "project-root-unavailable" }>;

type MarkdownSourceReadResult =
  | Readonly<{ readonly ok: true; readonly source: MarkdownLinkSource }>
  | Readonly<{
      readonly ok: false;
      readonly reason: MarkdownSourceReadFailureReason;
    }>;

type MarkdownLocalResolution =
  | Readonly<{ readonly kind: "not-local" | "ignored" }>
  | Readonly<{ readonly kind: "valid"; readonly target: MarkdownSafeTargetDescriptor }>
  | Readonly<{
      readonly kind: "finding";
      readonly reason: MarkdownLinkFindingReason;
      readonly target: MarkdownSafeTargetDescriptor;
    }>
  | Readonly<{ readonly kind: "unavailable"; readonly reason: MarkdownLocalResolutionReason }>;

type MarkdownSafeTargetDescriptor =
  | Readonly<{
      readonly kind: "same-document" | "project-file" | "project-directory" | "project-path";
      readonly path: string;
      readonly fragment: string | null;
    }>
  | Readonly<{ readonly kind: "outside-project-root" }>;

interface ParsedLocalDestination {
  readonly path: string;
  readonly fragment: string | null;
  readonly isAbsolute: boolean;
}

interface RootContainedPath {
  readonly kind: "contained" | "missing";
  readonly absolutePath: string;
}

type RootProbe =
  | RootContainedPath
  | Readonly<{ readonly kind: "outside" }>
  | Readonly<{ readonly kind: "unavailable" }>;

type EndpointProbe =
  | Readonly<{ readonly kind: "missing" }>
  | Readonly<{ readonly kind: "directory" | "file" | "unsupported" | "unavailable" }>;

/** Link-private, per-invocation state for source reads and direct local targets. */
export async function createMarkdownLocalResolver(
  projectRoot: string,
  maxTargetReads: number
): Promise<MarkdownLocalResolverCreation> {
  try {
    const canonicalProjectRoot = await realpath(projectRoot);
    return Object.freeze({
      ok: true as const,
      resolver: new LinkLocalResolver(canonicalProjectRoot, maxTargetReads)
    });
  } catch {
    return Object.freeze({ ok: false as const, reason: "project-root-unavailable" as const });
  }
}

class LinkLocalResolver implements MarkdownLocalResolver {
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

function parseLocalDestination(
  rawDestination: string
): ParsedLocalDestination | "not-local" | null {
  if (rawDestination.startsWith("//") || rawDestination.startsWith("\\\\")) {
    return "not-local";
  }
  if (isHostWindowsDriveAbsolute(rawDestination)) {
    return parsePathAndFragment(rawDestination, false);
  }
  const scheme = /^([A-Za-z][A-Za-z\d+.-]*):/u.exec(rawDestination);
  if (scheme !== null) {
    if (scheme[1]?.toLowerCase() !== "file") {
      return "not-local";
    }
    return parseFileDestination(rawDestination);
  }
  if (path.sep !== "\\" && /^[A-Za-z]:[\\/]/u.test(rawDestination)) {
    return "not-local";
  }
  return parsePathAndFragment(rawDestination, false);
}

function parseFileDestination(rawDestination: string): ParsedLocalDestination | "not-local" | null {
  const match = /^file:\/\/(\/.*)$/iu.exec(rawDestination);
  if (match === null) {
    return "not-local";
  }
  const uriPathAndFragment = match[1];
  if (uriPathAndFragment === undefined || uriPathAndFragment.startsWith("//")) {
    return "not-local";
  }
  if (hasUriQuery(uriPathAndFragment) || containsUnsafeRawFileCharacter(uriPathAndFragment)) {
    return "not-local";
  }
  const parsed = parsePathAndFragment(uriPathAndFragment, true);
  if (parsed === null || parsed === "not-local") {
    return parsed;
  }
  return Object.freeze({ ...parsed, isAbsolute: true });
}

function parsePathAndFragment(
  rawDestination: string,
  isFileUri: boolean
): ParsedLocalDestination | "not-local" | null {
  const hashIndex = rawDestination.indexOf("#");
  const queryIndex = rawDestination.indexOf("?");
  const pathEnd = [hashIndex, queryIndex]
    .filter((index) => index >= 0)
    .reduce((smallest, index) => Math.min(smallest, index), rawDestination.length);
  const rawPath = rawDestination.slice(0, pathEnd);
  const rawFragment = hashIndex >= 0 ? rawDestination.slice(hashIndex + 1) : null;
  const decodedPath = decodeLocalComponent(rawPath);
  const decodedFragment = rawFragment === null ? null : decodeLocalComponent(rawFragment);
  if (decodedPath === null || (decodedFragment === null && rawFragment !== null)) {
    return null;
  }
  const resolvedPath = isFileUri ? hostFileUriPath(decodedPath) : decodedPath;
  if (resolvedPath === null) return null;
  if (resolvedPath === NOT_LOCAL_FILE_URI) return "not-local";
  return Object.freeze({
    path: resolvedPath,
    fragment: decodedFragment,
    isAbsolute: isFileUri || path.isAbsolute(resolvedPath)
  });
}

function decodeLocalComponent(rawComponent: string): string | null {
  if (containsControlCharacter(rawComponent) || /%(?:2f|5c|00|0[0-9a-f]|7f)/iu.test(rawComponent)) {
    return null;
  }
  try {
    const decoded = decodeURIComponent(rawComponent);
    return containsControlCharacter(decoded) ? null : decoded;
  } catch {
    return null;
  }
}

function isHostWindowsDriveAbsolute(value: string): boolean {
  return path.sep === "\\" && /^[A-Za-z]:[\\/]/u.test(value);
}

function hostFileUriPath(decodedPath: string): string | typeof NOT_LOCAL_FILE_URI | null {
  if (decodedPath.includes("\\")) return null;
  if (path.sep === "\\") {
    if (!/^\/[A-Za-z]:\//u.test(decodedPath)) return NOT_LOCAL_FILE_URI;
    return path.normalize(decodedPath.slice(1));
  }
  if (/^\/[A-Za-z]:\//u.test(decodedPath)) return NOT_LOCAL_FILE_URI;
  return path.isAbsolute(decodedPath) ? decodedPath : null;
}

function hasUriQuery(uriPathAndFragment: string): boolean {
  const queryIndex = uriPathAndFragment.indexOf("?");
  if (queryIndex < 0) return false;
  const fragmentIndex = uriPathAndFragment.indexOf("#");
  return fragmentIndex < 0 || queryIndex < fragmentIndex;
}

async function probeRootContainedPath(
  canonicalProjectRoot: string,
  candidatePath: string
): Promise<RootProbe> {
  if (!isWithinRoot(canonicalProjectRoot, candidatePath)) {
    return Object.freeze({ kind: "outside" as const });
  }
  let pendingSegments = relativeSegments(canonicalProjectRoot, candidatePath);
  let currentPath = canonicalProjectRoot;
  let symlinkHops = 0;

  while (pendingSegments.length > 0) {
    const segment = pendingSegments.shift();
    if (segment === undefined) {
      return Object.freeze({ kind: "unavailable" as const });
    }
    const nextPath = path.join(currentPath, segment);
    let status: Awaited<ReturnType<typeof lstat>>;
    try {
      status = await lstat(nextPath);
    } catch (error: unknown) {
      if (isNotFound(error)) {
        return Object.freeze({ kind: "missing" as const, absolutePath: nextPath });
      }
      return Object.freeze({ kind: "unavailable" as const });
    }
    if (!status.isSymbolicLink()) {
      currentPath = nextPath;
      continue;
    }
    if (symlinkHops >= 40) {
      return Object.freeze({ kind: "unavailable" as const });
    }
    symlinkHops += 1;
    let linkDestination: string;
    try {
      linkDestination = path.resolve(path.dirname(nextPath), await readlink(nextPath));
    } catch {
      return Object.freeze({ kind: "unavailable" as const });
    }
    if (!isWithinRoot(canonicalProjectRoot, linkDestination)) {
      return Object.freeze({ kind: "outside" as const });
    }
    pendingSegments = [
      ...relativeSegments(canonicalProjectRoot, linkDestination),
      ...pendingSegments
    ];
    currentPath = canonicalProjectRoot;
  }

  return Object.freeze({ kind: "contained" as const, absolutePath: currentPath });
}

async function probeEndpoint(targetPath: string): Promise<EndpointProbe> {
  let status: Awaited<ReturnType<typeof lstat>>;
  try {
    status = await lstat(targetPath);
  } catch (error: unknown) {
    return isNotFound(error)
      ? Object.freeze({ kind: "missing" as const })
      : Object.freeze({ kind: "unavailable" as const });
  }
  if (status.isSymbolicLink()) {
    return Object.freeze({ kind: "unavailable" as const });
  }
  if (status.isDirectory()) {
    return Object.freeze({ kind: "directory" as const });
  }
  if (status.isFile()) {
    return Object.freeze({ kind: "file" as const });
  }
  return Object.freeze({ kind: "unsupported" as const });
}

async function readRegularFile(
  filePath: string,
  maxBytes: number
): Promise<
  | Readonly<{ readonly ok: true; readonly bytes: Uint8Array }>
  | Readonly<{ readonly ok: false; readonly reason: "too-large" | "unavailable" }>
> {
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const status = await handle.stat();
    if (!status.isFile()) {
      return Object.freeze({ ok: false as const, reason: "unavailable" as const });
    }
    if (status.size > maxBytes) {
      return Object.freeze({ ok: false as const, reason: "too-large" as const });
    }
    const bytes = await readBoundedBytes(handle, maxBytes);
    return bytes === null
      ? Object.freeze({ ok: false as const, reason: "too-large" as const })
      : Object.freeze({ ok: true as const, bytes });
  } catch {
    return Object.freeze({ ok: false as const, reason: "unavailable" as const });
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function readBoundedBytes(
  handle: Awaited<ReturnType<typeof open>>,
  maxBytes: number
): Promise<Uint8Array | null> {
  const bytes = new Uint8Array(maxBytes + 1);
  let offset = 0;
  while (offset < bytes.byteLength) {
    const result = await handle.read(bytes, offset, bytes.byteLength - offset, offset);
    if (result.bytesRead === 0) break;
    offset += result.bytesRead;
  }
  return offset > maxBytes ? null : bytes.slice(0, offset);
}

function anchorResolution(
  headings: readonly MarkdownHeading[],
  fragment: string,
  target: MarkdownSafeTargetDescriptor
): MarkdownLocalResolution {
  return headings.some((heading) => heading.slug === fragment)
    ? valid(target)
    : finding("missing-anchor", target);
}

function isRootRelativePath(canonicalProjectRoot: string, rootRelativePath: string): boolean {
  return (
    !path.isAbsolute(rootRelativePath) &&
    isWithinRoot(canonicalProjectRoot, path.resolve(canonicalProjectRoot, rootRelativePath))
  );
}

function isWithinRoot(root: string, candidate: string): boolean {
  const relativePath = path.relative(root, candidate);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== ".." &&
      !path.isAbsolute(relativePath))
  );
}

function relativeSegments(root: string, candidate: string): string[] {
  const relativePath = path.relative(root, candidate);
  return relativePath === ""
    ? []
    : relativePath.split(path.sep).filter((segment) => segment !== "");
}

function sameRootRelativePath(
  rootRelativePath: string,
  targetPath: string,
  canonicalProjectRoot: string
): boolean {
  return toSlashPath(path.relative(canonicalProjectRoot, targetPath)) === rootRelativePath;
}

function isMarkdownPath(targetPath: string): boolean {
  const extension = path.extname(targetPath).toLowerCase();
  return extension === ".md" || extension === ".markdown";
}

function toSlashPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function projectTarget(
  canonicalProjectRoot: string,
  targetPath: string,
  fragment: string | null,
  kind: "project-directory" | "project-file" | "project-path" = "project-path"
): MarkdownSafeTargetDescriptor {
  return Object.freeze({
    kind,
    path: toSlashPath(path.relative(canonicalProjectRoot, targetPath)),
    fragment
  });
}

function outsideProjectRootTarget(): MarkdownSafeTargetDescriptor {
  return Object.freeze({ kind: "outside-project-root" as const });
}

function fileTargetDescriptor(target: MarkdownSafeTargetDescriptor): MarkdownSafeTargetDescriptor {
  if (target.kind === "outside-project-root") return target;
  return Object.freeze({ ...target, kind: "project-file" as const });
}

function directoryTarget(target: MarkdownSafeTargetDescriptor): MarkdownSafeTargetDescriptor {
  if (target.kind === "outside-project-root") return target;
  return Object.freeze({ ...target, kind: "project-directory" as const });
}

function containsUnsafeRawFileCharacter(value: string): boolean {
  return value.includes("\\") || containsControlCharacter(value) || /\s/u.test(value);
}

function containsControlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint !== undefined &&
      (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f))
    ) {
      return true;
    }
  }
  return false;
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function sourceUnavailable(): MarkdownSourceReadResult {
  return Object.freeze({ ok: false as const, reason: "source-unavailable" as const });
}

function valid(target: MarkdownSafeTargetDescriptor): MarkdownLocalResolution {
  return Object.freeze({ kind: "valid" as const, target });
}

function finding(
  reason: MarkdownLinkFindingReason,
  target: MarkdownSafeTargetDescriptor
): MarkdownLocalResolution {
  return Object.freeze({ kind: "finding" as const, reason, target });
}

function unavailable(reason: MarkdownLocalResolutionReason): MarkdownLocalResolution {
  return Object.freeze({ kind: "unavailable" as const, reason });
}

export type {
  MarkdownLinkSource,
  MarkdownLocalResolution,
  MarkdownLocalResolutionReason,
  MarkdownLocalResolver,
  MarkdownLocalResolverCreation,
  MarkdownLocalResolutionRequest,
  MarkdownSafeTargetDescriptor,
  MarkdownSourceReadResult,
  MarkdownSourceReadFailureReason,
  RootExternalTargetMode
};
