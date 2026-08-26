import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";

import { validateRepositoryLayout } from "./layout-characterization.ts";

const PRODUCT_OWNERS = [
  "checks",
  "contract",
  "core",
  "definition",
  "foundation",
  "output",
  "project-files",
  "run",
  "scheduler"
];

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
      expected: "unapproved-index: src/definition/index.ts",
      mutate: (root) => writeSource(root, "src/definition/index.ts", "export {};\n")
    },
    {
      expected: "generic-basename: scripts/validation/model.test.ts (model)",
      mutate: (root) => writeSource(root, "scripts/validation/model.test.ts", "export {};\n")
    },
    {
      expected:
        "product-imports-scripts: src/definition/illegal.ts -> ../../scripts/foundation/path.ts",
      mutate: (root) =>
        writeSource(
          root,
          "src/definition/illegal.ts",
          'import { toSlashPath } from "../../scripts/foundation/path.ts";\nvoid toSlashPath;\n'
        )
    },
    {
      expected:
        "project-deep-imports-product: scripts/project/quality/illegal.ts -> ../../../src/index.ts",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/project/quality/illegal.ts",
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
      expected: "package-artifact-entry: expected src/index.ts",
      mutate: (root) =>
        writeSource(
          root,
          "scripts/package/artifact/build.ts",
          'const entry = join(repositoryRoot, "src/definition/project-definition.ts");\nvoid entry;\n'
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
  writeSource(root, "scripts/project/quality/run.ts", "export {};\n");
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
