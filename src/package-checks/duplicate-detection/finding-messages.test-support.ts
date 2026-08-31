import { findingDetail } from "../finding-presentation/message.test-support.ts";

const OVERLAP =
  "Duplicate fragment contains 120 tokens across 12 lines at scripts/b.ts:40-51, src/a.ts:40-51.";

export const DUPLICATE_DETAILS = Object.freeze({
  direct: findingDetail(
    "warning",
    "Duplicate fragment contains 80 tokens across 12 lines at src/a.ts:10-21, src/b.ts:20-31."
  ),
  overlapError: findingDetail("error", OVERLAP),
  overlapWarning: findingDetail("warning", OVERLAP)
});
