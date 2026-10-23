import { Worker } from "node:worker_threads";

import type { EndpointProbe, RootProbe } from "./local-resolution.ts";
import { isWithinRoot } from "./local-resolution.ts";
import type { RegularFileRead } from "./filesystem-probes.ts";
import {
  isLinkIoRequest,
  isLinkIoResponse,
  type LinkIoJob,
  type LinkIoRequest,
  type LinkIoResponse,
  type SourceFileRead
} from "./io-protocol.ts";

export interface LinkIoWorkerPort {
  postMessage(request: LinkIoRequest): void;
  subscribe(
    listeners: Readonly<{
      message: (message: unknown) => void;
      error: () => void;
      exit: (code: number) => void;
    }>
  ): () => void;
  /** Only usable after a failed send when no native job was accepted. */
  stopIdle(): void;
}
type CreateIoWorker = (root: string, cancellation: SharedArrayBuffer) => LinkIoWorkerPort;

/** File-backed Workers retain loaders/preloads, but cannot inherit the parent's string-input grammar. */
export function markdownLinkWorkerExecArgv(execArgv: readonly string[]): string[] | undefined {
  const workerArguments: string[] = [];
  for (let index = 0; index < execArgv.length; index++) {
    const argument = execArgv[index];
    if (argument === undefined) continue;
    if (argument === "--input-type" || argument === "--input_type") {
      index++;
      continue;
    }
    if (argument.startsWith("--input-type=") || argument.startsWith("--input_type=")) continue;
    workerArguments.push(argument);
  }
  // An explicit execArgv array is validated more strictly than Node's default inheritance (e.g. V8 flags).
  return workerArguments.length === execArgv.length ? undefined : workerArguments;
}

function createNodeIoWorker(root: string, cancellation: SharedArrayBuffer): LinkIoWorkerPort {
  const execArgv = markdownLinkWorkerExecArgv(process.execArgv);
  const worker = new Worker(new URL("./io-worker.ts", import.meta.url), {
    ...(execArgv === undefined ? {} : { execArgv }),
    workerData: { root, cancellation }
  });
  return {
    postMessage: (request) => {
      worker.postMessage(request);
    },
    subscribe: (listeners) => {
      worker.on("message", listeners.message);
      worker.on("error", listeners.error);
      worker.on("exit", listeners.exit);
      return () => {
        worker.off("message", listeners.message);
        worker.off("error", listeners.error);
        worker.off("exit", listeners.exit);
      };
    },
    stopIdle: () => {
      void worker.terminate().catch(() => undefined);
    }
  };
}

interface IoWorkerLifetime {
  readonly port: LinkIoWorkerPort;
  readonly exited: Promise<void>;
  readonly recordExit: () => void;
  readonly unsubscribe: () => void;
  hasExited: boolean;
}
interface PendingIoJob {
  readonly request: Extract<LinkIoRequest, { kind: "job" }>;
  readonly response: Promise<LinkIoResponse | undefined>;
  readonly settle: (response: LinkIoResponse | undefined) => void;
}

/** One resolver owns one lazy Worker, one pending job, and one awaited terminal drain. */
export class LinkIoSession {
  readonly #root: string;
  readonly #signal: AbortSignal;
  readonly #createWorker: CreateIoWorker;
  readonly #cancellation = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
  readonly #cancel = (): void => {
    Atomics.store(this.#cancellation, 0, 1);
  };
  #lifecycle: "accepting" | "draining" | "closed" = "accepting";
  #worker: IoWorkerLifetime | undefined;
  #pending: PendingIoJob | undefined;
  #lastId = 0;
  #closeRequest: Extract<LinkIoRequest, { kind: "close" }> | undefined;
  #closeAcknowledged = false;
  #failed = false;
  #jobAccepted = false;
  #finalization: Promise<void> | undefined;

  constructor(
    root: string,
    signal: AbortSignal,
    createWorker: CreateIoWorker = createNodeIoWorker
  ) {
    this.#root = root;
    this.#signal = signal;
    this.#createWorker = createWorker;
    signal.addEventListener("abort", this.#cancel, { once: true });
    if (signal.aborted) this.#cancel();
  }
  get failed(): boolean {
    return this.#failed;
  }

  async probeRootContainedPath(candidate: string): Promise<RootProbe> {
    const response = await this.#run({ kind: "containment", path: candidate });
    return response?.kind === "containment" ? response.probe : { kind: "unavailable" };
  }
  async probeEndpoint(target: string): Promise<EndpointProbe> {
    const response = await this.#run({ kind: "endpoint", path: target });
    return response?.kind === "endpoint" ? response.probe : { kind: "unavailable" };
  }
  async readRegularFile(target: string, maxBytes: number): Promise<RegularFileRead> {
    const response = await this.#run({ kind: "read", path: target, maxBytes });
    return response?.kind === "read" ? response.read : { ok: false, reason: "unavailable" };
  }
  async readSourceFile(target: string, maxBytes: number): Promise<SourceFileRead> {
    const response = await this.#run({ kind: "source-read", path: target, maxBytes });
    return response?.kind === "source-read" ? response.source : { probe: { kind: "unavailable" } };
  }

  finalize(): Promise<void> {
    this.#finalization ??= this.#drain();
    return this.#finalization;
  }
  async #drain(): Promise<void> {
    this.#lifecycle = "draining";
    try {
      await this.#pending?.response;
      this.#requestClose();
      await this.#worker?.exited;
    } finally {
      this.#signal.removeEventListener("abort", this.#cancel);
      this.#worker?.unsubscribe();
      this.#lifecycle = "closed";
    }
  }

  async #run(job: LinkIoJob): Promise<LinkIoResponse | undefined> {
    if (this.#lifecycle !== "accepting" || this.#failed || this.#signal.aborted) return undefined;
    if (this.#pending !== undefined) {
      this.#fail();
      return undefined;
    }
    const request = { kind: "job" as const, id: this.#lastId + 1, job };
    if (!isLinkIoRequest(request)) {
      this.#fail();
      return undefined;
    }
    const worker = this.#ensureWorker();
    if (worker === undefined) return undefined;
    this.#lastId = request.id;
    let settle!: PendingIoJob["settle"];
    const response = new Promise<LinkIoResponse | undefined>((resolve) => {
      settle = resolve;
    });
    this.#pending = { request, response, settle };
    try {
      this.#jobAccepted = true;
      worker.port.postMessage(request);
    } catch {
      this.#jobAccepted = false;
      this.#fail();
    }
    return response;
  }

  #ensureWorker(): IoWorkerLifetime | undefined {
    if (this.#worker !== undefined) return this.#worker;
    try {
      const port = this.#createWorker(this.#root, this.#cancellation.buffer);
      let recordExit!: () => void;
      const exited = new Promise<void>((resolve) => {
        recordExit = resolve;
      });
      const unsubscribe = port.subscribe({
        message: (message) => {
          this.#receive(message);
        },
        error: () => {
          this.#fail();
        },
        exit: (code) => {
          this.#exited(code);
        }
      });
      this.#worker = { port, exited, recordExit, unsubscribe, hasExited: false };
      return this.#worker;
    } catch {
      this.#failed = true;
      return undefined;
    }
  }

  #receive(message: unknown): void {
    const pending = this.#pending;
    if (pending !== undefined && isLinkIoResponse(message, pending.request)) {
      this.#settleJobReply(pending, message);
      return;
    }
    if (
      this.#closeRequest !== undefined &&
      !this.#closeAcknowledged &&
      isLinkIoResponse(message, this.#closeRequest)
    ) {
      this.#closeAcknowledged = true;
      return;
    }
    this.#fail();
  }

  #settleJobReply(pending: PendingIoJob, message: LinkIoResponse): void {
    let probe: RootProbe | undefined;
    if (message.kind === "containment") probe = message.probe;
    else if (message.kind === "source-read") probe = message.source.probe;
    if (
      probe !== undefined &&
      (probe.kind === "contained" || probe.kind === "missing") &&
      !isWithinRoot(this.#root, probe.absolutePath)
    ) {
      this.#fail();
      return;
    }
    this.#jobAccepted = false;
    this.#pending = undefined;
    pending.settle(message);
    if (message.kind === "failed") this.#fail();
  }

  #fail(): void {
    this.#failed = true;
    this.#cancel();
    this.#pending?.settle(undefined);
    this.#pending = undefined;
    // A close message queues behind any running native job; its finally closes the descriptor.
    this.#requestClose();
  }
  #requestClose(): void {
    const worker = this.#worker;
    if (worker === undefined || worker.hasExited || this.#closeRequest !== undefined) return;
    this.#closeRequest = { kind: "close", id: ++this.#lastId };
    try {
      worker.port.postMessage(this.#closeRequest);
    } catch {
      this.#failed = true;
      // Never terminate an active read to implement cancellation or protocol failure.
      if (!this.#jobAccepted) worker.port.stopIdle();
    }
  }
  #exited(code: number): void {
    const worker = this.#worker;
    if (worker === undefined || worker.hasExited) return;
    worker.hasExited = true;
    if (code !== 0 || !this.#closeAcknowledged) this.#failed = true;
    this.#pending?.settle(undefined);
    this.#pending = undefined;
    this.#jobAccepted = false;
    worker.recordExit();
  }
}
