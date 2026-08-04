import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { DEFAULT_CONFIG } from "./config.ts";

export interface CommandResult {
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

export function runBun(
  repoRoot: string,
  args: readonly string[],
  environment: Readonly<Record<string, string>> = {}
): CommandResult {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...environment }
  });

  assert.equal(result.error, undefined);
  return {
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout
  };
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function assertCommandSucceeded(result: CommandResult, label: string): void {
  assert.equal(
    result.status,
    0,
    `${label} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

export function writeFixtureFile(
  rootDir: string,
  relativePath: string,
  content: string
): void {
  const filePath = join(rootDir, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}

export function initializeRepository(repository: string): void {
  mkdirSync(repository, { recursive: true });
  git(repository, ["init", "--quiet"]);
  git(repository, ["config", "user.email", "quality-test@example.invalid"]);
  git(repository, ["config", "user.name", "Quality Test"]);
}

export function commitAll(repository: string, message: string): void {
  git(repository, ["add", "."]);
  git(repository, ["commit", "--quiet", "-m", message]);
}

export function git(repository: string, args: readonly string[]): string {
  const result = spawnSync("git", args, {
    cwd: repository,
    encoding: "utf8"
  });
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
  return result.stdout.trim();
}

export function assertInvalidGateForms(repoRoot: string): void {
  const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-invalid-gate-"));
  const markerPath = join(projectRoot, "scanner-started");
  const artifactDir = join(projectRoot, "artifacts/should-not-exist");
  const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as Record<string, unknown>;
  const scannerPath = join(projectRoot, "scanner.ts");
  const cases: ReadonlyArray<{
    args: readonly string[];
    expectedError: RegExp;
    label: string;
  }> = [
    { args: ["--gate"], expectedError: /--gate/i, label: "missing value" },
    {
      args: ["--gate", "all", "--gate", "changed"],
      expectedError: /--gate/i,
      label: "repeated option"
    },
    { args: ["--gate", "everything"], expectedError: /--gate/i, label: "unknown value" },
    {
      args: ["--profile", "quick", "--gate", "changed"],
      expectedError: /--gate changed.*--profile full/i,
      label: "quick comparison conflict"
    },
    {
      args: ["--gate", "regressions", "--skip-baseline"],
      expectedError: /--gate regressions.*--skip-baseline.*--baseline <revision>/i,
      label: "comparison baseline skip conflict"
    },
    {
      args: ["--gate", "changed"],
      expectedError: /--gate changed.*--baseline <revision>/i,
      label: "changed gate missing explicit baseline"
    },
    {
      args: ["--gate", "regressions"],
      expectedError: /--gate regressions.*--baseline <revision>/i,
      label: "regressions gate missing explicit baseline"
    },
    {
      args: ["--gate", "regressions", "--baseline", "HEAD", "--skip-baseline"],
      expectedError: /--baseline.*--skip-baseline.*cannot be combined/i,
      label: "contradictory baseline options"
    },
    {
      args: ["--with-baseline"],
      expectedError: /--with-baseline.*removed.*--baseline <revision>/i,
      label: "retired baseline option"
    },
    {
      args: ["--gate", "regressions", "--baseline", "missing-revision"],
      expectedError: /--baseline.*locally available commit/i,
      label: "invalid explicit baseline revision"
    }
  ];

  try {
    writeFixtureFile(projectRoot, "src/input.ts", "export const input = true;\n");
    writeFileSync(
      scannerPath,
      `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(markerPath)}, "started");\n`,
      "utf8"
    );
    config.artifactDir = "artifacts/should-not-exist";
    config.tools = {
      jscpd: { args: [scannerPath], command: process.execPath },
      lizard: { args: [scannerPath], command: process.execPath },
      scc: { args: [scannerPath], command: process.execPath }
    };
    writeFileSync(
      join(projectRoot, "vibe-check.config.json"),
      JSON.stringify(config),
      "utf8"
    );

    for (const testCase of cases) {
      const result = runBun(repoRoot, [
        "run", "--silent", "product:cli", "--", "scan", projectRoot,
        "--config", "vibe-check.config.json", ...testCase.args
      ]);

      assert.equal(
        result.status,
        3,
        `${testCase.label}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      );
      assert.equal(result.stdout, "", testCase.label);
      assert.match(result.stderr, /Fatal error in quality scan:/i);
      assert.match(result.stderr, testCase.expectedError, testCase.label);
      assert.equal(existsSync(markerPath), false, testCase.label);
      assert.equal(existsSync(artifactDir), false, testCase.label);
    }
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
}
