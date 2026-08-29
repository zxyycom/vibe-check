import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { errorMessage } from "../error-message.ts";
import { reportProcessOutput, runCommand } from "../process-execution/command.ts";
import {
  inspectPackageCandidate,
  preparePackageCandidate,
  type PackageCandidateStatus
} from "./candidate/prepare.ts";

const PACKAGE_COMMANDS = ["status", "build", "verify"] as const;
type PackageCommand = (typeof PACKAGE_COMMANDS)[number];
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const projectGatePath = resolve(repositoryRoot, "scripts/project/gate/run.ts");

export const FULL_PACKAGE_ACCEPTANCE_INVOCATION = Object.freeze({
  args: Object.freeze(["exec", "--", "bun", projectGatePath, "--profile", "full"]),
  command: "mise"
});

interface PackageCommandSteps {
  readonly inspect: () => PackageCandidateStatus;
  readonly prepare: typeof preparePackageCandidate;
  readonly report: (line: string) => void;
  readonly verify: () => Promise<number>;
}

const defaultSteps: PackageCommandSteps = Object.freeze({
  inspect: inspectPackageCandidate,
  prepare: preparePackageCandidate,
  report: (line: string) => console.log(line),
  verify: runFullPackageAcceptance
});

function runFullPackageAcceptance(): Promise<number> {
  runCommand(FULL_PACKAGE_ACCEPTANCE_INVOCATION.command, FULL_PACKAGE_ACCEPTANCE_INVOCATION.args, {
    cwd: repositoryRoot,
    report: reportProcessOutput
  });
  return Promise.resolve(0);
}

function parsePackageCommand(argv: readonly string[]): PackageCommand {
  const [command] = argv;
  if (argv.length !== 1 || !isPackageCommand(command)) {
    throw new Error("usage: bun scripts/package/command.ts <status|build|verify>");
  }
  return command;
}

function isPackageCommand(value: string | undefined): value is PackageCommand {
  return value !== undefined && PACKAGE_COMMANDS.some((command) => command === value);
}

/** Runs a root package lifecycle command with no ambient artifact fallback. */
export async function runPackageCommand(
  argv: readonly string[],
  stepOverrides: Partial<PackageCommandSteps> = {}
): Promise<number> {
  const steps: PackageCommandSteps = Object.freeze({ ...defaultSteps, ...stepOverrides });
  switch (parsePackageCommand(argv)) {
    case "status": {
      const status = steps.inspect();
      reportPackageStatus(status, steps.report);
      return status.freshness === "current" ? 0 : 1;
    }
    case "build": {
      const candidate = await steps.prepare();
      reportPackageBuild(candidate, steps.report);
      return 0;
    }
    case "verify":
      // The full Gate owns package lifecycle, artifact, and external-consumer acceptance.
      return steps.verify();
  }
}

function reportPackageStatus(status: PackageCandidateStatus, report: (line: string) => void): void {
  const installedEntry = status.installedEntryPath ?? "unavailable (run package:build)";
  report(`package candidate version: ${status.candidateVersion}`);
  report(`package freshness: ${status.freshness}`);
  if (status.requiredAction !== undefined) {
    report(
      `package required preparation: ${status.requiredAction.action} (${status.requiredAction.reason})`
    );
  }
  report(`package unpacked path: ${status.unpackedPackagePath}`);
  report(`package tarball path: ${status.tarballPath}`);
  report(`package installed entry: ${installedEntry}`);
}

function reportPackageBuild(
  candidate: Awaited<ReturnType<typeof preparePackageCandidate>>,
  report: (line: string) => void
): void {
  report(`package candidate version: ${candidate.candidateVersion}`);
  report("package state: current");
  report(
    `package preparation action: ${candidate.preparationAction} (${candidate.preparationReason})`
  );
  report(`package unpacked path: ${candidate.stagingDirectory}`);
  report(`package tarball path: ${candidate.artifactPath}`);
  report(`package installed entry: ${candidate.resolvedEntryPath}`);
}

if (import.meta.main) {
  try {
    process.exitCode = await runPackageCommand(process.argv.slice(2));
  } catch (error: unknown) {
    console.error(`package command failed: ${errorMessage(error)}`);
    process.exitCode = 1;
  }
}
