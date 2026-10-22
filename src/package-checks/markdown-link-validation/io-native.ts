import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readlinkSync,
  readSync
} from "node:fs";
import path from "node:path";

import { isNotFound, type EndpointProbe, type RootProbe } from "./local-resolution.ts";
import type { RegularFileRead } from "./filesystem-probes.ts";
import {
  advanceContainedComponent,
  advanceContainedSymlink,
  BoundedReadBuffer,
  canFollowContainedSymlink,
  endpointFromStatus,
  startContainment
} from "./filesystem-policy.ts";

/** A shared atomic flag is observable even while the Worker event loop is in synchronous I/O. */
export function checkIoCancellation(cancellation: Int32Array): void {
  if (Atomics.load(cancellation, 0) !== 0) throw new IoCancelled();
}
export class IoCancelled extends Error {}

export function probeContainedNative(root: string, candidate: string, flag: Int32Array): RootProbe {
  let state = startContainment(root, candidate);
  while (!("kind" in state)) {
    checkIoCancellation(flag);
    const segment = state.pathSegments[state.segmentIndex];
    if (segment === undefined) return { kind: "contained", absolutePath: state.currentPath };
    const nextPath = path.join(state.currentPath, segment);
    let status;
    try {
      status = lstatSync(nextPath);
    } catch (error: unknown) {
      checkIoCancellation(flag);
      return isNotFound(error)
        ? { kind: "missing", absolutePath: nextPath }
        : { kind: "unavailable" };
    }
    checkIoCancellation(flag);
    if (!status.isSymbolicLink()) {
      state = advanceContainedComponent(state, nextPath, status);
      continue;
    }
    if (!canFollowContainedSymlink(state)) return { kind: "unavailable" };
    checkIoCancellation(flag);
    const destination = readlinkSync(nextPath);
    checkIoCancellation(flag);
    state = advanceContainedSymlink(root, state, nextPath, destination);
  }
  return state;
}

export function probeEndpointNative(target: string, flag: Int32Array): EndpointProbe {
  checkIoCancellation(flag);
  try {
    const status = lstatSync(target);
    checkIoCancellation(flag);
    return endpointFromStatus(status);
  } catch (error: unknown) {
    checkIoCancellation(flag);
    return isNotFound(error) ? { kind: "missing" } : { kind: "unavailable" };
  }
}

export function readRegularFileNative(
  filePath: string,
  maxBytes: number,
  flag: Int32Array
): RegularFileRead {
  let descriptor: number | undefined;
  try {
    checkIoCancellation(flag);
    descriptor = openSync(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    checkIoCancellation(flag);
    const status = fstatSync(descriptor);
    checkIoCancellation(flag);
    if (!status.isFile()) return { ok: false, reason: "unavailable" };
    if (status.size > maxBytes) return { ok: false, reason: "too-large" };
    const buffer = new BoundedReadBuffer(status.size, maxBytes);
    while (!buffer.isTooLarge) {
      checkIoCancellation(flag);
      buffer.prepareRead();
      checkIoCancellation(flag);
      const bytesRead = readSync(
        descriptor,
        buffer.bytes,
        buffer.offset,
        buffer.bytes.length - buffer.offset,
        buffer.offset
      );
      checkIoCancellation(flag);
      if (bytesRead === 0) return { ok: true, bytes: buffer.exactBytes() };
      buffer.offset += bytesRead;
    }
    return { ok: false, reason: "too-large" };
  } catch (error: unknown) {
    if (error instanceof IoCancelled) throw error;
    checkIoCancellation(flag);
    return { ok: false, reason: "unavailable" };
  } finally {
    // Cancellation cannot skip close. Like the async backend, close failure is best effort.
    if (descriptor !== undefined) {
      try {
        checkIoCancellation(flag);
      } finally {
        try {
          closeSync(descriptor);
        } catch {
          /* The read result retains precedence. */
        }
      }
      checkIoCancellation(flag);
    }
  }
}
