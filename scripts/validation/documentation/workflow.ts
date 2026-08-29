import { assert } from "./assertions.ts";
import { TASK_NAMES } from "./task-contract.ts";
import { validateMarkdownLinks } from "./links.ts";
import {
  validateJsonSyntax,
  validatePublishedMachineArtifactExamples,
  validateReportExamples,
  validateSchemas
} from "./schema/validation.ts";
import { checkPublishedMachineExamples } from "../../docs/machine-artifacts/examples/command.ts";
import { checkPublishedMachineSchemas } from "../../docs/machine-artifacts/schemas.ts";
import { runPackageApiDocumentationCli } from "../../docs/package-api/command.ts";
import { runAsyncMain } from "../../process-execution/command.ts";

/** Documentation acceptance task names; providers remain under scripts/docs. */
export type DocsValidationTask = (typeof TASK_NAMES)[keyof typeof TASK_NAMES];

type DocsValidationAction = (report?: (message: string) => void) => void | Promise<void>;

const tasks: Readonly<Record<DocsValidationTask, DocsValidationAction>> = {
  [TASK_NAMES.json]: validateJsonSyntax,
  [TASK_NAMES.schema]: validatePublishedSchemas,
  [TASK_NAMES.examples]: validatePublishedExamples,
  [TASK_NAMES.links]: validateMarkdownLinks,
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
    tasks?: readonly DocsValidationTask[];
    report?: (message: string) => void;
  }> = {}
): Promise<void> {
  const selectedTasks =
    options.tasks === undefined ? Object.values(TASK_NAMES) : [...new Set(options.tasks)];
  for (const taskName of selectedTasks) {
    const task = tasks[taskName];
    assert(task, `unknown validation task: ${taskName}`);
    await task(options.report);
  }
}

function validatePackageApiDocumentation(_report?: (message: string) => void): void {
  const result = runPackageApiDocumentationCli(["--check"]);
  if (result.exitCode !== 0) throw new Error(result.diagnostics.join("\n"));
}

async function validatePublishedExamples(report?: (message: string) => void): Promise<void> {
  const artifactSetCount = validatePublishedMachineArtifactExamples();
  await checkPublishedMachineExamples();
  report?.(`current machine artifact examples ok: ${artifactSetCount} set(s)`);
  validateReportExamples(report);
}

function validatePublishedSchemas(report?: (message: string) => void): void {
  checkPublishedMachineSchemas();
  validateSchemas(report);
}

if (import.meta.main) {
  await runAsyncMain(async () => {
    const requestedTasks = parseDocsValidationTasks(process.argv.slice(2));
    await validateDocs({
      ...(requestedTasks.length === 0 ? {} : { tasks: requestedTasks }),
      report: (message) => console.log(message)
    });
  });
}
