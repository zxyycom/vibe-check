import {
  resolveCheckCatalog,
  type CheckExecutionBinding,
  type CheckTaskPlanFactory,
  type ResolvedCheckCatalog
} from "./catalog.ts";

function definition(checkId: string) {
  return {
    checkId,
    displayName: checkId,
    recordTypes: [{
      recordTypeId: "finding",
      fields: [{ fieldId: "kind", valueType: "string", required: true }],
      identityFields: ["kind"]
    }]
  } as const;
}

type Binding = Readonly<
  | { checkId: string; execute: CheckExecutionBinding }
  | { checkId: string; createTaskPlan: CheckTaskPlanFactory }
>;

export function catalog(input: Readonly<{
  checkIds: readonly string[];
  bindings: readonly Binding[];
  requires?: Readonly<Record<string, readonly string[]>>;
  selected?: readonly string[];
  work?: Readonly<Record<string, readonly string[] | "not-applicable">>;
}>): ResolvedCheckCatalog {
  const definitions = input.checkIds.map(definition);
  const resolved = resolveCheckCatalog({
    invocationKey: "task-orchestration-test",
    definitions,
    bindings: input.bindings,
    schedules: input.checkIds.map((checkId) => ({
      checkId,
      requiresChecks: input.requires?.[checkId] ?? []
    })),
    selectedCheckIds: input.selected ?? input.checkIds,
    resolveApplicability: ({ checkId }) => input.work?.[checkId] === "not-applicable"
      ? { status: "not-applicable" }
      : { status: "applicable", workHandles: input.work?.[checkId] ?? [] }
  });
  if (!resolved.ok) throw new Error(`Unexpected ${resolved.error.stage} fixture failure`);
  return resolved.value;
}

export function finding(kind: string) {
  return {
    recordTypeId: "finding",
    level: "warning",
    semanticSubject: `src/${kind}.ts`,
    message: kind,
    fields: { kind },
    location: { path: `src/${kind}.ts`, line: 1, column: 1 }
  } as const;
}

export async function waitFor(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 100; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error("Timed out waiting for orchestration test state");
}
