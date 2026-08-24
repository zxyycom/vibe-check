import { assert } from "../validation/assertions.ts";
import { TASK_NAMES } from "../validation/docs-contract.ts";
import { validateMarkdownLinks } from "../validation/links.ts";
import {
  validateJsonSyntax,
  validatePublishedMachineArtifactExamples,
  validateReportExamples,
  validateSchemas
} from "../validation/schema/validation.ts";
import { checkPublishedMachineExamples } from "./machine-artifacts/examples.ts";
import { checkPublishedMachineSchemas } from "./machine-artifacts/schemas.ts";
import { runPackageApiDocumentationCli } from "./package-api/command.ts";

export type DocsValidationTask = (typeof TASK_NAMES)[keyof typeof TASK_NAMES];

const tasks: Readonly<Record<DocsValidationTask, (report?: (message: string) => void) => void>> = {
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

export function validateDocs(
  options: Readonly<{
    tasks?: readonly DocsValidationTask[];
    report?: (message: string) => void;
  }> = {}
): void {
  const selectedTasks =
    options.tasks === undefined ? Object.values(TASK_NAMES) : [...new Set(options.tasks)];
  for (const taskName of selectedTasks) {
    const task = tasks[taskName];
    assert(task, `unknown validation task: ${taskName}`);
    task(options.report);
  }
}

function validatePackageApiDocumentation(_report?: (message: string) => void): void {
  const result = runPackageApiDocumentationCli(["--check"]);
  if (result.exitCode !== 0) throw new Error(result.diagnostics.join("\n"));
}

function validatePublishedExamples(report?: (message: string) => void): void {
  validatePublishedMachineArtifactExamples();
  checkPublishedMachineExamples();
  validateReportExamples(report);
}

function validatePublishedSchemas(report?: (message: string) => void): void {
  checkPublishedMachineSchemas();
  validateSchemas(report);
}

if (import.meta.main) {
  try {
    const requestedTasks = parseDocsValidationTasks(process.argv.slice(2));
    validateDocs({
      ...(requestedTasks.length === 0 ? {} : { tasks: requestedTasks }),
      report: (message) => console.log(message)
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
