import {
  type CheckDefinition,
  type CheckEnvironment,
  type CheckReportRef,
  type CheckTask,
  type Profile
} from "./model.ts";
import {
  parseCheckDefinitions,
  type ParsedCheckDefinition,
  type ParsedCheckDefinitionBase,
  type ParsedCheckGroup,
  type ParsedCheckLeaf
} from "./authoring.ts";

interface InheritedCheckState {
  readonly type: Profile | undefined;
  readonly mutex: readonly string[];
  readonly dependsOn: readonly string[];
  readonly env: CheckEnvironment | undefined;
  readonly envFile: string | undefined;
  readonly report: CheckReportRef | null;
}

interface ExpandCheckState {
  readonly ids: Set<string>;
  readonly groupLeafIds: Map<string, readonly string[]>;
  readonly leafChecks: CheckTask[];
}

const DEFAULT_INHERITED_CHECK_STATE: InheritedCheckState = Object.freeze({
  type: undefined,
  mutex: Object.freeze([]),
  dependsOn: Object.freeze([]),
  env: undefined,
  envFile: undefined,
  report: null
});

/**
 * Parses scripts-owned authoring at its dynamic boundary, then flattens the
 * validated tree into command leaves for the workspace verifier.
 */
export function defineChecks(checkList: readonly CheckDefinition[]): readonly CheckTask[] {
  const checks = parseCheckDefinitions(checkList);
  const state: ExpandCheckState = {
    ids: new Set(),
    groupLeafIds: new Map(),
    leafChecks: []
  };

  for (const check of checks) {
    expandCheck(check, DEFAULT_INHERITED_CHECK_STATE, state);
  }

  return Object.freeze(state.leafChecks.map((check) => Object.freeze({
    ...check,
    dependsOn: Object.freeze(resolveGroupDependencies(check.dependsOn, state.groupLeafIds, check.id))
  })));
}

function expandCheck(
  check: ParsedCheckDefinition,
  inherited: InheritedCheckState,
  state: ExpandCheckState
): void {
  if (state.ids.has(check.id)) {
    throw new Error(`duplicate check id: ${check.id}`);
  }
  state.ids.add(check.id);

  const nextInherited = inheritCheckState(check, inherited);
  switch (check.kind) {
    case "group":
      expandCheckGroup(check, nextInherited, state);
      return;
    case "leaf":
      expandLeafCheck(check, nextInherited, state);
      return;
  }
  return unreachableCheckDefinition(check);
}

function expandCheckGroup(
  check: ParsedCheckGroup,
  inherited: InheritedCheckState,
  state: ExpandCheckState
): void {
  const startIndex = state.leafChecks.length;
  for (const child of check.tasks) {
    expandCheck(child, inherited, state);
  }
  state.groupLeafIds.set(
    check.id,
    Object.freeze(state.leafChecks.slice(startIndex).map((leaf) => leaf.id))
  );
}

function expandLeafCheck(
  check: ParsedCheckLeaf,
  inherited: InheritedCheckState,
  state: ExpandCheckState
): void {
  const type = inherited.type;
  if (type === undefined) {
    throw new TypeError(`check ${check.id} must inherit a verification profile`);
  }
  const report = inherited.report ?? createCheckReport(check);
  state.leafChecks.push(Object.freeze({
    id: check.id,
    label: check.label ?? check.id,
    type,
    mutex: inherited.mutex,
    dependsOn: inherited.dependsOn,
    env: inherited.env,
    envFile: inherited.envFile,
    allowOutput: check.allowOutput,
    args: check.args,
    command: check.command,
    ignoreOutput: check.ignoreOutput,
    reportId: report.id,
    reportLabel: report.label,
    warningOutput: check.warningOutput
  }));
}

function inheritCheckState(
  check: ParsedCheckDefinition,
  inherited: InheritedCheckState
): InheritedCheckState {
  return Object.freeze({
    type: check.type ?? inherited.type,
    mutex: Object.freeze([...inherited.mutex, ...check.mutex]),
    dependsOn: Object.freeze([...inherited.dependsOn, ...check.dependsOn]),
    env: mergeEnvironment(inherited.env, check.env),
    envFile: check.envFile ?? inherited.envFile,
    report: inheritCheckReport(check, inherited.report)
  });
}

function inheritCheckReport(
  check: ParsedCheckDefinitionBase,
  inherited: CheckReportRef | null
): CheckReportRef | null {
  if (inherited !== null) return inherited;
  return check.label === undefined ? null : createCheckReport(check);
}

function resolveGroupDependencies(
  dependsOn: readonly string[],
  groupLeafIds: ReadonlyMap<string, readonly string[]>,
  checkId: string
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const dependency of dependsOn) {
    const dependencyIds = groupLeafIds.get(dependency) ?? [dependency];
    for (const dependencyId of dependencyIds) {
      if (dependencyId !== checkId && !seen.has(dependencyId)) {
        result.push(dependencyId);
        seen.add(dependencyId);
      }
    }
  }
  return result;
}

function mergeEnvironment(
  parent: CheckEnvironment | undefined,
  child: CheckEnvironment | undefined
): CheckEnvironment | undefined {
  if (parent === undefined) return child;
  if (child === undefined) return parent;
  return Object.freeze({ ...parent, ...child });
}

function createCheckReport(check: ParsedCheckDefinitionBase): CheckReportRef {
  return Object.freeze({ id: check.id, label: check.label ?? check.id });
}

function unreachableCheckDefinition(check: never): never {
  throw new TypeError(`Unknown Check definition: ${JSON.stringify(check)}`);
}
