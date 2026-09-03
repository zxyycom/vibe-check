/** Development-only Worker timing seam; it is not a Product Worker protocol. */
import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";

self.onmessage = (event: MessageEvent<unknown>): void => {
  const files = filesFrom(event.data);
  if (files === undefined) {
    postMessage(Object.freeze({ kind: "analysis-failed" }));
    self.close();
    return;
  }
  const started = performance.now();
  const result = analyzeFunctionMetricsSources({ files });
  postMessage(
    Object.freeze({
      ...result,
      adapterAndPortAnalysisMs: performance.now() - started
    })
  );
  self.close();
};

function filesFrom(
  value: unknown
): readonly { readonly path: string; readonly source: string }[] | undefined {
  if (!isRecord(value) || !Array.isArray(value.files)) return undefined;
  const files = value.files;
  if (!files.every(isSource)) return undefined;
  return Object.freeze(
    files.map((file) => Object.freeze({ path: file.path, source: file.source }))
  );
}

function isSource(value: unknown): value is { readonly path: string; readonly source: string } {
  return isRecord(value) && typeof value.path === "string" && typeof value.source === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
