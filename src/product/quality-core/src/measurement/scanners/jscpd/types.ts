import type { DuplicateCodeFragment } from "../../../model/schema.ts";
import type { ScopedMeasurement } from "../../scoped-measurement.ts";

export type JscpdScanFailureReason =
  | "jscpd-execution-error"
  | "jscpd-report-failure"
  | "jscpd-parse-failure";

export type JscpdScanResult =
  | {
      readonly measurements: readonly ScopedMeasurement<DuplicateCodeFragment>[];
      readonly ok: true;
    }
  | {
      readonly error: string;
      readonly ok: false;
      readonly reason: JscpdScanFailureReason;
    };
