import { parentPort, workerData } from "node:worker_threads";

import { isLinkIoRequest, isNativePath, isRecord, type LinkIoResponse } from "./io-protocol.ts";
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
    const job = message.job;
    switch (job.kind) {
      case "containment":
        response = {
          kind: "containment",
          id: message.id,
          probe: probeContainedNative(root, job.path, cancellation)
        };
        break;
      case "endpoint":
        response = {
          kind: "endpoint",
          id: message.id,
          probe: probeEndpointNative(job.path, cancellation)
        };
        break;
      case "read":
        response = {
          kind: "read",
          id: message.id,
          read: readRegularFileNative(job.path, job.maxBytes, cancellation)
        };
        break;
    }
    checkIoCancellation(cancellation);
  } catch (error: unknown) {
    response = { kind: error instanceof IoCancelled ? "cancelled" : "failed", id: message.id };
  }
  port.postMessage(response);
}
port.on("message", receiveRequest);
