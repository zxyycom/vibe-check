interface AnalyzeMessage {
  readonly kind: "analyze";
  readonly chunkChars: number;
  readonly source: string;
}

let aborted = false;
self.onmessage = async (event: MessageEvent<AnalyzeMessage | { readonly kind: "abort" }>) => {
  if (event.data.kind === "abort") {
    aborted = true;
    return;
  }
  const { chunkChars, source } = event.data;
  const startedAt = performance.now();
  let checksum = 0;
  for (let offset = 0; offset < source.length; offset += chunkChars) {
    if (aborted) {
      self.postMessage({ kind: "cancelled", elapsedMs: performance.now() - startedAt, memory: process.memoryUsage() });
      return;
    }
    const end = Math.min(source.length, offset + chunkChars);
    for (let index = offset; index < end; index += 1) checksum = (checksum + source.charCodeAt(index)) >>> 0;
    await Bun.sleep(0);
  }
  self.postMessage({ kind: "complete", checksum, elapsedMs: performance.now() - startedAt, memory: process.memoryUsage() });
};
