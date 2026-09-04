/** Development-only Worker timing seam; it is not a Product Worker protocol. */
import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";
import { parseMeasurementPerformanceSources } from "./measurement-performance-source-dto.test-support.ts";

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
  return isRecord(value) ? parseMeasurementPerformanceSources(value.files) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
