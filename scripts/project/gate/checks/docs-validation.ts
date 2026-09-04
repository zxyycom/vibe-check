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

/** The documentation workflow is the sole provider consumed by this Gate adapter. */
export interface DocsValidationCheckDependencies {
  readonly validateDocs: typeof validateDocs;
}

const defaultDependencies: DocsValidationCheckDependencies = Object.freeze({
  validateDocs
});

/** Adapts one documentation acceptance task into a Gate Check. */
export function createDocsValidationCheck(
  input: Readonly<{
    readonly checkId: string;
    readonly displayName: string;
    readonly task: DocsValidationTask;
  }>,
  dependencies: DocsValidationCheckDependencies = defaultDependencies
): Check {
  return createNativeOperationCheck({
    checkId: input.checkId,
    displayName: input.displayName,
    operation: async (): Promise<NativeOperationResult> => {
      const result = await dependencies.validateDocs({ tasks: [input.task] });
      if (result.status === "passed") return nativePassed();
      return nativeFailed({
        code: `${input.checkId}-invalid`,
        diagnostics: result.diagnostics,
        focusedCommand: `bun run validate -- docs ${input.task}`
      });
    }
  });
}
