import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { runProcessSync } from "../../process-execution/execution.ts";
import { benchmarkRoot, fixedLizard124Commit } from "./benchmark-context.ts";
import { gitAt } from "./benchmark-identity.ts";
import { parseJson } from "./evidence-shapes.ts";

export interface FixedLizard124 {
  readonly cleanup: () => void;
  readonly command: (
    driver: string,
    warmupArguments: readonly string[],
    requestPath: string
  ) => string[];
  readonly identity: Readonly<Record<string, unknown>>;
}

export function provisionFixedLizard124(source: string): FixedLizard124 {
  if (gitAt(source, "rev-parse", "HEAD") !== fixedLizard124Commit) {
    throw new Error(`--lizard124-source must be upstream commit ${fixedLizard124Commit}`);
  }
  const environment = mkdtempSync(resolve(tmpdir(), "vibe-check-lizard-1.24-"));
  const executable = resolve(environment, "bin/python");
  try {
    provisionEnvironment(environment, executable);
    const rawProbe = fixedLizardProvisionProbe(source, executable);
    return fixedLizardEnvironment(source, environment, executable, rawProbe);
  } catch (error) {
    rmSync(environment, { force: true, recursive: true });
    throw error;
  }
}

function provisionEnvironment(environment: string, executable: string): void {
  requireSuccess(
    runProcessSync({
      args: ["venv", "--no-project", "--python", "python3", environment],
      command: "uv",
      cwd: benchmarkRoot
    }),
    "output-local Lizard 1.24 Python venv provision"
  );
  requireSuccess(
    runProcessSync({
      args: ["pip", "install", "--python", executable, "--no-deps", "Pygments==2.18.0"],
      command: "uv",
      cwd: benchmarkRoot
    }),
    "pinned Pygments provision"
  );
}

function fixedLizardProvisionProbe(source: string, executable: string): unknown {
  const probe = requireSuccess(
    runProcessSync({
      args: [
        `PYTHONPATH=${source}`,
        executable,
        "-c",
        "import hashlib,importlib.metadata,json,lizard,pygments,sys; from lizard_ext.version import version as lizard_version; d=importlib.metadata.distribution('Pygments'); record=next(f for f in d.files or [] if str(f).endswith('.dist-info/RECORD')); print(json.dumps({'lizardModule':lizard.__file__,'lizardVersion':lizard_version,'pygmentsVersion':pygments.__version__,'pygmentsRecordSha256':hashlib.sha256(d.locate_file(record).read_bytes()).hexdigest(),'pythonExecutable':sys.executable,'pythonVersion':sys.version}))"
      ],
      command: "env",
      cwd: benchmarkRoot
    }),
    "fixed Lizard 1.24 provision probe"
  );
  return parseJson(probe.stdout, "fixed Lizard 1.24 provision probe");
}

function fixedLizardEnvironment(
  source: string,
  environment: string,
  executable: string,
  rawProbe: unknown
): FixedLizard124 {
  const identity = Object.freeze({
    lizardSourceCommit: fixedLizard124Commit,
    lizardSourcePathAtFormation: source,
    provisionedPythonPathAtFormation: executable,
    pygments: rawProbe,
    runtimeDisposition:
      "ephemeral task-owned venv was provisioned before samples and deleted after this B layer; it is not a retained reproduction resource.",
    uvVersion: runProcessSync({
      args: ["--version"],
      command: "uv",
      cwd: benchmarkRoot
    }).stdout.trim()
  });
  return Object.freeze({
    cleanup: () => rmSync(environment, { force: true, recursive: true }),
    command: (driver: string, warmupArguments: readonly string[], requestPath: string) => [
      "env",
      `PYTHONPATH=${source}`,
      executable,
      driver,
      ...warmupArguments,
      requestPath
    ],
    identity
  });
}

function requireSuccess(
  result: ReturnType<typeof runProcessSync>,
  label: string
): ReturnType<typeof runProcessSync> {
  if (result.status !== 0) throw new Error(`${label} failed: ${result.stderr || result.stdout}`);
  return result;
}
