#!/usr/bin/env bun

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isNonArrayRecord } from "../value-guards.ts";

// The installed runtime owns its compiler settings; consume its public declaration contract.
const installedRuntime: unknown = await import(
  new URL(
    "../../.codex/skills/investigation-report/scripts/check-investigations.ts",
    import.meta.url
  ).href
);
if (!isInstalledInvestigationRuntime(installedRuntime)) {
  throw new Error("Installed Investigation Report runtime does not expose the expected public API");
}
const { runInvestigationReportCheckCli } = installedRuntime;

function isInstalledInvestigationRuntime(
  value: unknown
): value is Pick<
  typeof import("../../.codex/skills/investigation-report/scripts/check-investigations.d.mts"),
  "runInvestigationReportCheckCli"
> {
  return isNonArrayRecord(value) && typeof value.runInvestigationReportCheckCli === "function";
}

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

if (import.meta.main) {
  const argv = process.argv.slice(2);
  process.exitCode = await runInvestigationReportCheckCli(argv.length === 0 ? ["check"] : argv, {
    cwd: workspaceRoot
  });
}
