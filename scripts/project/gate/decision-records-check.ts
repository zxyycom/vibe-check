import { validateDecisionRecords } from "../../decision-records/command.ts";
import type { Check } from "@zxyycom/vibe-check";
import {
  createNativeOperationCheck,
  nativeFailed,
  nativePassed,
  type NativeOperationResult
} from "./check-execution/native-operation.ts";

/** Adapts Decision Records validation into its Gate Check. */
export function createDecisionRecordsCheck(): Check {
  return createNativeOperationCheck({
    checkId: "decision-records",
    displayName: "Decision records",
    operation: async (): Promise<NativeOperationResult> => {
      const result = await validateDecisionRecords();
      return result.errors.length === 0
        ? nativePassed()
        : nativeFailed({
            code: "decision-records-invalid",
            diagnosticCount: result.errors.length,
            focusedCommand: "bun run decisions -- check",
            summary: `Decision Records reported ${result.errors.length} validation error(s)`
          });
    }
  });
}
