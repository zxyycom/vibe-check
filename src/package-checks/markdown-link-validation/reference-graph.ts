import path from "node:path";

import type { ParsedMarkdownLinkFacts } from "./markdown-parser.ts";
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
  type MarkdownSafeTargetDescriptor,
  type MarkdownLinkSource,
  type EndpointProbe
} from "./local-resolution.ts";
import {
  directoryTarget,
  fileTargetDescriptor,
  outsideProjectRootTarget,
  projectTarget
} from "./target-descriptor.ts";

export interface TargetNode {
  readonly path: string;
  readonly isExternalDomain: boolean;
  source?: MarkdownLinkSource;
  isOutsideRoot?: boolean;
  endpointPath?: string;
  observation?: TargetObservation;
}
export interface TargetEdge {
  readonly request: MarkdownLocalResolutionRequest;
  readonly fragment: string | null;
  readonly node: TargetNode;
}
export type ReferenceEdge = TargetEdge | MarkdownLocalResolution;
export type TargetObservation =
  | { readonly kind: "outside" }
  | {
      readonly kind: "endpoint";
      readonly endpoint: EndpointProbe;
      readonly facts?: ParsedMarkdownLinkFacts;
      readonly isEmpty?: boolean;
    };
export type HeadingSlugMemo = WeakMap<ParsedMarkdownLinkFacts, ReadonlySet<string>>;

/** Logical path and authorization domain own identity; physical aliases remain distinct. */
export function referenceNode(
  nodes: Map<string, TargetNode>,
  targetPath: string,
  isExternalDomain: boolean
): TargetNode {
  const key = JSON.stringify([isExternalDomain ? "external" : "contained", targetPath]);
  const existing = nodes.get(key);
  if (existing !== undefined) {
    return existing;
  }
  const node = { path: targetPath, isExternalDomain };
  nodes.set(key, node);
  return node;
}

export function registerReference(
  request: MarkdownLocalResolutionRequest,
  root: string,
  nodes: Map<string, TargetNode>,
  headingMemo: HeadingSlugMemo
): ReferenceEdge {
  const destination = parseLocalDestination(request.rawDestination);
  if (destination === "not-local") {
    return { kind: "not-local" };
  }
  if (destination === null) {
    return unavailable("invalid-local-destination");
  }
  const targetPath = localTargetPath(root, request.source.path, destination);
  if (!destination.isAbsolute && sameRootRelativePath(request.source.path, targetPath, root)) {
    return resolveSameDocument(request, destination.fragment, headingMemo);
  }
  const isExternalDomain = destination.isAbsolute || !isWithinRoot(root, targetPath);
  if (isExternalDomain && request.rootExternalTargetMode !== "validate") {
    return outsideResolution(request);
  }
  return {
    request,
    fragment: destination.fragment,
    node: referenceNode(nodes, targetPath, isExternalDomain)
  };
}

function localTargetPath(
  root: string,
  sourcePath: string,
  destination: { readonly path: string; readonly isAbsolute: boolean }
): string {
  if (destination.path === "") {
    return path.resolve(root, sourcePath);
  }
  if (destination.isAbsolute) {
    return path.normalize(destination.path);
  }
  return path.resolve(root, path.dirname(sourcePath), destination.path);
}

function resolveSameDocument(
  request: MarkdownLocalResolutionRequest,
  fragment: string | null,
  headingMemo: HeadingSlugMemo
): MarkdownLocalResolution {
  const target = { kind: "same-document" as const, path: request.source.path, fragment };
  if (fragment !== null && request.validateSameDocumentAnchors) {
    return anchorResolution(headingSlugs(request.source.facts, headingMemo), fragment, target);
  }
  return valid(target);
}

export function settleTargetEdge(
  edge: TargetEdge,
  root: string,
  headingMemo: HeadingSlugMemo
): MarkdownLocalResolution {
  const { node, request, fragment } = edge;
  const observation = node.observation;
  if (observation === undefined) {
    throw new Error("Every target node must be observed before edge settlement");
  }
  if (observation.kind === "outside") {
    return outsideResolution(request);
  }
  if (isUnvalidatedEscape(edge)) {
    return outsideResolution(request);
  }
  const target = observedTarget(node, root, fragment);
  switch (observation.endpoint.kind) {
    case "missing":
      return request.requireExistingTargets ? finding("missing-target", target) : valid(target);
    case "unsupported":
      return finding("unsupported-target-type", target);
    case "unavailable":
      return unavailable("target-unavailable");
    case "directory":
      return settleDirectory(edge, observation, directoryTarget(target));
    case "file":
      return settleFile(edge, observation, fileTargetDescriptor(target), headingMemo);
  }
}

function settleDirectory(
  edge: TargetEdge,
  observation: Extract<TargetObservation, { kind: "endpoint" }>,
  target: MarkdownSafeTargetDescriptor
): MarkdownLocalResolution {
  if (edge.fragment !== null) {
    return finding("anchor-on-directory", target);
  }
  if (edge.request.requireNonEmptyDirectories && observation.isEmpty === true) {
    return finding("empty-directory", target);
  }
  return valid(target);
}

function settleFile(
  edge: TargetEdge,
  observation: Extract<TargetObservation, { kind: "endpoint" }>,
  target: MarkdownSafeTargetDescriptor,
  headingMemo: HeadingSlugMemo
): MarkdownLocalResolution {
  if (edge.fragment === null || !edge.request.validateCrossDocumentAnchors) {
    return valid(target);
  }
  if (!isMarkdownPath(edge.node.endpointPath ?? edge.node.path)) {
    return finding("anchor-target-not-markdown", target);
  }
  if (observation.facts === undefined) {
    throw new Error("A demanded Markdown anchor must have observed heading facts");
  }
  return anchorResolution(headingSlugs(observation.facts, headingMemo), edge.fragment, target);
}

function outsideResolution(request: MarkdownLocalResolutionRequest): MarkdownLocalResolution {
  return request.rootExternalTargetMode === "ignore"
    ? { kind: "ignored" }
    : finding("target-outside-project-root", outsideProjectRootTarget());
}

function headingSlugs(facts: ParsedMarkdownLinkFacts, memo: HeadingSlugMemo): ReadonlySet<string> {
  const existing = memo.get(facts);
  if (existing !== undefined) {
    return existing;
  }
  const slugs = new Set(facts.headings.map(({ slug }) => slug));
  memo.set(facts, slugs);
  return slugs;
}

function isUnvalidatedEscape(edge: TargetEdge): boolean {
  return edge.node.isOutsideRoot === true && edge.request.rootExternalTargetMode !== "validate";
}
function observedTarget(node: TargetNode, root: string, fragment: string | null) {
  if (node.isExternalDomain || node.isOutsideRoot === true) {
    return outsideProjectRootTarget();
  }
  return projectTarget(root, node.path, fragment);
}
