import { runTestEvidenceCli } from "./cli.ts";

if (import.meta.main) {
  process.exitCode = await runTestEvidenceCli(process.argv.slice(2));
}
