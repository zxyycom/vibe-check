import {
  CURRENT_PUBLIC_CONTRACT,
  OPERATIONAL_DEPENDENCY_IDS,
  type OperationalDependencyId
} from "../public-contract/current.ts";
import type {
  OperationalDependencies,
  OperationalDependencyBinding
} from "../definition/project.ts";
import { snapshotClosedRecord } from "../quality-core/check-record/plain-record-values.ts";

const DUPLICATION_MAX_CONCURRENCY = 4;
const FUNCTION_ARGS = Object.freeze(["-m", "lizard"] as const);
const FUNCTION_AVAILABILITY_ARGS = Object.freeze([
  ...FUNCTION_ARGS,
  "--version"
] as const);

export interface FileScannerDependency {
  readonly args: readonly string[];
  readonly availabilityArgs: readonly string[];
  readonly executable: string;
}

export interface FunctionScannerDependency {
  readonly args: readonly string[];
  readonly availabilityArgs: readonly string[];
  readonly executable: string;
}

export interface DuplicationScannerDependency {
  readonly args: readonly string[];
  readonly availabilityArgs: readonly string[];
  readonly executable: string;
  readonly maxConcurrency: number;
}

export interface ScannerDependencySnapshot {
  readonly duplication: DuplicationScannerDependency;
  readonly file: FileScannerDependency;
  readonly function: FunctionScannerDependency;
}

export interface ScannerDependencyResolutionInput {
  readonly controls?: OperationalDependencies;
  readonly definition?: OperationalDependencies;
  readonly environment?: Readonly<Record<string, string | undefined>>;
}

export type SelectedScannerDependencySnapshot = Readonly<Partial<ScannerDependencySnapshot>>;

export function parseOperationalDependencies(value: unknown): OperationalDependencies | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  const dependencies: Partial<Record<OperationalDependencyId, OperationalDependencyBinding>> = {};
  for (const [dependencyId, binding] of Object.entries(data)) {
    const bindingData = snapshotClosedRecord(binding);
    if (!isOperationalDependencyId(dependencyId) || bindingData === undefined
      || Object.keys(bindingData).length !== 1 || typeof bindingData.executable !== "string") {
      return undefined;
    }
    dependencies[dependencyId] = Object.freeze({ executable: bindingData.executable });
  }
  return Object.freeze(dependencies);
}

export class ScannerOperationalInputError extends Error {
  readonly code = "invalid-scanner-operational-input";
  readonly dependencyId: OperationalDependencyId | undefined;
  readonly inputName: string;

  constructor(inputName: string) {
    super(inputName.startsWith("VIBE_CHECK_")
      ? `${inputName} is invalid`
      : `Missing explicit scanner binding for ${inputName}`);
    this.name = "ScannerOperationalInputError";
    this.dependencyId = isOperationalDependencyId(inputName) ? inputName : undefined;
    this.inputName = inputName;
  }
}

export function resolveScannerDependencySnapshot(
  input: ScannerDependencyResolutionInput
): ScannerDependencySnapshot {
  const selected = resolveSelectedScannerDependencySnapshot(
    input,
    OPERATIONAL_DEPENDENCY_IDS
  );
  return Object.freeze({
    duplication: requiredDuplicationDependency(selected),
    file: requiredFileDependency(selected),
    function: requiredFunctionDependency(selected)
  });
}

/**
 * Resolves only dependencies required by this invocation. This makes the
 * Package Run pre-work boundary independent from unselected built-in Checks.
 */
export function resolveSelectedScannerDependencySnapshot(
  input: ScannerDependencyResolutionInput,
  selectedDependencyIds: readonly OperationalDependencyId[]
): SelectedScannerDependencySnapshot {
  const selected = new Set(selectedDependencyIds);
  if (selected.size !== selectedDependencyIds.length
    || selectedDependencyIds.some((dependencyId) => !OPERATIONAL_DEPENDENCY_IDS.includes(dependencyId))) {
    throw new ScannerOperationalInputError("operationalDependencies");
  }
  const executables = new Map<OperationalDependencyId, string>();
  for (const dependencyId of selectedDependencyIds) {
    executables.set(dependencyId, resolveExecutable(dependencyId, input));
  }

  return Object.freeze({
    ...(executables.has("duplication") ? { duplication: Object.freeze({
      args: Object.freeze([]),
      availabilityArgs: Object.freeze(["--version"]),
      executable: requiredExecutable(executables, "duplication"),
      maxConcurrency: DUPLICATION_MAX_CONCURRENCY
    }) } : {}),
    ...(executables.has("file") ? { file: Object.freeze({
      args: Object.freeze([]),
      availabilityArgs: Object.freeze(["--version"]),
      executable: requiredExecutable(executables, "file")
    }) } : {}),
    ...(executables.has("function") ? { function: Object.freeze({
      args: FUNCTION_ARGS,
      availabilityArgs: FUNCTION_AVAILABILITY_ARGS,
      executable: requiredExecutable(executables, "function")
    }) } : {})
  });
}

function resolveExecutable(
  dependencyId: OperationalDependencyId,
  sources: ScannerDependencyResolutionInput
): string {
  const fromControls = sources.controls?.[dependencyId]?.executable;
  if (isNonEmptyString(fromControls)) return fromControls;
  const environmentName = CURRENT_PUBLIC_CONTRACT.operationalDependencies[dependencyId].environment;
  const fromEnvironment = sources.environment?.[environmentName];
  if (isNonEmptyString(fromEnvironment)) return fromEnvironment;
  const fromDefinition = sources.definition?.[dependencyId]?.executable;
  if (isNonEmptyString(fromDefinition)) return fromDefinition;
  throw new ScannerOperationalInputError(dependencyId);
}

function requiredDuplicationDependency(
  snapshot: SelectedScannerDependencySnapshot
): DuplicationScannerDependency {
  const dependency = snapshot.duplication;
  if (dependency === undefined) throw new ScannerOperationalInputError("duplication");
  return dependency;
}

function requiredFileDependency(snapshot: SelectedScannerDependencySnapshot): FileScannerDependency {
  const dependency = snapshot.file;
  if (dependency === undefined) throw new ScannerOperationalInputError("file");
  return dependency;
}

function requiredFunctionDependency(snapshot: SelectedScannerDependencySnapshot): FunctionScannerDependency {
  const dependency = snapshot.function;
  if (dependency === undefined) throw new ScannerOperationalInputError("function");
  return dependency;
}

function requiredExecutable(
  executables: ReadonlyMap<OperationalDependencyId, string>,
  dependencyId: OperationalDependencyId
): string {
  const executable = executables.get(dependencyId);
  if (executable === undefined) throw new ScannerOperationalInputError(dependencyId);
  return executable;
}

function isOperationalDependencyId(value: string): value is OperationalDependencyId {
  return Object.hasOwn(CURRENT_PUBLIC_CONTRACT.operationalDependencies, value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
