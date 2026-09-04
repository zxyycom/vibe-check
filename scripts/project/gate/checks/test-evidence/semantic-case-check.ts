import { checkTestEvidence } from "../../../../test-evidence/command.ts";
import type { Check } from "@zxyycom/vibe-check";

import {
  createNativeOperationCheck,
  nativeFailed,
  nativePassed,
  type NativeOperationDiagnostic,
  type NativeOperationResult
} from "../process/native-operation.ts";
import { safeTestEvidenceBlockingDiagnostics } from "./semantic-case-projection.ts";

export interface TestEvidenceCheckDependencies {
  readonly check: typeof checkTestEvidence;
}

const defaultDependencies: TestEvidenceCheckDependencies = Object.freeze({
  check: checkTestEvidence
});

/** Adapts the semantic Case ledger into its Gate Check without publishing raw diagnostic text. */
export function createTestEvidenceCheck(
  dependencies: TestEvidenceCheckDependencies = defaultDependencies
): Check {
  return createNativeOperationCheck({
    checkId: "test-evidence",
    displayName: "Semantic Case ledger",
    operation: async (workspaceRoot, signal): Promise<NativeOperationResult> => {
      const result = await dependencies.check({ cancelSignal: signal, workspaceRoot });
      if (result.status === "ok") return nativePassed();

      const diagnostics = safeTestEvidenceBlockingDiagnostics(result.diagnostics);
      if (diagnostics === undefined) {
        throw new Error("Test Evidence has no safe diagnostic projection");
      }
      return nativeFailed({
        code: `test-evidence-${diagnostics[0].code}`,
        diagnostics: nativeDiagnostics(diagnostics),
        focusedCommand: "bun run test-evidence -- check --root ."
      });
    }
  });
}

function nativeDiagnostics(
  diagnostics: readonly (NativeOperationDiagnostic & Readonly<{ readonly code: string }>)[]
): readonly NativeOperationDiagnostic[] {
  return Object.freeze(diagnostics.map(({ data, id }) => Object.freeze({ data, id })));
}
