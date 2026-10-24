import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { workspaceRoot, type SupportedRunnerProfile } from "../profile.ts";
import { discoverBunEntities } from "./bun.ts";

const fixtureProfile: SupportedRunnerProfile = {
  schemaVersion: 1,
  id: "discovery-fixture",
  version: 1,
  bun: { sourceRoots: ["src"], include: ["**/*.test.ts"], ignore: [], supplementalFiles: [] }
};
const literalSource = [
  'import { test } from "bun:test";',
  'test("literal", () => { throw new Error("test body must not execute"); });'
];

test("discovers literal Bun entities and blocks all configured unsupported shapes", async () => {
  const root = createDiscoveryFixture();
  try {
    const sourcePath = path.join(root, "src", "example.test.ts");
    fs.writeFileSync(sourcePath, literalSource.join("\n"));
    const healthy = await discoverBunEntities({ workspaceRoot: root, profile: fixtureProfile });
    assert.deepEqual(healthy, {
      diagnostics: [],
      entities: [
        {
          entityKey: "bun|src/example.test.ts|literal",
          runner: "bun",
          target: "src/example.test.ts",
          selector: "literal",
          sourcePath: "src/example.test.ts",
          sourceRange: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 74 }
        }
      ]
    });

    fs.writeFileSync(
      sourcePath,
      [
        ...literalSource,
        'import { test as spec } from "bun:test";',
        'spec("aliased", () => {});',
        'const name = "dynamic";',
        "test(name, () => {});",
        'test.each([[1], [2]])("parameterized %i", () => {});'
      ].join("\n")
    );
    const blocked = await discoverBunEntities({ workspaceRoot: root, profile: fixtureProfile });
    assert.deepEqual(blocked.entities, []);
    assert.deepEqual(
      blocked.diagnostics.sort((left, right) => (left.line ?? 0) - (right.line ?? 0)),
      [
        unsupportedDiagnostic("bun-unsupported-alias", 3, 10),
        unsupportedDiagnostic("bun-unsupported-dynamic", 6, 1),
        unsupportedDiagnostic("bun-unsupported-parameterized", 7, 1)
      ]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("retains static and runtime closure across configured scans", async () => {
  const root = createDiscoveryFixture();
  try {
    const cases = [
      {
        source: 'if (false) test("unregistered", () => {});',
        code: "static-only",
        origin: "static"
      },
      {
        source: 'const register = test; register("wrapped", () => {});',
        code: "runtime-only",
        origin: "runner"
      }
    ];
    for (const scenario of cases) {
      fs.writeFileSync(
        path.join(root, "src", "example.test.ts"),
        [...literalSource, scenario.source].join("\n")
      );
      const result = await discoverBunEntities({ workspaceRoot: root, profile: fixtureProfile });
      assert.deepEqual(
        result.entities.map(({ entityKey }) => entityKey),
        ["bun|src/example.test.ts|literal"]
      );
      assert.equal(result.diagnostics.length, 1);
      assert.equal(result.diagnostics[0]?.code, scenario.code);
      assert.equal(result.diagnostics[0]?.origin, scenario.origin);
      assert.equal(result.diagnostics[0]?.blocking, true);
    }
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

function createDiscoveryFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vibe-check-bun-discovery-"));
  try {
    fs.mkdirSync(path.join(root, "src"));
    fs.mkdirSync(path.join(root, "scripts", "test-evidence"), { recursive: true });
    fs.mkdirSync(path.join(root, "node_modules"));
    fs.symlinkSync(
      path.join(workspaceRoot, "scripts", "test-evidence", "ast-grep"),
      path.join(root, "scripts", "test-evidence", "ast-grep"),
      "dir"
    );
    fs.symlinkSync(
      path.join(workspaceRoot, "node_modules", "@ast-grep"),
      path.join(root, "node_modules", "@ast-grep"),
      "dir"
    );
    return root;
  } catch (error) {
    fs.rmSync(root, { force: true, recursive: true });
    throw error;
  }
}

function unsupportedDiagnostic(ruleId: string, line: number, column: number) {
  return {
    code: "unsupported-entity-shape",
    origin: "static",
    severity: "error",
    blocking: true,
    message: `bun source uses unsupported test entity shape ${ruleId}`,
    path: "src/example.test.ts",
    line,
    column,
    runner: "bun"
  };
}
