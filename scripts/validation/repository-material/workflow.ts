import { assert } from "./assertions.ts";
import {
  ExpectedMaterialValidationFailure,
  expectedMaterialValidationFailure,
  type MaterialValidationDiagnostic
} from "./diagnostics.ts";
import { MATERIAL_TASK_NAMES } from "./task-contract.ts";
import { validateMarkdownLinks } from "./links.ts";
import {
  validateJsonSyntax,
  validatePublishedMachineArtifactExamples,
  validateReportExamples,
  validateSchemas
} from "./schema/validation.ts";
import { checkPublishedMachineExamples } from "../../docs/machine-artifacts/examples/command.ts";
import { MachineExamplePublicationFailure } from "../../docs/machine-artifacts/examples/publication.ts";
import {
  checkPublishedMachineSchemas,
  MachineSchemaPublicationFailure
} from "../../docs/machine-artifacts/schemas.ts";
import { runPackageApiDocumentationCli } from "../../docs/package-api/command.ts";
import { runAsyncMain } from "../../process-execution/command.ts";

/** Repository material acceptance task names; providers remain under scripts/docs. */
export type MaterialValidationTask = (typeof MATERIAL_TASK_NAMES)[keyof typeof MATERIAL_TASK_NAMES];

export type MaterialValidationResult =
  | Readonly<{
      readonly diagnostics: readonly MaterialValidationDiagnostic[];
      readonly status: "passed";
    }>
  | Readonly<{
      readonly diagnostics: readonly MaterialValidationDiagnostic[];
      readonly status: "failed";
    }>;

interface MaterialValidationTaskOptions {
  readonly linkRepositoryRoot?: string;
  readonly report?: (message: string) => void;
}

export interface MaterialValidationCliOptions {
  readonly argv: readonly string[];
  readonly linkRepositoryRoot?: string;
  readonly writeStderr: (message: string) => void;
  readonly writeStdout: (message: string) => void;
}

type MaterialValidationAction = (options: MaterialValidationTaskOptions) => void | Promise<void>;

const tasks: Readonly<Record<MaterialValidationTask, MaterialValidationAction>> = {
  [MATERIAL_TASK_NAMES.json]: ({ report }) =>
    validateJsonSyntax(report === undefined ? {} : { report }),
  [MATERIAL_TASK_NAMES.schema]: validatePublishedSchemas,
  [MATERIAL_TASK_NAMES.examples]: validatePublishedExamples,
  [MATERIAL_TASK_NAMES.links]: ({ linkRepositoryRoot, report }) => {
    validateMarkdownLinks({
      ...(report === undefined ? {} : { report }),
      ...(linkRepositoryRoot === undefined ? {} : { repositoryRoot: linkRepositoryRoot })
    });
  },
  [MATERIAL_TASK_NAMES.packageApiDocumentation]: validatePackageApiDocumentation
};

export function parseMaterialValidationTasks(
  argv: readonly string[]
): readonly MaterialValidationTask[] {
  const selectedTasks: MaterialValidationTask[] = [];
  for (const task of argv) {
    switch (task) {
      case MATERIAL_TASK_NAMES.json:
      case MATERIAL_TASK_NAMES.schema:
      case MATERIAL_TASK_NAMES.examples:
      case MATERIAL_TASK_NAMES.links:
      case MATERIAL_TASK_NAMES.packageApiDocumentation:
        selectedTasks.push(task);
        break;
      default:
        throw new Error(`unknown validation task: ${task}`);
    }
  }
  return selectedTasks;
}

export async function validateRepositoryMaterials(
  options: Readonly<{
    linkRepositoryRoot?: string;
    tasks?: readonly MaterialValidationTask[];
    report?: (message: string) => void;
  }> = {}
): Promise<MaterialValidationResult> {
  const selectedTasks =
    options.tasks === undefined ? Object.values(MATERIAL_TASK_NAMES) : [...new Set(options.tasks)];
  const selectedActions = selectedTasks.map((taskName) => {
    const task = tasks[taskName];
    assert(task !== undefined, `unknown validation task: ${taskName}`);
    return task;
  });
  return validateMaterialActions(selectedActions, options);
}

/** Direct Gate provider for the project-owned machine publication and example boundary. */
export function validateRepositoryMaterialExamples(): Promise<MaterialValidationResult> {
  return validateMaterialActions([validateCurrentMachineExamples], {});
}

/** Direct Gate provider for the project-owned schema inventory and publication-drift boundary. */
export function validateRepositoryMaterialSchemaPublication(): Promise<MaterialValidationResult> {
  return validateMaterialActions([validatePublishedSchemas], {});
}

/** Direct Gate provider for repository-local Markdown link material. */
export function validateRepositoryMaterialLinks(): Promise<MaterialValidationResult> {
  return validateMaterialActions([tasks[MATERIAL_TASK_NAMES.links]], {});
}

async function validateMaterialActions(
  selectedActions: readonly MaterialValidationAction[],
  options: Readonly<{
    linkRepositoryRoot?: string;
    report?: (message: string) => void;
  }>
): Promise<MaterialValidationResult> {
  const diagnostics: MaterialValidationDiagnostic[] = [];
  for (const task of selectedActions) {
    try {
      await task({
        ...(options.linkRepositoryRoot === undefined
          ? {}
          : { linkRepositoryRoot: options.linkRepositoryRoot }),
        ...(options.report === undefined ? {} : { report: options.report })
      });
    } catch (error: unknown) {
      if (!(error instanceof ExpectedMaterialValidationFailure)) throw error;
      diagnostics.push(...error.diagnostics);
    }
  }
  if (diagnostics.length === 0)
    return Object.freeze({ diagnostics: Object.freeze([]), status: "passed" });
  const result = Object.freeze({
    diagnostics: Object.freeze(diagnostics),
    status: "failed" as const
  });
  return result;
}

/** Runs the repository-material workflow and owns its success/failure output channels. */
export async function runMaterialValidationCli(
  options: MaterialValidationCliOptions
): Promise<number> {
  const requestedTasks = parseMaterialValidationTasks(options.argv);
  const result = await validateRepositoryMaterials({
    ...(requestedTasks.length === 0 ? {} : { tasks: requestedTasks }),
    ...(options.linkRepositoryRoot === undefined
      ? {}
      : { linkRepositoryRoot: options.linkRepositoryRoot }),
    report: options.writeStdout
  });
  if (result.status === "passed") return 0;
  for (const diagnostic of result.diagnostics) options.writeStderr(diagnostic.presentation);
  return 1;
}

function validatePackageApiDocumentation(_options: MaterialValidationTaskOptions): void {
  const result = runPackageApiDocumentationCli(["--check"]);
  if (result.exitCode !== 0) throw new Error(result.diagnostics.join("\n"));
}

async function validatePublishedExamples({ report }: MaterialValidationTaskOptions): Promise<void> {
  await validateCurrentMachineExamples(report === undefined ? {} : { report });
  validateReportExamples(report);
}

async function validateCurrentMachineExamples({
  report
}: MaterialValidationTaskOptions): Promise<void> {
  const artifactSetCount = validatePublishedMachineArtifactExamples();
  try {
    await checkPublishedMachineExamples();
  } catch (error: unknown) {
    if (error instanceof MachineExamplePublicationFailure) {
      throw expectedMaterialValidationFailure([machineExampleDiagnostic(error)]);
    }
    throw error;
  }
  report?.(`current machine artifact examples ok: ${artifactSetCount} set(s)`);
}

function validatePublishedSchemas({ report }: MaterialValidationTaskOptions): void {
  try {
    checkPublishedMachineSchemas();
  } catch (error: unknown) {
    if (error instanceof MachineSchemaPublicationFailure) {
      throw expectedMaterialValidationFailure([machineSchemaDiagnostic(error)]);
    }
    throw error;
  }
  validateSchemas(report);
}

function machineExampleDiagnostic(
  failure: MachineExamplePublicationFailure
): MaterialValidationDiagnostic {
  return Object.freeze({
    data: Object.freeze({ kind: failure.kind, path: failure.path }),
    id: `machine-example:${failure.kind}:${encodeURIComponent(failure.path)}`,
    presentation: failure.message
  });
}

function machineSchemaDiagnostic(
  failure: MachineSchemaPublicationFailure
): MaterialValidationDiagnostic {
  return Object.freeze({
    data: Object.freeze({ kind: failure.kind, path: failure.path }),
    id: `machine-schema:${failure.kind}:${encodeURIComponent(failure.path)}`,
    presentation: failure.message
  });
}

if (import.meta.main) {
  await runAsyncMain(async () => {
    process.exitCode = await runMaterialValidationCli({
      argv: process.argv.slice(2),
      writeStderr: (message) => {
        console.error(message);
      },
      writeStdout: (message) => {
        console.log(message);
      }
    });
  });
}
