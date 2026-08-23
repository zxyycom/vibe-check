import { assert } from "../tools/validators/assertions.ts";
import { TASK_NAMES } from "../tools/validators/config.ts";
import { validateMarkdownLinks } from "../tools/validators/links.ts";
import {
  validateJsonSyntax,
  validatePublishedMachineArtifactExamples,
  validateReportExamples,
  validateSchemas
} from "../tools/validators/schema/index.ts";
import { checkPublishedMachineExamples } from "./machine-examples.ts";
import { checkPublishedMachineSchemas } from "./machine-schemas.ts";
import { runPackageApiDocumentationCli } from "./package-api-docs/index.ts";

const requested = new Set(process.argv.slice(2));
const runAll = requested.size === 0;

const tasks = {
  [TASK_NAMES.json]: validateJsonSyntax,
  [TASK_NAMES.schema]: validatePublishedSchemas,
  [TASK_NAMES.examples]: validatePublishedExamples,
  [TASK_NAMES.links]: validateMarkdownLinks,
  [TASK_NAMES.packageApiDocumentation]: validatePackageApiDocumentation
};

function validatePackageApiDocumentation(): void {
  const result = runPackageApiDocumentationCli(["--check"]);
  if (result.exitCode !== 0) throw new Error(result.diagnostics.join("\n"));
}

function validatePublishedExamples(): void {
  validatePublishedMachineArtifactExamples();
  checkPublishedMachineExamples();
  validateReportExamples();
}

function validatePublishedSchemas(): void {
  checkPublishedMachineSchemas();
  validateSchemas();
}

const selectedTasks = runAll ? Object.keys(tasks) : [...requested];
for (const taskName of selectedTasks) {
  const task = tasks[taskName];
  assert(task, `unknown validation task: ${taskName}`);
  task();
}
