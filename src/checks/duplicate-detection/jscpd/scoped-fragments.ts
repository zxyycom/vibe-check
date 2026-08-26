import type { DuplicateCodeFragment } from "../measurement-model.ts";
import type { ExactInputMeasurement } from "../../../project-files/exact-input-measurement.ts";

export function toScopedJscpdMeasurement(
  fragment: DuplicateCodeFragment
): ExactInputMeasurement<DuplicateCodeFragment> {
  return {
    payload: fragment,
    sourcePaths: fragment.locations.map((location) => location.path)
  };
}

export function toScopedJscpdMeasurements(
  fragments: readonly DuplicateCodeFragment[]
): ExactInputMeasurement<DuplicateCodeFragment>[] {
  return fragments.map(toScopedJscpdMeasurement);
}
