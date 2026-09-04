export interface MeasurementPerformanceSource {
  readonly path: string;
  readonly source: string;
}

export function parseMeasurementPerformanceSources(
  value: unknown
): readonly MeasurementPerformanceSource[] | undefined {
  if (!Array.isArray(value) || !value.every(isMeasurementPerformanceSource)) return undefined;
  return Object.freeze(
    value.map((file) => Object.freeze({ path: file.path, source: file.source }))
  );
}

function isMeasurementPerformanceSource(value: unknown): value is MeasurementPerformanceSource {
  return isRecord(value) && typeof value.path === "string" && typeof value.source === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
