import type { MaterialValidationResult } from "../../../validation/repository-material/workflow.ts";

import {
  createNativeOperationCheck,
  nativeFailed,
  nativePassed,
  type NativeOperationResult
} from "./process/native-operation.ts";
import type { Check } from "@zxyycom/vibe-check";

/** Adapts one direct repository-material provider into a Gate Check. */
export function createMaterialValidationCheck(
  input: Readonly<{
    readonly checkId: string;
    readonly displayName: string;
    readonly focusedCommand: string;
    readonly validate: () => Promise<MaterialValidationResult>;
  }>
): Check {
  return createNativeOperationCheck({
    checkId: input.checkId,
    displayName: input.displayName,
    operation: async (): Promise<NativeOperationResult> => {
      const result = await input.validate();
      if (result.status === "passed") return nativePassed();
      return nativeFailed({
        code: `${input.checkId}-invalid`,
        diagnostics: Object.freeze(
          result.diagnostics.map(({ data, id }) => Object.freeze({ data, id }))
        ),
        focusedCommand: input.focusedCommand
      });
    }
  });
}
