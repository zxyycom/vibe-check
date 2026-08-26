import { reportProcessOutput, runCommand, runMain } from "../process-execution/command.ts";

function parseTestScope(argv: readonly string[]): void {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === "product")) return;
  throw new Error("usage: bun scripts/development/test.ts [product]");
}

if (import.meta.main) {
  runMain(() => {
    parseTestScope(process.argv.slice(2));
    runCommand(process.execPath, ["test", "src"], { report: reportProcessOutput });
  });
}
