import { reportProcessOutput, runAsyncMain, runCommand } from "../process-execution/command.ts";
import { MATERIAL_TASK_NAMES } from "./repository-material/task-contract.ts";
import { validateRepositoryLayout } from "./layout-characterization.ts";
import {
  parseMaterialValidationTasks,
  runMaterialValidationCli
} from "./repository-material/workflow.ts";

/** Internal adapter shared by the process entry and focused dispatch evidence. */
export async function runWorkspaceValidation(
  argv: readonly string[],
  dependencies: Readonly<{ runMaterials?: typeof runMaterialValidationCli }> = {}
): Promise<number> {
  if (argv.length > 0 && argv[0] !== "materials") {
    throw new Error(
      `usage: bun scripts/validation/workspace.ts [materials [json|schema|examples|links|${MATERIAL_TASK_NAMES.packageApiDocumentation}]...]`
    );
  }

  const materialsOnly = argv[0] === "materials";
  const tasks = parseMaterialValidationTasks(argv.slice(materialsOnly ? 1 : 0));
  const materialsExitCode = await (dependencies.runMaterials ?? runMaterialValidationCli)({
    argv: tasks,
    writeStderr: (message) => {
      console.error(message);
    },
    writeStdout: (message) => {
      console.log(message);
    }
  });
  if (materialsExitCode !== 0) return materialsExitCode;
  if (!materialsOnly) {
    validateRepositoryLayout();
    runCommand("git", ["diff", "--check"], { report: reportProcessOutput });
  }
  return 0;
}

if (import.meta.main) {
  await runAsyncMain(async () => {
    process.exitCode = await runWorkspaceValidation(process.argv.slice(2));
  });
}
