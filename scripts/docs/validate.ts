import { assert } from "../tools/validators/assertions.ts";
import { TASK_NAMES } from "../tools/validators/config.ts";
import { validateMarkdownLinks } from "../tools/validators/links.ts";
import {
  validateJsonSyntax,
  validateReportExamples,
  validateSchemas
} from "../tools/validators/schema/index.ts";

const requested = new Set(process.argv.slice(2));
const runAll = requested.size === 0;

const tasks = {
  [TASK_NAMES.json]: validateJsonSyntax,
  [TASK_NAMES.schema]: validateSchemas,
  [TASK_NAMES.examples]: validateReportExamples,
  [TASK_NAMES.links]: validateMarkdownLinks
};

const selectedTasks = runAll ? Object.keys(tasks) : [...requested];
for (const taskName of selectedTasks) {
  const task = tasks[taskName];
  assert(task, `unknown validation task: ${taskName}`);
  task();
}
