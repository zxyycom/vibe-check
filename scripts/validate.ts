import { reportProcessOutput, runCommand, runMain } from "./development/command.ts";
import { TASK_NAMES } from "./tools/validators/config.ts";
import { parseDocsValidationTasks, validateDocs } from "./docs/validate.ts";

function validate(argv: readonly string[]): void {
  if (argv.length > 0 && argv[0] !== "docs") {
    throw new Error(
      `usage: bun scripts/validate.ts [docs [json|schema|examples|links|${TASK_NAMES.packageApiDocumentation}]...]`
    );
  }

  const docsOnly = argv[0] === "docs";
  const tasks = parseDocsValidationTasks(argv.slice(docsOnly ? 1 : 0));
  validateDocs({
    ...(tasks.length === 0 ? {} : { tasks }),
    report: (message) => console.log(message)
  });
  if (!docsOnly) runCommand("git", ["diff", "--check"], { report: reportProcessOutput });
}

if (import.meta.main) {
  runMain(() => validate(process.argv.slice(2)));
}
