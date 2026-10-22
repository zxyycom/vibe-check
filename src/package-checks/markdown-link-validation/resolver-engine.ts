import { setImmediate } from "node:timers/promises";
import path from "node:path";

import { MarkdownLinkParseFactsSession } from "./parse-facts-cache/session.ts";
import { LinkIoSession } from "./io-session.ts";
import { readRootContainedMarkdownSource } from "./source-reader.ts";
import {
  unavailable,
  type MarkdownLocalResolution,
  type MarkdownLocalResolutionRequest,
  type MarkdownLocalResolver
} from "./local-resolution.ts";
import {
  referenceNode,
  registerReference,
  settleTargetEdge,
  type ReferenceEdge,
  type TargetNode,
  type TargetEdge,
  type HeadingSlugMemo
} from "./reference-graph.ts";
import { authorizeTargetNode, observeTargetDemand } from "./target-observation.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";

type TargetUnavailable = Extract<MarkdownLocalResolution, { kind: "unavailable" }>;
interface RegisteredReferences {
  readonly edges: readonly ReferenceEdge[];
  readonly batches: ReadonlyMap<TargetNode, readonly TargetEdge[]>;
}

/** Per-invocation graph session: source facts, logical charging, observation scheduling and parse cache. */
export class LinkLocalResolver implements MarkdownLocalResolver {
  #targetReadCount = 0;
  readonly #io: LinkIoSession;
  #finalization: Promise<void> | undefined;
  readonly #canonicalProjectRoot: string;
  readonly #parseFactsCache: MarkdownLinkParseFactsSession;
  readonly #maxTargetReads: number | false;
  readonly #signal: AbortSignal;
  readonly #nodes = new Map<string, TargetNode>();
  readonly #headingSlugMemo: HeadingSlugMemo = new WeakMap();

  constructor(
    canonicalProjectRoot: string,
    maxTargetReads: number | false,
    cache: ResolvedMarkdownLinkValidationOptions["cache"],
    signal: AbortSignal
  ) {
    this.#canonicalProjectRoot = canonicalProjectRoot;
    this.#maxTargetReads = maxTargetReads;
    this.#parseFactsCache = new MarkdownLinkParseFactsSession(cache);
    this.#signal = signal;
    this.#io = new LinkIoSession(canonicalProjectRoot, signal);
  }
  get targetReadCount(): number {
    return this.#targetReadCount;
  }
  get cacheMessages() {
    return this.#parseFactsCache.messages;
  }
  get finalizationFailed(): boolean {
    return this.#io.failed;
  }
  finalize(): Promise<void> {
    this.#finalization ??= this.#finalize();
    return this.#finalization;
  }
  async #finalize(): Promise<void> {
    try {
      await this.#parseFactsCache.finalize(this.#signal);
    } finally {
      await this.#io.finalize();
    }
  }

  async readSource(rootRelativePath: string, maxMarkdownBytes: number) {
    const read = await readRootContainedMarkdownSource({
      io: this.#io,
      canonicalProjectRoot: this.#canonicalProjectRoot,
      maxMarkdownBytes,
      parseMarkdownBytes: (bytes) => this.#parseFactsCache.parse(bytes, this.#signal),
      rootRelativePath,
      signal: this.#signal
    });
    if (read.ok) {
      const absolutePath = path.resolve(this.#canonicalProjectRoot, read.source.path);
      referenceNode(this.#nodes, absolutePath, false).source ??= read.source;
    }
    return read;
  }

  async resolve(request: MarkdownLocalResolutionRequest): Promise<MarkdownLocalResolution> {
    const resolved = await this.resolveAll([request]);
    if ("kind" in resolved) {
      return resolved;
    }
    const resolution = resolved[0];
    if (resolution === undefined) {
      throw new Error("A reference graph must settle every registered edge");
    }
    return resolution;
  }

  /** Every source is loaded first; registration aggregates all target demand before observation. */
  async resolveAll(
    requests: readonly MarkdownLocalResolutionRequest[]
  ): Promise<readonly MarkdownLocalResolution[] | TargetUnavailable> {
    const registered = await this.#registerEdges(requests);
    if ("kind" in registered) {
      return registered;
    }
    for (const [node, batch] of registered.batches) {
      const failure = await this.#observe(node, batch);
      if (failure !== undefined) {
        return failure;
      }
      if (!(await this.#checkpoint())) {
        return unavailable("target-unavailable");
      }
    }
    if (!(await this.#checkpoint())) {
      return unavailable("target-unavailable");
    }
    return this.#settleEdges(registered.edges);
  }

  async #registerEdges(
    requests: readonly MarkdownLocalResolutionRequest[]
  ): Promise<RegisteredReferences | TargetUnavailable> {
    const edges: ReferenceEdge[] = [];
    const batches = new Map<TargetNode, TargetEdge[]>();
    for (const [index, request] of requests.entries()) {
      if (this.#signal.aborted) {
        return unavailable("target-unavailable");
      }
      const edge = registerReference(
        request,
        this.#canonicalProjectRoot,
        this.#nodes,
        this.#headingSlugMemo
      );
      if ("kind" in edge && edge.kind === "unavailable") {
        return edge;
      }
      edges.push(edge);
      if (!("kind" in edge)) {
        const batch = batches.get(edge.node);
        if (batch === undefined) {
          batches.set(edge.node, [edge]);
        } else {
          batch.push(edge);
        }
      }
      if ((index + 1) % 256 === 0 && !(await this.#checkpoint())) {
        return unavailable("target-unavailable");
      }
    }
    if (!(await this.#checkpoint())) {
      return unavailable("target-unavailable");
    }
    return { edges, batches };
  }

  async #settleEdges(
    edges: readonly ReferenceEdge[]
  ): Promise<readonly MarkdownLocalResolution[] | TargetUnavailable> {
    const resolutions: MarkdownLocalResolution[] = [];
    for (const [index, edge] of edges.entries()) {
      resolutions.push(
        "kind" in edge
          ? edge
          : settleTargetEdge(edge, this.#canonicalProjectRoot, this.#headingSlugMemo)
      );
      if ((index + 1) % 256 === 0 && !(await this.#checkpoint())) {
        return unavailable("target-unavailable");
      }
    }
    if (!(await this.#checkpoint())) {
      return unavailable("target-unavailable");
    }
    return resolutions;
  }

  async #observe(
    node: TargetNode,
    batch: readonly TargetEdge[]
  ): Promise<TargetUnavailable | undefined> {
    const authorized = await authorizeTargetNode(node, this.#io);
    if ("reason" in authorized) {
      return authorized;
    }
    const chargedEdges =
      node.isOutsideRoot === true
        ? batch.filter(({ request }) => request.rootExternalTargetMode === "validate")
        : batch;
    if (!this.#chargeBatch(chargedEdges.length)) {
      return unavailable("target-read-limit-exceeded");
    }
    let existing = authorized;
    if (existing.kind === "outside") {
      if (chargedEdges.length === 0) {
        node.observation = existing;
        return undefined;
      }
      // Containment stopped before the external referent. Only the charged validate edges authorize it.
      const endpoint = await this.#io.probeEndpoint(node.path);
      if (endpoint.kind === "unavailable") {
        return unavailable("target-unavailable");
      }
      existing = { kind: "endpoint", endpoint };
    }
    const observed = await observeTargetDemand({
      io: this.#io,
      targetPath: node.endpointPath ?? node.path,
      edges: chargedEdges,
      existing,
      cache: this.#parseFactsCache,
      signal: this.#signal
    });
    if ("reason" in observed) {
      return observed;
    }
    node.observation = observed;
    return undefined;
  }

  #chargeBatch(edgeCount: number): boolean {
    const nextCount = this.#targetReadCount + edgeCount;
    if (!Number.isSafeInteger(nextCount)) {
      return false;
    }
    if (this.#maxTargetReads !== false && nextCount > this.#maxTargetReads) {
      return false;
    }
    this.#targetReadCount = nextCount;
    return true;
  }

  async #checkpoint(): Promise<boolean> {
    if (this.#signal.aborted) {
      return false;
    }
    await setImmediate();
    return !this.#signal.aborted;
  }
}
