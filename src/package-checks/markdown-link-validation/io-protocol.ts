import path from "node:path";

import type { EndpointProbe, RootProbe } from "./local-resolution.ts";
import type { RegularFileRead } from "./filesystem-probes.ts";

export type LinkIoJob =
  | Readonly<{ kind: "containment"; path: string }>
  | Readonly<{ kind: "endpoint"; path: string }>
  | Readonly<{ kind: "read"; path: string; maxBytes: number }>;
export type LinkIoRequest =
  | Readonly<{ kind: "job"; id: number; job: LinkIoJob }>
  | Readonly<{ kind: "close"; id: number }>;
export type LinkIoResponse =
  | Readonly<{ kind: "containment"; id: number; probe: RootProbe }>
  | Readonly<{ kind: "endpoint"; id: number; probe: EndpointProbe }>
  | Readonly<{ kind: "read"; id: number; read: RegularFileRead }>
  | Readonly<{ kind: "cancelled" | "failed" | "closed"; id: number }>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isNativePath(value: unknown): value is string {
  return typeof value === "string" && !value.includes("\0") && path.isAbsolute(value);
}
export function isLinkIoRequest(value: unknown): value is LinkIoRequest {
  if (!isRecord(value) || !Number.isSafeInteger(value.id) || Number(value.id) <= 0) return false;
  if (value.kind === "close") return true;
  return value.kind === "job" && isLinkIoJob(value.job);
}

function isLinkIoJob(value: unknown): value is LinkIoJob {
  if (!isRecord(value) || !isNativePath(value.path)) return false;
  switch (value.kind) {
    case "containment":
    case "endpoint":
      return true;
    case "read":
      return (
        Number.isSafeInteger(value.maxBytes) &&
        Number(value.maxBytes) > 0 &&
        Number(value.maxBytes) <= 16_777_216
      );
    default:
      return false;
  }
}

/** Validate both the discriminant and the bounded payload against the outstanding request. */
export function isLinkIoResponse(value: unknown, request: LinkIoRequest): value is LinkIoResponse {
  if (!isRecord(value) || value.id !== request.id) return false;
  if (request.kind === "close") return value.kind === "closed";
  return isJobResponse(value, request.job);
}

function isJobResponse(value: Record<string, unknown>, job: LinkIoJob): boolean {
  if (value.kind === "failed" || value.kind === "cancelled") return true;
  if (value.kind !== job.kind) return false;
  switch (job.kind) {
    case "containment":
      return isRootProbe(value.probe);
    case "endpoint":
      return isEndpointProbe(value.probe, true);
    case "read":
      return isBoundedReadResult(value.read, job.maxBytes);
  }
}

function isBoundedReadResult(value: unknown, maxBytes: number): value is RegularFileRead {
  if (!isRecord(value)) return false;
  if (value.ok === false) return value.reason === "unavailable" || value.reason === "too-large";
  return (
    value.ok === true && value.bytes instanceof Uint8Array && value.bytes.byteLength <= maxBytes
  );
}

function isRootProbe(value: unknown): value is RootProbe {
  if (!isRecord(value)) return false;
  switch (value.kind) {
    case "unavailable":
    case "outside":
      return true;
    case "missing":
      return isNativePath(value.absolutePath);
    case "contained":
      return (
        isNativePath(value.absolutePath) &&
        (value.endpoint === undefined || isEndpointProbe(value.endpoint, false))
      );
    default:
      return false;
  }
}
function isEndpointProbe(value: unknown, allowMissing: boolean): boolean {
  return (
    isRecord(value) &&
    (value.kind === "file" ||
      value.kind === "directory" ||
      value.kind === "unsupported" ||
      value.kind === "unavailable" ||
      (allowMissing && value.kind === "missing"))
  );
}
