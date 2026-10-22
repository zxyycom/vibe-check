import { opendir } from "node:fs/promises";

import type { LinkIoSession } from "./io-session.ts";
import { isMarkdownPath, unavailable, type MarkdownLocalResolution } from "./local-resolution.ts";
import type { ParsedMarkdownLinkFacts } from "./markdown-parser.ts";
import type { MarkdownLinkParseFactsSession } from "./parse-facts-cache/session.ts";
import type { TargetEdge, TargetNode, TargetObservation } from "./reference-graph.ts";

type TargetUnavailable = Extract<MarkdownLocalResolution, { kind: "unavailable" }>;
type EndpointObservation = Extract<TargetObservation, { kind: "endpoint" }>;

/** Reuse authorized source facts, otherwise acquire the node's first containment/type observation. */
export async function authorizeTargetNode(
  node: TargetNode,
  io: LinkIoSession
): Promise<TargetObservation | TargetUnavailable> {
  if (node.observation !== undefined) {
    return node.observation;
  }
  if (node.source !== undefined) {
    return { kind: "endpoint", endpoint: { kind: "file" }, facts: node.source.facts };
  }
  if (node.isExternalDomain) {
    const endpoint = await io.probeEndpoint(node.path);
    return endpoint.kind === "unavailable"
      ? unavailable("target-unavailable")
      : { kind: "endpoint", endpoint };
  }
  return observeContainedEndpoint(node, io);
}

async function observeContainedEndpoint(
  node: TargetNode,
  io: LinkIoSession
): Promise<TargetObservation | TargetUnavailable> {
  const probe = await io.probeRootContainedPath(node.path);
  switch (probe.kind) {
    case "unavailable":
      return unavailable("target-unavailable");
    case "outside":
      node.isOutsideRoot = true;
      return { kind: "outside" };
    case "missing":
      return { kind: "endpoint", endpoint: { kind: "missing" } };
    case "contained": {
      node.endpointPath = probe.absolutePath;
      const endpoint = probe.endpoint ?? (await io.probeEndpoint(probe.absolutePath));
      return endpoint.kind === "unavailable"
        ? unavailable("target-unavailable")
        : { kind: "endpoint", endpoint };
    }
  }
}

interface TargetDemand {
  readonly io: LinkIoSession;
  readonly targetPath: string;
  readonly edges: readonly TargetEdge[];
  readonly existing: EndpointObservation;
  readonly cache: MarkdownLinkParseFactsSession;
  readonly signal: AbortSignal;
}

/** Called only after the resolver has charged the entire authorized logical-edge batch. */
export async function observeTargetDemand(
  demand: TargetDemand
): Promise<EndpointObservation | TargetUnavailable> {
  if (demand.signal.aborted) {
    return unavailable("target-unavailable");
  }
  let { facts, isEmpty } = demand.existing;
  const headingEdge = demand.edges.find(
    ({ fragment, request }) => fragment !== null && request.validateCrossDocumentAnchors
  );
  const needsHeadings = needsHeadingFacts(demand, headingEdge, facts);
  if (needsHeadings && headingEdge !== undefined) {
    facts = await readTargetFacts(demand, headingEdge.request.maxMarkdownBytes);
    if (facts === undefined) {
      return unavailable("target-unavailable");
    }
  }
  const needsEntry = needsDirectoryEntry(demand, isEmpty);
  if (needsEntry) {
    isEmpty = await readDirectoryEntry(demand.targetPath);
    if (isEmpty === undefined) {
      return unavailable("target-unavailable");
    }
  }
  return {
    kind: "endpoint",
    endpoint: demand.existing.endpoint,
    ...(facts === undefined ? {} : { facts }),
    ...(isEmpty === undefined ? {} : { isEmpty })
  };
}

async function readTargetFacts(
  demand: TargetDemand,
  maxBytes: number
): Promise<ParsedMarkdownLinkFacts | undefined> {
  const bytes = await demand.io.readRegularFile(demand.targetPath, maxBytes);
  if (!bytes.ok || demand.signal.aborted) {
    return undefined;
  }
  const parsed = await demand.cache.parse(bytes.bytes, demand.signal);
  if (demand.signal.aborted || parsed === undefined || !parsed.ok) {
    return undefined;
  }
  return parsed.facts;
}

async function readDirectoryEntry(targetPath: string): Promise<boolean | undefined> {
  try {
    const directory = await opendir(targetPath);
    try {
      return (await directory.read()) === null;
    } finally {
      await directory.close();
    }
  } catch {
    return undefined;
  }
}

function needsHeadingFacts(
  demand: TargetDemand,
  edge: TargetEdge | undefined,
  facts: ParsedMarkdownLinkFacts | undefined
): boolean {
  return (
    demand.existing.endpoint.kind === "file" &&
    isMarkdownPath(demand.targetPath) &&
    edge !== undefined &&
    facts === undefined
  );
}
function needsDirectoryEntry(demand: TargetDemand, isEmpty: boolean | undefined): boolean {
  return (
    demand.existing.endpoint.kind === "directory" &&
    isEmpty === undefined &&
    demand.edges.some(
      ({ fragment, request }) => fragment === null && request.requireNonEmptyDirectories
    )
  );
}
