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

export async function probeRootContainedPath(
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
      if (pendingSegments.length === 0) {
        return Object.freeze({
          kind: "contained" as const,
          absolutePath: currentPath,
          endpoint: endpointFromStatus(status)
        });
      }
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
