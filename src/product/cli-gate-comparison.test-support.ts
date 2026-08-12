import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  createFixtureProject,
  type FixtureProject
} from "./cli-gate-acceptance.test-support.ts";

export function createComparisonFixture(
  fixtureRoot: string,
  label: string
): FixtureProject {
  const fixture = createFixtureProject(fixtureRoot, label);
  initializeRepository(fixture.projectRoot);
  commitAll(fixture.projectRoot, "baseline fixture");
  const baselineSha = git(fixture.projectRoot, ["rev-parse", "HEAD"]);
  git(fixture.projectRoot, ["branch", "baseline-ref", baselineSha]);
  return fixture;
}

export function commitChangedInput(projectRoot: string): void {
  appendFixtureSource(
    projectRoot,
    "export const changedWithoutMetricDelta = true;"
  );
  commitPaths(
    projectRoot,
    ["src/eligible.ts"],
    "change input without changing controlled metrics"
  );
}

export function commitMetricRegression(projectRoot: string): void {
  appendFixtureSource(
    projectRoot,
    "export const changedWithMetricRegression = true;"
  );
  increaseControlledMetrics(projectRoot);
  commitPaths(
    projectRoot,
    ["src/eligible.ts", "tools/controlled-scanner.ts"],
    "increase controlled metrics"
  );
}

function initializeRepository(repository: string): void {
  git(repository, ["init", "--quiet"]);
  git(repository, ["config", "user.email", "quality-test@example.invalid"]);
  git(repository, ["config", "user.name", "Quality Test"]);
}

function commitAll(repository: string, message: string): void {
  git(repository, ["add", "."]);
  git(repository, ["commit", "--quiet", "-m", message]);
}

function commitPaths(
  repository: string,
  paths: readonly string[],
  message: string
): void {
  git(repository, ["add", ...paths]);
  git(repository, ["commit", "--quiet", "-m", message]);
}

function git(repository: string, args: readonly string[]): string {
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

function appendFixtureSource(projectRoot: string, line: string): void {
  const path = join(projectRoot, "src", "eligible.ts");
  const source = readFileSync(path, "utf8");
  writeFileSync(path, `${source.trimEnd()}\n${line}\n`, "utf8");
}

function increaseControlledMetrics(projectRoot: string): void {
  const path = join(projectRoot, "tools", "controlled-scanner.ts");
  const source = readFileSync(path, "utf8");
  const updated = source
    .replace(
      "eligible.ts,12,10,1,1,6,200,10",
      "eligible.ts,24,20,1,3,12,400,20"
    )
    .replace(
      "12,4,30,1,12,fixture",
      "24,8,60,1,24,fixture"
    );
  assert.notEqual(updated, source);
  writeFileSync(path, updated, "utf8");
}
