import { hasRequiredAndOptionalRecordKeys } from "../data-boundary/closed-values.ts";

export type ClosedCheckReason = Readonly<Record<string, unknown>> &
  Readonly<{ readonly code: string }>;

/** Recognizes the shared closed reason shape before owner-specific ID validation. */
export function isClosedCheckReason(
  value: Readonly<Record<string, unknown>> | undefined,
  allowCheckIds: boolean
): value is ClosedCheckReason {
  return (
    value !== undefined &&
    typeof value.code === "string" &&
    value.code.length > 0 &&
    hasRequiredAndOptionalRecordKeys(value, {
      optional: allowCheckIds ? ["checkIds"] : [],
      required: ["code"]
    })
  );
}
