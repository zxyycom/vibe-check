/** Investigation-only file-handle adapters. Plain async control retains native FileHandle methods.
 * Safety hooks and operation clocks are excluded from plain timing; no Product files are written.
 */
import { openSync, fstatSync, readSync, closeSync } from "node:fs";
import { open as nativeOpen } from "node:fs/promises";
import { ioBefore, ioAfter, ioCloseBefore, ioCount } from "mdlink-probe-experiment";

declare const __BATCH_MODE__: string;
const observed = __BATCH_MODE__ !== "plain";
const timed = __BATCH_MODE__ === "profile";
const record = (op: string, start: number) => {
  if (timed) ioCount("reader." + op + ".ms", performance.now() - start);
};

export function readerAfterOpen(p: string, flags: number) {
  // The outer algorithm has assigned its handle before this fallible/cancellable hook.
  if (observed) ioAfter("open", p, { flags });
}

async function observedOpen(p: string, flags: number) {
  await ioBefore("open", p, { flags }, true);
  const start = timed ? performance.now() : 0;
  const handle = await nativeOpen(p, flags);
  record("open", start); ioCount("readerLiveHandles", 1);
  return {
    async stat() {
      await ioBefore("fstat", p, {}, true);
      const start = timed ? performance.now() : 0;
      const status = await handle.stat(); record("fstat", start);
      ioAfter("fstat", p, { size: status.size, file: status.isFile() }); return status;
    },
    async read(bytes: Uint8Array, offset: number, length: number, position: number) {
      const injection = await ioBefore("read", p, { requested: length }, true);
      const submitted = injection?.readLimit > 0 ? Math.min(length, injection.readLimit) : length;
      const start = timed ? performance.now() : 0;
      const result = await handle.read(bytes, offset, submitted, position); record("read", start);
      ioCount("fileHandleReadCalls"); ioCount("fileHandleReturnedBytes", result.bytesRead);
      ioAfter("read", p, { requested: submitted, returned: result.bytesRead }); return result;
    },
    async close() {
      let injected: unknown;
      try { ioCloseBefore(p); } catch (error) { injected = error; }
      const start = timed ? performance.now() : 0;
      try { await handle.close(); }
      finally { record("close", start); ioCount("readerLiveHandles", -1); }
      ioAfter("close", p, { closed: true }); if (injected) throw injected;
    }
  };
}

export const readerOpenAsync = observed ? observedOpen : nativeOpen;

export function readerOpenSync(p: string, flags: number) {
  ioBefore("open", p, { flags });
  const start = timed ? performance.now() : 0;
  const fd = openSync(p, flags); record("open", start); ioCount("readerLiveHandles", 1);
  return {
    stat() {
      ioBefore("fstat", p);
      const start = timed ? performance.now() : 0;
      const status = fstatSync(fd); record("fstat", start);
      ioAfter("fstat", p, { size: status.size, file: status.isFile() }); return status;
    },
    read(bytes: Uint8Array, offset: number, length: number, position: number) {
      const injection = ioBefore("read", p, { requested: length });
      const submitted = injection?.readLimit > 0 ? Math.min(length, injection.readLimit) : length;
      const start = timed ? performance.now() : 0;
      const bytesRead = readSync(fd, bytes, offset, submitted, position); record("read", start);
      ioCount("fileHandleReadCalls"); ioCount("fileHandleReturnedBytes", bytesRead);
      ioAfter("read", p, { requested: submitted, returned: bytesRead }); return { bytesRead };
    },
    close() {
      let injected: unknown;
      try { ioCloseBefore(p); } catch (error) { injected = error; }
      const start = timed ? performance.now() : 0;
      try { closeSync(fd); }
      finally { record("close", start); ioCount("readerLiveHandles", -1); }
      ioAfter("close", p, { closed: true }); if (injected) throw injected;
    }
  };
}
