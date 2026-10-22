import { constants } from "node:fs";
import { lstat, open, readlink } from "node:fs/promises";
import path from "node:path";

import { isNotFound, type EndpointProbe, type RootProbe } from "./local-resolution.ts";
import {
  advanceContainedComponent,
  advanceContainedSymlink,
  BoundedReadBuffer,
  canFollowContainedSymlink,
  endpointFromStatus,
  startContainment
} from "./filesystem-policy.ts";

export type RegularFileRead =
  | Readonly<{ readonly ok: true; readonly bytes: Uint8Array }>
  | Readonly<{ readonly ok: false; readonly reason: "too-large" | "unavailable" }>;

/** Asynchronous backend retained for Markdown lint; it never creates a Worker. */
export async function probeRootContainedPath(root: string, candidate: string): Promise<RootProbe> {
  let state = startContainment(root, candidate);
  try {
    while (!("kind" in state)) {
      const segment = state.pathSegments[state.segmentIndex];
      if (segment === undefined) return { kind: "contained", absolutePath: state.currentPath };
      const nextPath = path.join(state.currentPath, segment);
      let status;
      try {
        status = await lstat(nextPath);
      } catch (error: unknown) {
        return isNotFound(error)
          ? { kind: "missing", absolutePath: nextPath }
          : { kind: "unavailable" };
      }
      if (!status.isSymbolicLink()) {
        state = advanceContainedComponent(state, nextPath, status);
      } else {
        if (!canFollowContainedSymlink(state)) return { kind: "unavailable" };
        state = advanceContainedSymlink(root, state, nextPath, await readlink(nextPath));
      }
    }
    return state;
  } catch {
    return { kind: "unavailable" };
  }
}

export async function probeEndpoint(targetPath: string): Promise<EndpointProbe> {
  try {
    return endpointFromStatus(await lstat(targetPath));
  } catch (error: unknown) {
    return isNotFound(error) ? { kind: "missing" } : { kind: "unavailable" };
  }
}

export async function readRegularFile(
  filePath: string,
  maxBytes: number
): Promise<RegularFileRead> {
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const status = await handle.stat();
    if (!status.isFile()) return { ok: false, reason: "unavailable" };
    if (status.size > maxBytes) return { ok: false, reason: "too-large" };
    const buffer = new BoundedReadBuffer(status.size, maxBytes);
    while (!buffer.isTooLarge) {
      buffer.prepareRead();
      const { bytesRead } = await handle.read(
        buffer.bytes,
        buffer.offset,
        buffer.bytes.length - buffer.offset,
        buffer.offset
      );
      if (bytesRead === 0) return { ok: true, bytes: buffer.exactBytes() };
      buffer.offset += bytesRead;
    }
    return { ok: false, reason: "too-large" };
  } catch {
    return { ok: false, reason: "unavailable" };
  } finally {
    await handle?.close().catch(() => undefined);
  }
}
