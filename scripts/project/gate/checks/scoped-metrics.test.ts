import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { collectProjectFiles, defineConfig, run } from "@zxyycom/vibe-check";

import { createScopedProjectGateSelection } from "../runtime/controls.ts";
import {
  createRepositoryQualityChecks,
  PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS
} from "./repository-quality.ts";
import { scopedRepositoryQualityOptions } from "./scoped-metrics.ts";

describe("Gate scoped metrics", () => {
  it("intersects domain unions with existing metric policies and escapes literal paths", () => {
    const root = mkdtempSync(join(tmpdir(), "gate-scoped-metrics-"));
    try {
      const markdown = "src/package-checks/markdown-lint/literal[1].ts";
      const otherMarkdown = "src/package-checks/markdown-link-validation/link.ts";
      const json = "src/package-checks/json-validation/json.ts";
      const tests = "src/package-checks/markdown-lint/lint.test.ts";
      const unrelated = "src/package-checks/secret-detection/secret.ts";
      const analyzer = "src/package-checks/function-metrics/analyzer/port.ts";
      const sourcePaths = [
        markdown,
        otherMarkdown,
        json,
        tests,
        unrelated,
        analyzer,
        "src/package-checks/markdown-lint/literal1.ts",
        "scripts/unrelated.ts"
      ];
      for (const path of sourcePaths) fixtureFile(root, path, "export const value = 1;\n");
      const options = scopedRepositoryQualityOptions(
        PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS,
        createScopedProjectGateSelection([
          "product-json-tests",
          "product-markdown-tests",
          "product-function-metrics-tests"
        ]),
        root
      );
      const checks = createRepositoryQualityChecks(options, { scc: "/fixture/scc" });
      const expected = [
        json,
        otherMarkdown,
        markdown,
        "src/package-checks/markdown-lint/literal1.ts",
        tests
      ].sort();
      for (const check of [checks.duplicateDetection, checks.fileMetrics]) {
        assert.deepEqual(
          collectProjectFiles({
            projectRoot: root,
            selection: check.options.codeAreas["product-source"]!.files
          }),
          expected
        );
        assert.deepEqual(
          Object.keys(check.options.codeAreas),
          Object.keys(
            PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS[
              check.checkId === "file-metrics" ? "fileMetrics" : "duplicateDetection"
            ].codeAreas
          )
        );
      }
      assert.deepEqual(
        collectProjectFiles({
          projectRoot: root,
          selection: checks.functionMetrics.options.codeAreas["product-source"]!.files
        }),
        expected.filter((path) => path !== tests)
      );
      assert.equal(
        checks.duplicateDetection.options.codeAreas["product-source"]!.minimumTokens,
        75
      );
      assert.equal(checks.fileMetrics.options.codeAreas["product-source"]!.codeLines.maximum, 300);
      assert.equal(
        checks.functionMetrics.options.codeAreas["product-source"]!.limits.cyclomaticComplexity
          .maximum,
        10
      );
      const exact = checks.fileMetrics.options.codeAreas["product-source"]!.files;
      assert.equal(
        exact.patterns.includes(markdown),
        false,
        "brackets must be escaped, not interpreted as a glob"
      );

      const single = createRepositoryQualityChecks(
        scopedRepositoryQualityOptions(
          PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS,
          createScopedProjectGateSelection(["product-markdown-tests"]),
          root
        ),
        { scc: "/fixture/scc" }
      );
      assert.deepEqual(
        collectProjectFiles({
          projectRoot: root,
          selection: single.fileMetrics.options.codeAreas["product-source"]!.files
        }),
        expected.filter((path) => path !== json)
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps full modes and explicit metric scopes complete without an empty-scope fallback", () => {
    const root = mkdtempSync(join(tmpdir(), "gate-scoped-empty-"));
    try {
      const full = PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS;
      for (const selection of [
        undefined,
        { kind: "fast" as const },
        { kind: "changed" as const },
        { kind: "all" as const },
        { kind: "all" as const, release: true as const },
        { kind: "focused" as const, presets: ["quality" as const] }
      ]) {
        assert.equal(scopedRepositoryQualityOptions(full, selection, root), full);
      }
      fixtureFile(
        root,
        "src/package-checks/secret-detection/other.ts",
        "export const other = 1;\n"
      );
      const selection = createScopedProjectGateSelection([
        "product-markdown-tests",
        "duplicate-input"
      ]);
      const options = scopedRepositoryQualityOptions(full, selection, root);
      assert.equal(options.duplicateDetection, full.duplicateDetection);
      const checks = createRepositoryQualityChecks(options, { scc: "/fixture/scc" });
      assert.deepEqual(checks.fileMetrics.options.codeAreas["product-source"]!.files.patterns, []);
      assert.deepEqual(
        checks.functionMetrics.options.codeAreas["product-source"]!.files.patterns,
        []
      );
      assert.deepEqual(
        collectProjectFiles({
          projectRoot: root,
          selection: checks.duplicateDetection.options.codeAreas["product-source"]!.files
        }),
        ["src/package-checks/secret-detection/other.ts"]
      );
      assert.equal(
        scopedRepositoryQualityOptions(full, createScopedProjectGateSelection(["any-change"]), root)
          .fileMetrics,
        full.fileMetrics
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("retains duplicate comparison across selected domains inside the original area", async () => {
    const root = mkdtempSync(join(tmpdir(), "gate-scoped-duplicates-"));
    try {
      const first = "src/package-checks/markdown-lint/first.ts";
      const second = "src/package-checks/json-validation/second.ts";
      const unrelated = "src/package-checks/secret-detection/third.ts";
      const source = Array.from(
        { length: 30 },
        (_, i) =>
          `export function calculation${i}(value: number) { return value * ${i + 1} + ${i + 2}; }`
      ).join("\n");
      for (const path of [first, second, unrelated]) fixtureFile(root, path, source);
      const options = scopedRepositoryQualityOptions(
        PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS,
        createScopedProjectGateSelection(["product-markdown-tests", "product-json-tests"]),
        root
      );
      const check = createRepositoryQualityChecks(options, {
        scc: "/fixture/scc"
      }).duplicateDetection;
      const result = await run(defineConfig({ checks: [check] }), {
        projectRoot: root,
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        }
      });
      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") throw new Error("Expected completed duplicate scan");
      assert.equal(result.snapshot.checks[0]?.outcome.status, "failed");
      const records = JSON.stringify(result.snapshot.records);
      assert.ok(records.includes(first));
      assert.ok(records.includes(second));
      assert.equal(records.includes(unrelated), false);
      assert.ok(records.includes("product-source"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function fixtureFile(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}
