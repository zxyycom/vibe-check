#!/usr/bin/env bun

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runInvestigationReportCheckCli } from "../../.codex/skills/investigation-report/scripts/check-investigations.mjs";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

if (import.meta.main) {
  const argv = process.argv.slice(2);
  process.exitCode = await runInvestigationReportCheckCli(argv.length === 0 ? ["check"] : argv, {
    cwd: workspaceRoot
  });
}
