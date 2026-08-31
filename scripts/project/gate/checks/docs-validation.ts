import {
  validateDocs,
  type DocsValidationTask
} from "../../../validation/documentation/workflow.ts";

import {
  createNativeOperationCheck,
  nativeFailed,
  nativePassed,
  type NativeOperationResult
} from "./process/native-operation.ts";
import type { Check } from "@zxyycom/vibe-check";

/** Adapts one documentation acceptance task into a Gate Check. */
export function createDocsValidationCheck(
  input: Readonly<{
    readonly checkId: string;
    readonly displayName: string;
    readonly task: DocsValidationTask;
  }>
): Check {
  return createNativeOperationCheck({
    checkId: input.checkId,
    displayName: input.displayName,
    operation: async (): Promise<NativeOperationResult> => {
      try {
        await validateDocs({ tasks: [input.task] });
        return nativePassed();
      } catch {
        return nativeFailed({
          code: `${input.checkId}-invalid`,
          diagnosticCount: 1,
          focusedCommand: `bun run validate -- docs ${input.task}`,
          summary: `${input.displayName} reported a validation error`
        });
      }
    }
  });
}
