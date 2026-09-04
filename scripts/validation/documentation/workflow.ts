import { assert } from "./assertions.ts";
import {
  ExpectedDocsValidationFailure,
  expectedDocsValidationFailure,
  type DocsValidationDiagnostic
} from "./diagnostics.ts";
import { TASK_NAMES } from "./task-contract.ts";
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

/** Documentation acceptance task names; providers remain under scripts/docs. */
export type DocsValidationTask = (typeof TASK_NAMES)[keyof typeof TASK_NAMES];

export type DocsValidationResult =
  | Readonly<{
      readonly diagnostics: readonly DocsValidationDiagnostic[];
      readonly status: "passed";
    }>
  | Readonly<{
      readonly diagnostics: readonly DocsValidationDiagnostic[];
      readonly status: "failed";
    }>;

interface DocsValidationTaskOptions {
  readonly linkRepositoryRoot?: string;
  readonly report?: (message: string) => void;
}

export interface DocsValidationCliOptions {
  readonly argv: readonly string[];
  readonly linkRepositoryRoot?: string;
  readonly writeStderr: (message: string) => void;
  readonly writeStdout: (message: string) => void;
}

type DocsValidationAction = (options: DocsValidationTaskOptions) => void | Promise<void>;

const tasks: Readonly<Record<DocsValidationTask, DocsValidationAction>> = {
  [TASK_NAMES.json]: ({ report }) => validateJsonSyntax(report),
  [TASK_NAMES.schema]: validatePublishedSchemas,
  [TASK_NAMES.examples]: validatePublishedExamples,
  [TASK_NAMES.links]: ({ linkRepositoryRoot, report }) =>
    validateMarkdownLinks({ report, repositoryRoot: linkRepositoryRoot }),
  [TASK_NAMES.packageApiDocumentation]: validatePackageApiDocumentation
};

export function parseDocsValidationTasks(argv: readonly string[]): readonly DocsValidationTask[] {
  const selectedTasks: DocsValidationTask[] = [];
  for (const task of argv) {
    switch (task) {
      case TASK_NAMES.json:
      case TASK_NAMES.schema:
      case TASK_NAMES.examples:
      case TASK_NAMES.links:
      case TASK_NAMES.packageApiDocumentation:
        selectedTasks.push(task);
        break;
      default:
        throw new Error(`unknown validation task: ${task}`);
    }
  }
  return selectedTasks;
}

export async function validateDocs(
  options: Readonly<{
    linkRepositoryRoot?: string;
    tasks?: readonly DocsValidationTask[];
    report?: (message: string) => void;
  }> = {}
): Promise<DocsValidationResult> {
  const selectedTasks =
    options.tasks === undefined ? Object.values(TASK_NAMES) : [...new Set(options.tasks)];
  const diagnostics: DocsValidationDiagnostic[] = [];
  for (const taskName of selectedTasks) {
    const task = tasks[taskName];
    assert(task, `unknown validation task: ${taskName}`);
    try {
      await task({ linkRepositoryRoot: options.linkRepositoryRoot, report: options.report });
    } catch (error: unknown) {
      if (!(error instanceof ExpectedDocsValidationFailure)) throw error;
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

/** Runs the real docs workflow and owns its success/failure output channels. */
export async function runDocsValidationCli(options: DocsValidationCliOptions): Promise<number> {
  const requestedTasks = parseDocsValidationTasks(options.argv);
  const result = await validateDocs({
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

function validatePackageApiDocumentation(_options: DocsValidationTaskOptions): void {
  const result = runPackageApiDocumentationCli(["--check"]);
  if (result.exitCode !== 0) throw new Error(result.diagnostics.join("\n"));
}

async function validatePublishedExamples({ report }: DocsValidationTaskOptions): Promise<void> {
  const artifactSetCount = validatePublishedMachineArtifactExamples();
  try {
    await checkPublishedMachineExamples();
  } catch (error: unknown) {
    if (error instanceof MachineExamplePublicationFailure) {
      throw expectedDocsValidationFailure([machineExampleDiagnostic(error)]);
    }
    throw error;
  }
  report?.(`current machine artifact examples ok: ${artifactSetCount} set(s)`);
  validateReportExamples(report);
}

function validatePublishedSchemas({ report }: DocsValidationTaskOptions): void {
  try {
    checkPublishedMachineSchemas();
  } catch (error: unknown) {
    if (error instanceof MachineSchemaPublicationFailure) {
      throw expectedDocsValidationFailure([machineSchemaDiagnostic(error)]);
    }
    throw error;
  }
  validateSchemas(report);
}

function machineExampleDiagnostic(
  failure: MachineExamplePublicationFailure
): DocsValidationDiagnostic {
  return Object.freeze({
    data: Object.freeze({ kind: failure.kind, path: failure.path }),
    id: `machine-example:${failure.kind}:${encodeURIComponent(failure.path)}`,
    presentation: failure.message
  });
}

function machineSchemaDiagnostic(
  failure: MachineSchemaPublicationFailure
): DocsValidationDiagnostic {
  return Object.freeze({
    data: Object.freeze({ kind: failure.kind, path: failure.path }),
    id: `machine-schema:${failure.kind}:${encodeURIComponent(failure.path)}`,
    presentation: failure.message
  });
}

if (import.meta.main) {
  await runAsyncMain(async () => {
    process.exitCode = await runDocsValidationCli({
      argv: process.argv.slice(2),
      writeStderr: (message) => console.error(message),
      writeStdout: (message) => console.log(message)
    });
  });
}
