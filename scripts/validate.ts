import { runBun, runCommand, runMain } from "./development/command.ts";

function validate(argv: readonly string[]): void {
  if (argv.length > 0 && argv[0] !== "docs") {
    throw new Error("usage: bun scripts/validate.ts [docs [json|schema|examples|links]...]");
  }

  const docsOnly = argv[0] === "docs";
  runBun(["scripts/docs/validate.ts", ...argv.slice(docsOnly ? 1 : 0)]);
  if (!docsOnly) runCommand("git", ["diff", "--check"]);
}

runMain(() => validate(process.argv.slice(2)));
