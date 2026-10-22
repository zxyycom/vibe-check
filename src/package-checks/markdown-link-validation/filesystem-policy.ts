import type { Stats } from "node:fs";
import path from "node:path";

import {
  isWithinRoot,
  relativeSegments,
  type ExistingEndpointProbe,
  type RootProbe
} from "./local-resolution.ts";

/** Pure cursor transitions shared by the asynchronous and Worker-native containment drivers. */
export interface ContainmentCursor {
  readonly currentPath: string;
  readonly pathSegments: readonly string[];
  readonly segmentIndex: number;
  readonly symlinkHops: number;
}
export type ContainmentAdvance = RootProbe | ContainmentCursor;

export function startContainment(root: string, candidate: string): ContainmentAdvance {
  if (!isWithinRoot(root, candidate)) return { kind: "outside" };
  return {
    currentPath: root,
    pathSegments: relativeSegments(root, candidate),
    segmentIndex: 0,
    symlinkHops: 0
  };
}

export function advanceContainedComponent(
  cursor: ContainmentCursor,
  nextPath: string,
  status: Stats
): ContainmentAdvance {
  if (cursor.segmentIndex + 1 === cursor.pathSegments.length) {
    return { kind: "contained", absolutePath: nextPath, endpoint: endpointFromStatus(status) };
  }
  return { ...cursor, currentPath: nextPath, segmentIndex: cursor.segmentIndex + 1 };
}

export function advanceContainedSymlink(
  root: string,
  cursor: ContainmentCursor,
  linkPath: string,
  destination: string
): ContainmentAdvance {
  const linkDestination = path.resolve(path.dirname(linkPath), destination);
  if (!isWithinRoot(root, linkDestination)) return { kind: "outside" };
  return {
    currentPath: root,
    pathSegments: [
      ...relativeSegments(root, linkDestination),
      ...cursor.pathSegments.slice(cursor.segmentIndex + 1)
    ],
    segmentIndex: 0,
    symlinkHops: cursor.symlinkHops + 1
  };
}

export function canFollowContainedSymlink(cursor: ContainmentCursor): boolean {
  return cursor.symlinkHops < 40;
}

export function endpointFromStatus(status: Stats): ExistingEndpointProbe {
  if (status.isSymbolicLink()) return { kind: "unavailable" };
  if (status.isDirectory()) return { kind: "directory" };
  if (status.isFile()) return { kind: "file" };
  return { kind: "unsupported" };
}

/** Owns bounded capacity and exact-byte publication; fstat size is only an allocation hint. */
export class BoundedReadBuffer {
  bytes: Uint8Array;
  offset = 0;
  readonly #limit: number;

  constructor(sizeHint: number, maxBytes: number) {
    this.#limit = maxBytes + 1;
    this.bytes = new Uint8Array(Math.max(1, Math.min(this.#limit, sizeHint + 1)));
  }

  prepareRead(): void {
    if (this.offset < this.bytes.length || this.bytes.length === this.#limit) return;
    const grown = new Uint8Array(Math.min(this.#limit, this.bytes.length * 2));
    grown.set(this.bytes);
    this.bytes = grown;
  }

  get isTooLarge(): boolean {
    return this.offset === this.#limit;
  }

  exactBytes(): Uint8Array {
    return this.bytes.slice(0, this.offset);
  }
}
