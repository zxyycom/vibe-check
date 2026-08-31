import { checkTestEvidence } from "../../../../test-evidence/command.ts";
import type { Check } from "@zxyycom/vibe-check";
import {
  createNativeOperationCheck,
  nativeFailed,
  nativePassed,
  type NativeOperationResult
} from "../process/native-operation.ts";

/** Adapts semantic Case closure into its Gate Check. */
export function createTestEvidenceCheck(): Check {
  return createNativeOperationCheck({
    checkId: "test-evidence",
    displayName: "Semantic Case ledger",
    operation: async (workspaceRoot, signal): Promise<NativeOperationResult> => {
      const result = await checkTestEvidence({ cancelSignal: signal, workspaceRoot });
      if (result.status === "ok") return nativePassed();
      const diagnostics = result.diagnostics.filter(({ blocking }) => blocking);
      const safeCode = safeDiagnosticCode(diagnostics[0]?.code);
      return nativeFailed({
        code: `test-evidence-${safeCode}`,
        diagnosticCount: diagnostics.length,
        focusedCommand: "bun run test-evidence -- check --root .",
        summary: `Test Evidence reported ${diagnostics.length} blocking diagnostic(s); first code: ${safeCode}`
      });
    }
  });
}

function safeDiagnosticCode(value: string | undefined): string {
  return value !== undefined && value.length <= 80 && /^[a-z][a-z0-9:.-]*$/u.test(value)
    ? value
    : "invalid";
}
