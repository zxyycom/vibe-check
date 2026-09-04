import { validateDecisionRecordsForGate } from "../../../decision-records/command.ts";
import type { Check } from "@zxyycom/vibe-check";
import {
  createNativeOperationCheck,
  nativeFailed,
  nativePassed,
  type NativeOperationResult
} from "./process/native-operation.ts";

export interface DecisionRecordsCheckDependencies {
  readonly validateForGate: typeof validateDecisionRecordsForGate;
}

const defaultDependencies: DecisionRecordsCheckDependencies = Object.freeze({
  validateForGate: validateDecisionRecordsForGate
});

/** Adapts owner-approved Decision Records validation facts into its Gate Check. */
export function createDecisionRecordsCheck(
  dependencies: DecisionRecordsCheckDependencies = defaultDependencies
): Check {
  return createNativeOperationCheck({
    checkId: "decision-records",
    displayName: "Decision records",
    operation: async (): Promise<NativeOperationResult> => {
      const result = await dependencies.validateForGate();
      if (result.status === "passed") return nativePassed();
      if (result.status === "unavailable") {
        throw new Error("Decision Records has no safe diagnostic projection");
      }
      return nativeFailed({
        code: "decision-records-invalid",
        diagnostics: Object.freeze(
          result.diagnostics.map(({ data, id }) => Object.freeze({ data, id }))
        ),
        focusedCommand: "bun run decisions -- check"
      });
    }
  });
}
