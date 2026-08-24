import type { DuplicateCodeFragment } from "../../../configuration/metric-contract.ts";
import type { ScopedMeasurement } from "../../scoped-measurement.ts";

export function toScopedJscpdMeasurement(
  fragment: DuplicateCodeFragment
): ScopedMeasurement<DuplicateCodeFragment> {
  return {
    payload: fragment,
    sourcePaths: fragment.locations.map((location) => location.path)
  };
}

export function toScopedJscpdMeasurements(
  fragments: readonly DuplicateCodeFragment[]
): ScopedMeasurement<DuplicateCodeFragment>[] {
  return fragments.map(toScopedJscpdMeasurement);
}
