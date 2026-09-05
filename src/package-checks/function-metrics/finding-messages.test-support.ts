import type { CheckMessage } from "../../check/check.ts";
import { findingDetail } from "../finding-detail.test-support.ts";

export const NON_BLOCKING_DETAILS = Object.freeze([
  findingDetail(
    "warning",
    "src/a.ts:1 a: cyclomatic-complexity 12 exceeds the 5 limit (areas: source)."
  ),
  findingDetail(
    "warning",
    "src/a.ts:1 a: function-code-density 20 exceeds the 10 limit (areas: source)."
  ),
  findingDetail("warning", "src/a.ts:1 a: parameter-count 7 exceeds the 4 limit (areas: source)."),
  findingDetail(
    "warning",
    "src/b.ts:1 b: cyclomatic-complexity 12 exceeds the 5 limit (areas: source)."
  ),
  findingDetail(
    "warning",
    "src/b.ts:1 b: function-code-density 20 exceeds the 10 limit (areas: source)."
  ),
  findingDetail("warning", "src/b.ts:1 b: parameter-count 7 exceeds the 4 limit (areas: source).")
]);

export const MIXED_DETAILS = Object.freeze([
  findingDetail(
    "error",
    "src/a.ts:1 a: cyclomatic-complexity 12 exceeds the 5 limit (areas: overlap, source)."
  ),
  findingDetail(
    "error",
    "src/a.ts:1 a: function-code-density 20 exceeds the 10 limit (areas: overlap, source)."
  ),
  findingDetail(
    "error",
    "src/a.ts:1 a: parameter-count 7 exceeds the 4 limit (areas: overlap, source)."
  ),
  ...NON_BLOCKING_DETAILS.slice(3)
]);

export const REJECTED_DETAILS = Object.freeze([
  findingDetail(
    "warning",
    "docs/data.json: selected input is not supported by function metrics (areas: broad)."
  ),
  findingDetail(
    "warning",
    "docs/guide.md: selected input is not supported by function metrics (areas: broad, overlap)."
  )
]);

export const TWO_OMITTED_DETAILS: CheckMessage = Object.freeze({
  code: "findings-omitted",
  level: "warning",
  message:
    "2 additional function metric finding(s) were not shown; inspect this Check's Records for the complete set."
});
