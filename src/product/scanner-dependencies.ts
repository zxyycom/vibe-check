import { CURRENT_PUBLIC_CONTRACT, type OperationalDependencyId } from "./current-public-contract.ts";
import type { OperationalDependencies } from "./project-definition.ts";

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
    dependencyIds()
  );
  return selected as ScannerDependencySnapshot;
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
    || selectedDependencyIds.some((dependencyId) => !dependencyIds().includes(dependencyId))) {
    throw new ScannerOperationalInputError("operationalDependencies");
  }
  const executableByDependency = new Map(selectedDependencyIds.map((dependencyId) => [
    dependencyId,
    resolveExecutable(dependencyId, input)
  ]));

  return Object.freeze({
    ...(executableByDependency.has("duplication") ? { duplication: Object.freeze({
      args: Object.freeze([]),
      availabilityArgs: Object.freeze(["--version"]),
      executable: executableByDependency.get("duplication")!,
      maxConcurrency: DUPLICATION_MAX_CONCURRENCY
    }) } : {}),
    ...(executableByDependency.has("file") ? { file: Object.freeze({
      args: Object.freeze([]),
      availabilityArgs: Object.freeze(["--version"]),
      executable: executableByDependency.get("file")!
    }) } : {}),
    ...(executableByDependency.has("function") ? { function: Object.freeze({
      args: FUNCTION_ARGS,
      availabilityArgs: FUNCTION_AVAILABILITY_ARGS,
      executable: executableByDependency.get("function")!
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

function dependencyIds(): OperationalDependencyId[] {
  return Object.keys(CURRENT_PUBLIC_CONTRACT.operationalDependencies) as OperationalDependencyId[];
}

function isOperationalDependencyId(value: string): value is OperationalDependencyId {
  return dependencyIds().includes(value as OperationalDependencyId);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
