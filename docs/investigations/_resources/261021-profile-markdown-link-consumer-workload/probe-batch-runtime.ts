/** Investigation-only transport/backends. Not a Product module or supported executor.
 * One lazily created worker per resolver; one request at a time; cooperative close, never terminate().
 * Safety mode alone uses a synchronous observation barrier. Plain timing has no barrier or operation trace.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { lstatSync, readlinkSync } from "node:fs";
import { lstat as nativeLstat, readlink as nativeReadlink } from "node:fs/promises";
import { Worker, parentPort, workerData } from "node:worker_threads";

declare const __BATCH_VARIANT__: string;
declare const __BATCH_MODE__: string;
declare const __BATCH_WORKER_FILE__: string;
const scope = new AsyncLocalStorage<any>();
const liveSessions = new Set<any>();
let workerContext: any;
let workerCounts: Record<string, number> = {};
let gateSequence = 0;
const counted = __BATCH_MODE__ !== "plain";
function count(key: string, n = 1) {
  if (!counted) return;
  if (parentPort) workerCounts[key] = (workerCounts[key] ?? 0) + n;
  else (globalThis as any).__batchCount?.(key, n);
}
function context() { return workerContext ?? scope.getStore(); }
function abortError() { return Object.assign(new Error("probe cancelled"), { code: "ECANCELED" }); }
function cancelled(c: any) { return c?.signal?.aborted || (c?.control && Atomics.load(c.control, 0) !== 0); }
function observe(stage: string, op: string, p: string) {
  if (__BATCH_MODE__ !== "safety") return;
  if (parentPort) {
    if (!workerData.observe) return;
    const control = workerContext.control;
    const seq = ++gateSequence;
    Atomics.store(control, 2, 0);
    parentPort.postMessage({ kind: "observe", stage, op, path: p, seq });
    for (;;) { const observed = Atomics.load(control, 1); if (observed === seq) break; Atomics.wait(control, 1, observed); }
    const code = Atomics.load(control, 2);
    if (code) throw Object.assign(new Error("injected observation failure"), { code: code === 1 ? "EACCES" : "EIO" });
  } else {
    const result = (globalThis as any).__batchObserve?.({ stage, op, path: p });
    if (result?.then) throw new Error("Synchronous observation hook required");
  }
}
function before(op: string, p: string) {
  const c = context();
  // The baseline keeps its original cancellation granularity; candidates may stop earlier.
  if (__BATCH_VARIANT__ !== "baseline" && __BATCH_VARIANT__ !== "adaptive" && cancelled(c)) throw abortError();
  observe("before", op, p);
  if (__BATCH_VARIANT__ !== "baseline" && __BATCH_VARIANT__ !== "adaptive" && cancelled(c)) throw abortError();
  count(`${op}Calls`);
  if (c?.control) Atomics.add(c.control, 3, 1);
  if (c?.slowMs && !c.slowUsed) {
    c.slowUsed = true;
    if (parentPort) parentPort.postMessage({ kind: "slow-start" });
    else (globalThis as any).__batchSlowArmed?.();
    // Controlled blocking host-operation surrogate, NOT a real slow filesystem measurement.
    if (c.asyncBackend) return new Promise(resolve => setTimeout(resolve, c.slowMs));
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, c.slowMs);
  }
}
function after(op: string, p: string) {
  observe("after", op, p);
  if (__BATCH_VARIANT__ !== "baseline" && __BATCH_VARIANT__ !== "adaptive" && cancelled(context())) throw abortError();
}
function statsValue(s: any) { return { file: s.isFile(), directory: s.isDirectory(), symlink: s.isSymbolicLink() }; }
function statsObject(s: any) { return { isFile: () => s.file, isDirectory: () => s.directory, isSymbolicLink: () => s.symlink }; }

export function batchLstatSync(p: string) { before("lstat", p); const s = lstatSync(p); after("lstat", p); return s; }
export function batchReadlinkSync(p: string) { before("readlink", p); const s = readlinkSync(p); after("readlink", p); return s; }
export async function batchLstatAsync(p: string) {
  const c = context();
  if (c?.session?.variant === "worker-fine") return statsObject(await c.session.request({ kind: "lstat", path: p }));
  await before("lstat", p); const s = await nativeLstat(p); after("lstat", p); return s;
}
export async function batchReadlinkAsync(p: string) {
  const c = context();
  if (c?.session?.variant === "worker-fine") return c.session.request({ kind: "readlink", path: p });
  await before("readlink", p); const s = await nativeReadlink(p); after("readlink", p); return s;
}

export function createProbeSession(signal: AbortSignal): any {
  const variant = __BATCH_VARIANT__;
  const options = (globalThis as any).__batchOptions ?? {};
  const c: any = { signal, variant, slowMs: options.slowMs ?? 0, slowUsed: false,
    asyncBackend: variant === "baseline" || variant === "adaptive" || variant === "worker-async" };
  if (!variant.startsWith("worker-")) return c;
  let worker: Worker | undefined;
  let pending: any;
  let exited = false;
  let failed: any;
  let closePromise: Promise<void> | undefined;
  let listenerRegistered = false;
  let resolveExit: any;
  const exitPromise = new Promise<void>(resolve => { resolveExit = resolve; });
  const control = new Int32Array(new SharedArrayBuffer(16));
  c.control = control;
  const onAbort = () => {
    Atomics.store(control, 0, 1);
    count("abortWorkerOperations", Atomics.load(control, 3));
    count("workerAbortSignals");
  };
  c.request = async (request: any) => {
    if (signal.aborted || exited || failed || closePromise) throw failed ?? abortError();
    if (!worker) {
      const started = performance.now();
      worker = new Worker(__BATCH_WORKER_FILE__, { workerData: { control: control.buffer, slowMs: c.slowMs,
        observe: __BATCH_MODE__ === "safety" && typeof (globalThis as any).__batchObserve === "function", fault: options.fault ?? false } });
      count("workersStarted");
      liveSessions.add(c);
      worker.on("message", (message: any) => {
        if (message.kind === "observe") {
          try { (globalThis as any).__batchObserve?.({ stage: message.stage, op: message.op, path: message.path }); }
          catch (error: any) { Atomics.store(control, 2, error.code === "EACCES" ? 1 : 2); }
          finally { Atomics.store(control, 1, message.seq); Atomics.notify(control, 1); }
          return;
        }
        if (message.kind === "ready") { count("workerStartupMs", performance.now() - started); return; }
        if (message.kind === "slow-start") { (globalThis as any).__batchSlowArmed?.(); return; }
        if (message.kind === "result") {
          for (const [k, n] of Object.entries(message.counts)) count(k, n as number);
          const done = pending; pending = undefined;
          worker?.unref(); // Private resolver consumers may leave an idle session without finalizing.
          if (message.error) done?.reject(Object.assign(new Error(message.error.message), { code: message.error.code }));
          else done?.resolve(message.value);
        }
      });
      worker.on("error", (error: any) => { failed = error; pending?.reject(error); pending = undefined; });
      worker.on("exit", (code: number) => {
        exited = true; count("workersExited"); count("workerExitCodeSum", code);
        failed ??= new Error(`Worker exited: ${code}`);
        pending?.reject(failed); pending = undefined;
        if (listenerRegistered) { try { signal.removeEventListener("abort", onAbort); } catch {} }
        resolveExit();
      });
      // Install lifetime handlers before a fallible listener call. Bun rejects the regression
      // harness's Proxy receiver; retain original node-boundary signal polling in that case.
      try { signal.addEventListener("abort", onAbort, { once: true }); listenerRegistered = true; }
      catch { count("listenerRegistrationFallbacks"); }
      if (signal.aborted) onAbort();
    }
    if (pending) throw new Error("Only one outstanding worker request is allowed");
    worker.ref();
    count("workerRequests");
    const result = new Promise((resolve, reject) => { pending = { resolve, reject }; });
    worker.postMessage(request);
    return result;
  };
  c.close = () => closePromise ??= (async () => {
    if (!worker) return;
    if (!exited) { worker.ref(); worker.postMessage({ kind: "close" }); }
    await exitPromise;
    liveSessions.delete(c);
    count("finalWorkerOperations", Atomics.load(control, 3));
    if (listenerRegistered) { try { signal.removeEventListener("abort", onAbort); } catch {} }
  })();
  return c;
}
export async function closeProbeSession(c: any) { await c?.close?.(); }
export async function closeAllProbeSessions() { await Promise.all([...liveSessions].map(c => c.close())); }
export async function executeProbe(root: string, p: string, signal: AbortSignal | undefined, c: any,
  asynchronous: () => any, synchronous: () => any) {
  if (!c) return asynchronous(); // Existing two-argument consumers remain on their original backend.
  count("probeCalls");
  c.session = c;
  return scope.run(c, async () => {
    try {
      if (c.variant === "direct-sync") return synchronous();
      if (c.variant === "worker-sync" || c.variant === "worker-async") {
        return await c.request({ kind: "path", root, path: p });
      }
      return await asynchronous();
    } catch { return Object.freeze({ kind: "unavailable" }); }
  });
}

export function serveProbe(probe: (root: string, p: string) => any) {
  if (!parentPort) throw new Error("Worker endpoint expected");
  const control = new Int32Array(workerData.control);
  workerContext = { control, slowMs: workerData.slowMs, slowUsed: false,
    asyncBackend: __BATCH_VARIANT__ === "worker-async" };
  parentPort.on("message", async (request: any) => {
    if (request.kind === "close") {
      // Bun 1.3.14 does not exit this idle worker after port.close alone. Work is already drained;
      // Voluntarily exit directly; this is not a parent-side terminate() interrupting an operation.
      process.exit(0);
    }
    workerCounts = {};
    if (workerData.fault) process.exit(23);
    try {
      let value: any;
      if (request.kind === "path") value = await probe(request.root, request.path);
      else if (request.kind === "lstat") value = statsValue(batchLstatSync(request.path));
      else if (request.kind === "readlink") value = batchReadlinkSync(request.path);
      else throw new Error("Unknown worker request");
      parentPort!.postMessage({ kind: "result", value, counts: workerCounts });
    } catch (error: any) {
      parentPort!.postMessage({ kind: "result", error: { message: error.message, code: error.code }, counts: workerCounts });
    }
  });
  parentPort.postMessage({ kind: "ready" });
}
