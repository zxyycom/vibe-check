import path from "node:path";

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
  finalize(): Promise<void>;
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

type RootProbe =
  | Readonly<{
      readonly kind: "contained";
      readonly absolutePath: string;
      /** The final component observation is present when containment walked it. */
      readonly endpoint?: ExistingEndpointProbe;
    }>
  | Readonly<{
      readonly kind: "missing";
      readonly absolutePath: string;
    }>
  | Readonly<{ readonly kind: "outside" }>
  | Readonly<{ readonly kind: "unavailable" }>;

type EndpointProbe = Readonly<{ readonly kind: "missing" }> | ExistingEndpointProbe;

type ExistingEndpointProbe = Readonly<{
  readonly kind: "directory" | "file" | "unsupported" | "unavailable";
}>;

export function parseLocalDestination(
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

export function anchorResolution(
  headings: readonly MarkdownHeading[],
  fragment: string,
  target: MarkdownSafeTargetDescriptor
): MarkdownLocalResolution {
  return headings.some((heading) => heading.slug === fragment)
    ? valid(target)
    : finding("missing-anchor", target);
}

export function isRootRelativePath(
  canonicalProjectRoot: string,
  rootRelativePath: string
): boolean {
  return (
    !path.isAbsolute(rootRelativePath) &&
    isWithinRoot(canonicalProjectRoot, path.resolve(canonicalProjectRoot, rootRelativePath))
  );
}

export function isWithinRoot(root: string, candidate: string): boolean {
  const relativePath = path.relative(root, candidate);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== ".." &&
      !path.isAbsolute(relativePath))
  );
}

export function relativeSegments(root: string, candidate: string): string[] {
  const relativePath = path.relative(root, candidate);
  return relativePath === ""
    ? []
    : relativePath.split(path.sep).filter((segment) => segment !== "");
}

export function sameRootRelativePath(
  rootRelativePath: string,
  targetPath: string,
  canonicalProjectRoot: string
): boolean {
  return toSlashPath(path.relative(canonicalProjectRoot, targetPath)) === rootRelativePath;
}

export function isMarkdownPath(targetPath: string): boolean {
  const extension = path.extname(targetPath).toLowerCase();
  return extension === ".md" || extension === ".markdown";
}

export function toSlashPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
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

export function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export function sourceUnavailable(): MarkdownSourceReadResult {
  return Object.freeze({ ok: false as const, reason: "source-unavailable" as const });
}

export function valid(target: MarkdownSafeTargetDescriptor): MarkdownLocalResolution {
  return Object.freeze({ kind: "valid" as const, target });
}

export function finding(
  reason: MarkdownLinkFindingReason,
  target: MarkdownSafeTargetDescriptor
): MarkdownLocalResolution {
  return Object.freeze({ kind: "finding" as const, reason, target });
}

export function unavailable(reason: MarkdownLocalResolutionReason): MarkdownLocalResolution {
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
  RootProbe,
  EndpointProbe,
  ExistingEndpointProbe,
  RootExternalTargetMode
};
