import { createCatalogFingerprint } from "../identity.ts";
import type { CheckDefinition, CoreSnapshot } from "../model.ts";
import { createCoreCheckSession } from "../core-session.ts";
import type {
  BuiltInCheckBinding,
  BuiltInCheckExecutionResult
} from "./builtin-support.ts";

export interface BuiltInTestRun {
  readonly applicability: "applicable" | "not-applicable";
  readonly binding: BuiltInCheckBinding;
  readonly catalogFingerprint: string;
  readonly definition: CheckDefinition;
  readonly definitions: readonly CheckDefinition[];
}

function isUnavailableResult(
  result: BuiltInCheckExecutionResult
): result is Extract<BuiltInCheckExecutionResult, { readonly kind: "unavailable" }> {
  return "kind" in result && result.kind === "unavailable";
}

export function createBuiltInTestRun(input: Readonly<{
  applicability: "applicable" | "not-applicable";
  binding: BuiltInCheckBinding;
  definition: CheckDefinition;
}>): BuiltInTestRun {
  return Object.freeze({
    applicability: input.applicability,
    binding: input.binding,
    catalogFingerprint: createCatalogFingerprint([input.definition]).catalogFingerprint,
    definition: input.definition,
    definitions: Object.freeze([input.definition])
  });
}

export async function runBuiltInTestRun(input: BuiltInTestRun): Promise<CoreSnapshot> {
  const session = createCoreCheckSession([{
    definition: input.definition,
    applicability: input.applicability
  }]);
  if (input.applicability === "not-applicable") {
    session.closeNotApplicable(input.definition.checkId);
    return session.freeze();
  }
  const scope = session.openApplicableScope(input.definition.checkId);
  let result: BuiltInCheckExecutionResult;
  try {
    result = await input.binding({
      signal: new AbortController().signal,
      results: scope.records
    });
  } catch {
    scope.settle({ kind: "unavailable", diagnostic: { category: "execution-failed" } });
    return session.freeze();
  }
  if (isUnavailableResult(result)) {
    scope.settle({ kind: "unavailable", diagnostic: { category: result.category } });
  } else {
    const completed = result as Extract<BuiltInCheckExecutionResult, { readonly verdict: string }>;
    scope.settle({ kind: "completed", verdict: completed.verdict });
  }
  return session.freeze();
}
