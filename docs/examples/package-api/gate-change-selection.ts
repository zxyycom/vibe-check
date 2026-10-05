import { quietControls, checkStatusesFor } from "../package-api-support/gate-example-acceptance.ts";

import assert from "node:assert/strict";

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { devNull, tmpdir } from "node:os";
import { dirname, join } from "node:path";

function writeFixture(path: string, content: string) {
  const target = join(fixtureRoot, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}
function git(args: readonly string[]) {
  const environment: NodeJS.ProcessEnv = {
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_SYSTEM: devNull,
    GIT_CONFIG_GLOBAL: devNull,
    GIT_DIR: join(fixtureRoot, ".git"),
    GIT_WORK_TREE: fixtureRoot,
    GIT_INDEX_FILE: join(fixtureRoot, ".git/index"),
    GIT_TEMPLATE_DIR: join(fixtureRoot, "empty-git-template")
  };
  for (const key of ["PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP"]) {
    const value = process.env[key];
    if (value !== undefined) environment[key] = value;
  }
  const command = spawnSync(
    "git",
    ["-c", "core.hooksPath=" + join(fixtureRoot, ".git/disabled-hooks"), ...args],
    {
      cwd: fixtureRoot,
      encoding: "utf8",
      env: environment
    }
  );
  assert.equal(command.status, 0, command.stderr);
}

// #region package-api-example:gate-change-selection
import {
  all,
  any,
  changeFlag,
  defineConfig,
  run,
  jsonValidation,
  jsonSchemaValidation,
  markdownLinkValidation
} from "@zxyycom/vibe-check";

const shared = ["quality.ts", "package.json", "pnpm-lock.yaml"];
const definition = defineConfig({
  changes: {
    source: { compareWith: "HEAD" },
    flags: {
      config: { include: [...shared, "config/**/*.json"] },
      schema: {
        include: [...shared, "config/**/*.json", "schema/**/*.json"],
        exclude: ["config/scratch/**"]
      }
    }
  },
  checks: [
    jsonValidation({
      files: { include: ["config/**/*.json"] },
      enabledByFlags: { when: any(all("daily", changeFlag("config")), "force") }
    }),
    jsonSchemaValidation({
      files: {
        include: ["config/**/*.json", "schema/**/*.json"],
        exclude: ["config/scratch/**"]
      },
      schemas: [{ id: "urn:example:config", path: "schema/config.json" }],
      bindings: [
        {
          id: "app",
          instancePath: "config/app.json",
          schemaId: "urn:example:config"
        }
      ],
      enabledByFlags: { when: any(all("daily", changeFlag("schema")), "force") }
    }),
    markdownLinkValidation({
      files: { include: ["handbook/**/*.md"] },
      findingPolicy: "blocking",
      enabledByFlags: { when: any("daily", "force") }
    })
  ],
  outputs: { machinePublication: { enabled: false } }
});

async function runGate() {
  const result = await run(definition, { flags: ["daily"] });
  process.exitCode = result.kind === "completed" && result.aggregate === "passed" ? 0 : 1;
  return result;
}

if (import.meta.main) await runGate();
// #endregion package-api-example:gate-change-selection

const statuses = checkStatusesFor(definition);
const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-selection-"));
const previousDirectory = process.cwd();
const previousExitCode = process.exitCode;
try {
  writeFixture("config/app.json", '{"name":"app"}\n');
  writeFixture("handbook/index.md", "# Handbook\n\n![Image](image.png)\n");
  writeFixture("handbook/image.png", "fixture image");
  writeFixture("config/scratch/local.json", '{"name":"scratch"}\n');
  writeFixture(
    "schema/config.json",
    JSON.stringify({
      $id: "urn:example:config",
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } }
    })
  );
  writeFixture("quality.ts", "export {};\n");
  mkdirSync(join(fixtureRoot, "empty-git-template"));
  git(["init", "--quiet", "--template=" + join(fixtureRoot, "empty-git-template")]);
  git(["config", "user.name", "Documentation fixture"]);
  git(["config", "user.email", "fixture@example.invalid"]);
  git(["add", "."]);
  git(["-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "base"]);
  writeFixture("config/app.json", '{"name":"changed"}\n');
  // The projected entry intentionally uses the default caller root.
  process.chdir(fixtureRoot);
  const result = await runGate();
  assert.deepEqual(statuses(result), ["passed", "passed", "passed"]);
  assert.equal(process.exitCode, 0);
  const scenarios = [
    {
      path: "schema/config.json",
      content: '{"$id":"urn:example:config","type":"object"}',
      expected: ["not-applicable", "passed", "passed"]
    },
    {
      path: "config/scratch/local.json",
      content: '{"name":"draft changed"}',
      expected: ["passed", "not-applicable", "passed"]
    },
    { path: "handbook/image.png", expected: ["not-applicable", "not-applicable", "failed"] },
    {
      path: "quality.ts",
      content: "export const revision = 2;",
      expected: ["passed", "passed", "passed"]
    }
  ];
  for (const scenario of scenarios) {
    git(["restore", "--worktree", "--", "."]);
    if (scenario.content === undefined) rmSync(join(fixtureRoot, scenario.path));
    else writeFixture(scenario.path, scenario.content);
    assert.deepEqual(
      statuses(await run(definition, { ...quietControls, flags: ["daily"] })),
      scenario.expected,
      scenario.path
    );
  }
  git(["restore", "--worktree", "--", "."]);
  assert.deepEqual(statuses(await run(definition, { ...quietControls, flags: ["daily"] })), [
    "not-applicable",
    "not-applicable",
    "passed"
  ]);
  assert.deepEqual(statuses(await run(definition, { ...quietControls, flags: ["force"] })), [
    "passed",
    "passed",
    "passed"
  ]);
  const unavailableEvidence = defineConfig({
    ...definition,
    changes: {
      flags: definition.changes!.flags,
      source: { compareWith: "missing-fixture-revision" }
    }
  });
  assert.deepEqual(
    statuses(await run(unavailableEvidence, { ...quietControls, flags: ["daily"] })),
    ["passed", "passed", "passed"]
  );
} finally {
  process.chdir(previousDirectory);
  process.exitCode = previousExitCode;
  rmSync(fixtureRoot, { recursive: true, force: true });
}
