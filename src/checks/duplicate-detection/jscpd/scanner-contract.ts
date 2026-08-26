import type { DuplicateCodeFragment } from "../measurement-model.ts";
import type { ExactInputMeasurement } from "../../../project-files/exact-input-measurement.ts";

export type JscpdScanFailureReason =
  | "jscpd-execution-error"
  | "jscpd-report-failure"
  | "jscpd-parse-failure";

export type JscpdScanResult =
  | {
      readonly measurements: readonly ExactInputMeasurement<DuplicateCodeFragment>[];
      readonly ok: true;
    }
  | {
      readonly error: string;
      readonly ok: false;
      readonly reason: JscpdScanFailureReason;
    };
