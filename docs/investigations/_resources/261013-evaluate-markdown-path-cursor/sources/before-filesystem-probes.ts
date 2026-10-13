import { constants } from "node:fs";
import { lstat, open, readlink } from "node:fs/promises";
import path from "node:path";

import {
  isNotFound,
  isWithinRoot,
  relativeSegments,
  type ExistingEndpointProbe,
  type EndpointProbe,
  type RootProbe
} from "./local-resolution.ts";

interface RootContainedPathProbeState {
  readonly currentPath: string;
  readonly pendingSegments: readonly string[];
  readonly symlinkHops: number;
}

type RootContainedPathProbeAdvance = RootProbe | RootContainedPathProbeState;
type RootContainedPathStatus =
  | RootProbe
  | Readonly<{ readonly kind: "status"; readonly status: Awaited<ReturnType<typeof lstat>> }>;

export async function probeRootContainedPath(
  canonicalProjectRoot: string,
  candidatePath: string
): Promise<RootProbe> {
  if (!isWithinRoot(canonicalProjectRoot, candidatePath)) {
    return Object.freeze({ kind: "outside" as const });
  }
  let state: RootContainedPathProbeState = {
    currentPath: canonicalProjectRoot,
    pendingSegments: relativeSegments(canonicalProjectRoot, candidatePath),
    symlinkHops: 0
  };

  while (state.pendingSegments.length > 0) {
    const advance = await advanceRootContainedPathProbe(canonicalProjectRoot, state);
    if (!isRootContainedPathProbeState(advance)) return advance;
    state = advance;
  }

  return Object.freeze({ kind: "contained" as const, absolutePath: state.currentPath });
}

function isRootContainedPathProbeState(
  value: RootContainedPathProbeAdvance
): value is RootContainedPathProbeState {
  return "currentPath" in value;
}

async function advanceRootContainedPathProbe(
  canonicalProjectRoot: string,
  state: RootContainedPathProbeState
): Promise<RootContainedPathProbeAdvance> {
  const [segment, ...remainingSegments] = state.pendingSegments;
  if (segment === undefined) return Object.freeze({ kind: "unavailable" as const });
  const nextPath = path.join(state.currentPath, segment);
  const pathStatus = await rootContainedPathStatus(nextPath);
  if (pathStatus.kind !== "status") return pathStatus;
  if (!pathStatus.status.isSymbolicLink()) {
    return remainingSegments.length === 0
      ? Object.freeze({
          kind: "contained" as const,
          absolutePath: nextPath,
          endpoint: endpointFromStatus(pathStatus.status)
        })
      : Object.freeze({
          currentPath: nextPath,
          pendingSegments: remainingSegments,
          symlinkHops: state.symlinkHops
        });
  }
  return advanceThroughContainedSymlink(
    canonicalProjectRoot,
    nextPath,
    remainingSegments,
    state.symlinkHops
  );
}

async function rootContainedPathStatus(nextPath: string): Promise<RootContainedPathStatus> {
  try {
    return Object.freeze({ kind: "status" as const, status: await lstat(nextPath) });
  } catch (error: unknown) {
    return isNotFound(error)
      ? Object.freeze({ kind: "missing" as const, absolutePath: nextPath })
      : Object.freeze({ kind: "unavailable" as const });
  }
}

async function advanceThroughContainedSymlink(
  canonicalProjectRoot: string,
  linkPath: string,
  remainingSegments: readonly string[],
  symlinkHops: number
): Promise<RootContainedPathProbeAdvance> {
  if (symlinkHops >= 40) return Object.freeze({ kind: "unavailable" as const });
  let linkDestination: string;
  try {
    linkDestination = path.resolve(path.dirname(linkPath), await readlink(linkPath));
  } catch {
    return Object.freeze({ kind: "unavailable" as const });
  }
  if (!isWithinRoot(canonicalProjectRoot, linkDestination)) {
    return Object.freeze({ kind: "outside" as const });
  }
  return Object.freeze({
    currentPath: canonicalProjectRoot,
    pendingSegments: [
      ...relativeSegments(canonicalProjectRoot, linkDestination),
      ...remainingSegments
    ],
    symlinkHops: symlinkHops + 1
  });
}

export async function probeEndpoint(targetPath: string): Promise<EndpointProbe> {
  let status: Awaited<ReturnType<typeof lstat>>;
  try {
    status = await lstat(targetPath);
  } catch (error: unknown) {
    return isNotFound(error)
      ? Object.freeze({ kind: "missing" as const })
      : Object.freeze({ kind: "unavailable" as const });
  }
  return endpointFromStatus(status);
}

export async function readRegularFile(
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

function endpointFromStatus(status: Awaited<ReturnType<typeof lstat>>): ExistingEndpointProbe {
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
