import { reportProcessOutput, runAsyncMain, runCommand } from "../process-execution/command.ts";
import { TASK_NAMES } from "./documentation/task-contract.ts";
import { validateRepositoryLayout } from "./layout-characterization.ts";
import { parseDocsValidationTasks, validateDocs } from "./documentation/workflow.ts";

async function validate(argv: readonly string[]): Promise<void> {
  if (argv.length > 0 && argv[0] !== "docs") {
    throw new Error(
      `usage: bun scripts/validation/workspace.ts [docs [json|schema|examples|links|${TASK_NAMES.packageApiDocumentation}]...]`
    );
  }

  const docsOnly = argv[0] === "docs";
  const tasks = parseDocsValidationTasks(argv.slice(docsOnly ? 1 : 0));
  await validateDocs({
    ...(tasks.length === 0 ? {} : { tasks }),
    report: (message) => console.log(message)
  });
  if (!docsOnly) {
    validateRepositoryLayout();
    runCommand("git", ["diff", "--check"], { report: reportProcessOutput });
  }
}

if (import.meta.main) {
  await runAsyncMain(() => validate(process.argv.slice(2)));
}
