import path from "node:path";

import type { MarkdownLinkParseResult } from "./markdown-parser.ts";
import { probeRootContainedPath, readRegularFile } from "./filesystem-probes.ts";
import {
  isRootRelativePath,
  sourceUnavailable,
  toSlashPath,
  type MarkdownSourceReadResult
} from "./local-resolution.ts";

export interface RootContainedMarkdownSourceReadRequest {
  readonly canonicalProjectRoot: string;
  readonly maxMarkdownBytes: number;
  readonly parseMarkdownBytes: (bytes: Uint8Array) => Promise<MarkdownLinkParseResult | undefined>;
  readonly rootRelativePath: string;
  readonly signal: AbortSignal;
}

type RootContainedSourceBytesRead =
  | Readonly<{ readonly kind: "bytes"; readonly bytes: Uint8Array }>
  | Readonly<{ readonly kind: "result"; readonly result: MarkdownSourceReadResult }>;

/** Reads one authorized Markdown source without granting target-resolution behavior. */
export async function readRootContainedMarkdownSource(
  request: RootContainedMarkdownSourceReadRequest
): Promise<MarkdownSourceReadResult> {
  const sourcePath = authorizedRootRelativeSourcePath(request);
  if (sourcePath === undefined) return sourceUnavailable();
  const sourceRead = await readRootContainedSourceBytes(request, sourcePath);
  if (sourceRead.kind === "result") return sourceRead.result;
  return parseRootContainedSourceBytes(request, sourcePath, sourceRead.bytes);
}

function authorizedRootRelativeSourcePath(
  request: RootContainedMarkdownSourceReadRequest
): string | undefined {
  if (request.signal.aborted) return undefined;
  return isRootRelativePath(request.canonicalProjectRoot, request.rootRelativePath)
    ? path.resolve(request.canonicalProjectRoot, request.rootRelativePath)
    : undefined;
}

async function readRootContainedSourceBytes(
  request: RootContainedMarkdownSourceReadRequest,
  sourcePath: string
): Promise<RootContainedSourceBytesRead> {
  const rootProbe = await probeRootContainedPath(request.canonicalProjectRoot, sourcePath);
  if (
    rootProbe.kind === "outside" ||
    rootProbe.kind === "unavailable" ||
    rootProbe.kind === "missing"
  ) {
    return Object.freeze({ kind: "result" as const, result: sourceUnavailable() });
  }
  const sourceBytes = await readRegularFile(rootProbe.absolutePath, request.maxMarkdownBytes);
  if (!sourceBytes.ok) {
    return Object.freeze({
      kind: "result" as const,
      result:
        sourceBytes.reason === "too-large"
          ? Object.freeze({ ok: false as const, reason: "source-too-large" as const })
          : sourceUnavailable()
    });
  }
  return Object.freeze({ kind: "bytes" as const, bytes: sourceBytes.bytes });
}

async function parseRootContainedSourceBytes(
  request: RootContainedMarkdownSourceReadRequest,
  sourcePath: string,
  sourceBytes: Uint8Array
): Promise<MarkdownSourceReadResult> {
  const parsed = await request.parseMarkdownBytes(sourceBytes);
  if (request.signal.aborted || parsed === undefined) return sourceUnavailable();
  if (!parsed.ok) {
    return Object.freeze({ ok: false as const, reason: "markdown-parse-failed" as const });
  }
  return Object.freeze({
    ok: true as const,
    source: Object.freeze({
      path: toSlashPath(path.relative(request.canonicalProjectRoot, sourcePath)),
      facts: parsed.facts
    })
  });
}
