export type ScopedMeasurement<T> = {
  readonly payload: T;
  readonly sourcePaths: readonly string[];
};

export type ScopedMeasurementAcceptance<T> =
  | { readonly ok: true; readonly payloads: readonly T[] }
  | { readonly error: string; readonly ok: false };

export function acceptScopedMeasurements<T>(
  measurements: readonly ScopedMeasurement<T>[],
  approvedExactPaths: readonly string[]
): ScopedMeasurementAcceptance<T> {
  const approvedPathSet = new Set(approvedExactPaths);

  for (const [index, measurement] of measurements.entries()) {
    if (measurement.sourcePaths.length === 0) {
      return {
        error: `scanner measurement #${index + 1} did not declare a source path`,
        ok: false
      };
    }

    for (const sourcePath of measurement.sourcePaths) {
      if (!approvedPathSet.has(sourcePath)) {
        return {
          error: `scanner measurement #${index + 1} references unapproved input path ${JSON.stringify(sourcePath)}`,
          ok: false
        };
      }
    }
  }

  return {
    ok: true,
    payloads: measurements.map((measurement) => measurement.payload)
  };
}
