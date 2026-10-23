import { parentPort, workerData } from "node:worker_threads";

import {
  isLinkIoRequest,
  isNativePath,
  isRecord,
  type LinkIoRequest,
  type LinkIoResponse
} from "./io-protocol.ts";
import {
  checkIoCancellation,
  IoCancelled,
  probeContainedNative,
  probeEndpointNative,
  readRegularFileNative
} from "./io-native.ts";

const connection = parentPort;
const initialization: unknown = workerData;
if (
  connection === null ||
  !isRecord(initialization) ||
  !isNativePath(initialization.root) ||
  !(initialization.cancellation instanceof SharedArrayBuffer) ||
  initialization.cancellation.byteLength !== Int32Array.BYTES_PER_ELEMENT
) {
  throw new Error("Invalid Markdown Link I/O Worker initialization");
}
const port = connection;
const root = initialization.root;
const cancellation = new Int32Array(initialization.cancellation);
let previousId = 0;
function receiveRequest(message: unknown): void {
  if (!isLinkIoRequest(message) || message.id !== previousId + 1) {
    throw new Error("Invalid Markdown Link I/O request");
  }
  previousId = message.id;
  if (message.kind === "close") {
    port.postMessage({ kind: "closed", id: message.id } satisfies LinkIoResponse);
    port.off("message", receiveRequest);
    port.close();
    return;
  }
  let response: LinkIoResponse;
  try {
    checkIoCancellation(cancellation);
    response = executeNativeJob(message);
    checkIoCancellation(cancellation);
  } catch (error: unknown) {
    response = { kind: error instanceof IoCancelled ? "cancelled" : "failed", id: message.id };
  }
  port.postMessage(response);
}

/** Dispatch one validated job; receiveRequest owns cancellation and terminal response mapping. */
function executeNativeJob(request: Extract<LinkIoRequest, { kind: "job" }>): LinkIoResponse {
  const { job, id } = request;
  switch (job.kind) {
    case "source-read": {
      const probe = probeContainedNative(root, job.path, cancellation);
      return {
        kind: "source-read",
        id,
        source:
          probe.kind === "contained"
            ? { probe, read: readRegularFileNative(probe.absolutePath, job.maxBytes, cancellation) }
            : { probe }
      };
    }
    case "containment":
      return { kind: "containment", id, probe: probeContainedNative(root, job.path, cancellation) };
    case "endpoint":
      return { kind: "endpoint", id, probe: probeEndpointNative(job.path, cancellation) };
    case "read":
      return {
        kind: "read",
        id,
        read: readRegularFileNative(job.path, job.maxBytes, cancellation)
      };
  }
}

port.on("message", receiveRequest);
