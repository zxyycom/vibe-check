import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";

import { validateRepositoryLayout } from "./layout-characterization.ts";

const PRODUCT_OWNERS = [
  "check",
  "check-settlement",
  "data-boundary",
  "finding-waivers",
  "machine-output",
  "package-checks",
  "project-definition",
  "project-run"
];
const PRIVATE_PROCESS_IMPORT = ["../process-execution", "runner.ts"].join("/");

it("characterizes repository layout and dependency boundaries", () => {
  assert.doesNotThrow(() => validateRepositoryLayout());

  const violations: readonly Readonly<{
    readonly expected: string;
    readonly mutate: (root: string) => void;
  }>[] = [
    {
      expected: "retired-source-directory: scripts/tools",
      mutate: (root) => writeSource(root, "scripts/tools/legacy.ts", "export {};\n")
    },
    {
      expected: "retired-source-directory: scripts/process-execution/process",
      mutate: (root) =>
        writeSource(root, "scripts/process-execution/process/legacy.ts", "export {};\n")
    },
    {
      expected: "retired-source-directory: scripts/validation/documentation/repository",
      mutate: (root) =>
        writeSource(root, "scripts/validation/documentation/repository/legacy.ts", "export {};\n")
    },
    {
      expected: "unapproved-index: src/project-definition/index.ts",
      mutate: (root) => writeSource(root, "src/project-definition/index.ts", "export {};\n")
    },
    {
      expected: "generic-basename: scripts/validation/model.test.ts (model)",
      mutate: (root) => writeSource(root, "scripts/validation/model.test.ts", "export {};\n")
    },
    {
      expected:
        "product-imports-scripts: src/project-definition/illegal.ts -> ../../scripts/repository-files/paths.ts",
      mutate: (root) =>
        writeSource(
          root,
          "src/project-definition/illegal.ts",
          'import { toSlashPath } from "../../scripts/repository-files/paths.ts";\nvoid toSlashPath;\n'
        )
    },
    {
      expected:
        "project-deep-imports-product: scripts/project/gate/illegal.ts -> ../../../src/index.ts",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/project/gate/illegal.ts",
          'import type { ProjectDefinition } from "../../../src/index.ts";\nexport type { ProjectDefinition };\n'
        )
    },
    {
      expected:
        "package-imports-project: scripts/package/artifact/illegal.ts -> ../../project/gate/run.ts",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/package/artifact/illegal.ts",
          'import type { GateRun } from "../../project/gate/run.ts";\nexport type { GateRun };\n'
        )
    },
    {
      expected:
        "script-deep-imports-process-execution: scripts/development/illegal.ts -> ../process-execution/runner.ts",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/development/illegal.ts",
          `import { runProcess } from ${JSON.stringify(PRIVATE_PROCESS_IMPORT)};\nvoid runProcess;\n`
        )
    },
    {
      expected:
        "environment-imports-process-execution: scripts/environment/manage.ts -> ../process-execution/execution.ts",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/environment/manage.ts",
          'import { runProcess } from "../process-execution/execution.ts";\nvoid runProcess;\n'
        )
    },
    {
      expected: "package-artifact-entry: expected src/index.ts",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/package/artifact/build.ts",
          'const entry = join(repositoryRoot, "src/project-definition/project-definition.ts");\nvoid entry;\n'
        )
    },
    {
      expected: "product-owner-directories:",
      mutate: (root) => mkdirSync(join(root, "src", "unexpected"), { recursive: true })
    }
  ];

  for (const violation of violations) {
    const root = createTargetLayout();
    try {
      violation.mutate(root);
      assert.throws(
        () => validateRepositoryLayout({ repositoryRoot: root }),
        new RegExp(escapeRegExp(violation.expected))
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  }
});

function createTargetLayout(): string {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-layout-characterization-"));
  writeSource(root, "src/index.ts", "export {};\n");
  for (const owner of PRODUCT_OWNERS) {
    writeSource(root, `src/${owner}/${owner}.ts`, "export {};\n");
  }
  writeSource(
    root,
    "scripts/package/artifact/build.ts",
    'const entry = join(repositoryRoot, "src/index.ts");\nvoid entry;\n'
  );
  writeSource(root, "scripts/project/gate/run.ts", "export {};\n");
  writeSource(root, "scripts/package/candidate/prepare.ts", "export {};\n");
  return root;
}

function writeSource(root: string, relativePath: string, source: string): void {
  const path = join(root, relativePath);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, source, "utf8");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
