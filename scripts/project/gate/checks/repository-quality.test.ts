import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { describe, it } from "node:test";
import { minimatch } from "minimatch";

import {
  createRepositoryQualityChecks,
  repositoryQualityScannerCommands
} from "./repository-quality.ts";
import { PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS } from "../definition.ts";

describe("repository quality Checks", () => {
  it("uses the retained repository policy and binds only the mise-provided SCC command", () => {
    const checks = createRepositoryQualityChecks(PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS, {
      scc: "/tools/scc"
    });

    assert.deepEqual(
      [
        checks.duplicateDetection.checkId,
        checks.fileMetrics.checkId,
        checks.functionMetrics.checkId,
        checks.markdownLinkValidation.checkId
      ],
      ["duplicate-detection", "file-metrics", "function-metrics", "markdown-link-validation"]
    );
    const { duplicateDetection, fileMetrics, functionMetrics, markdownLinkValidation } = checks;
    assert.equal(
      duplicateDetection.options.codeAreas["product-source"]?.findingPolicy,
      "non-blocking"
    );
    assert.equal(fileMetrics.options.codeAreas["product-source"]?.findingPolicy, "non-blocking");
    assert.equal(markdownLinkValidation.options.findingPolicy, "non-blocking");
    assert.deepEqual(markdownLinkValidation.options.files, {
      exclude: duplicateDetection.options.codeAreas["product-source"]?.files.exclude.filter(
        (path) => !path.startsWith(analyzerPathPrefix)
      ),
      include: ["docs/**/*.md", "changes/**/*.md"],
      source: "filesystem"
    });
    assert.equal(fileMetrics.options.scanner.executable, "/tools/scc");
    assert.equal(Object.hasOwn(functionMetrics.options, "scanner"), false);
    assert.equal(
      functionMetrics.options.codeAreas["product-source"]?.findingPolicy,
      "non-blocking"
    );
    assert.equal(
      functionMetrics.options.codeAreas["script-tooling"]?.findingPolicy,
      "non-blocking"
    );
    assert.equal(duplicateDetection.options.codeAreas["script-tests"]?.minimumTokens, 100);
    assert.equal(Object.hasOwn(duplicateDetection.options.codeAreas, "docs-specs"), false);
    assert.equal(
      Object.values(duplicateDetection.options.codeAreas).some((area) =>
        selectsPath(area.files, "docs/checks/duplicate-detection.md")
      ),
      false
    );
    const duplicateSchemasExamples = duplicateDetection.options.codeAreas["schemas-examples"];
    assert.ok(duplicateSchemasExamples);
    assert.equal(
      selectsPath(
        duplicateSchemasExamples.files,
        "docs/schemas/historical/v2/vibe-check-run.schema.json"
      ),
      false
    );
    assert.equal(
      selectsPath(duplicateSchemasExamples.files, "docs/schemas/vibe-check-run.schema.json"),
      true
    );
    const schemasExamples = fileMetrics.options.codeAreas["schemas-examples"];
    assert.ok(schemasExamples);
    assert.deepEqual(schemasExamples.files.include, ["docs/schemas/**", "docs/examples/**"]);
    assert.equal(
      selectsPath(schemasExamples.files, "docs/schemas/historical/v2/vibe-check-run.schema.json"),
      false
    );
    assert.equal(
      selectsPath(
        schemasExamples.files,
        "docs/schemas/historical/v2/vibe-check-record.schema.json"
      ),
      false
    );
    assert.deepEqual(fileMetrics.options.findingWaivers, []);
    assert.equal(
      selectsPath(schemasExamples.files, "docs/schemas/vibe-check-run.schema.json"),
      true
    );
    assert.equal(
      selectsPath(schemasExamples.files, "docs/schemas/vibe-check-record.schema.json"),
      true
    );
    const productQualitySelections = {
      duplicateDetection: duplicateDetection.options.codeAreas["product-source"]?.files,
      fileMetrics: fileMetrics.options.codeAreas["product-source"]?.files,
      functionMetrics: functionMetrics.options.codeAreas["product-source"]?.files
    };
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(productQualitySelections).map(([check, files]) => [
          check,
          translatedQualityExclusions(files)
        ])
      ),
      {
        duplicateDetection: ["src/package-checks/function-metrics/analyzer/readers/plsql.ts"],
        fileMetrics: [
          "src/package-checks/function-metrics/analyzer/core.ts",
          "src/package-checks/function-metrics/analyzer/readers/erlang.ts",
          "src/package-checks/function-metrics/analyzer/readers/perl.ts",
          "src/package-checks/function-metrics/analyzer/readers/typescript.ts",
          "src/package-checks/function-metrics/analyzer/shared/clike.ts",
          "src/package-checks/function-metrics/analyzer/shared/code-reader.ts"
        ],
        functionMetrics: [
          "src/package-checks/function-metrics/analyzer/core.ts",
          "src/package-checks/function-metrics/analyzer/readers/erlang.ts",
          "src/package-checks/function-metrics/analyzer/readers/fortran.ts",
          "src/package-checks/function-metrics/analyzer/readers/java-body-states.ts",
          "src/package-checks/function-metrics/analyzer/readers/php-states.ts",
          "src/package-checks/function-metrics/analyzer/readers/php.ts",
          "src/package-checks/function-metrics/analyzer/readers/plsql.ts",
          "src/package-checks/function-metrics/analyzer/readers/python.ts",
          "src/package-checks/function-metrics/analyzer/readers/r.ts",
          "src/package-checks/function-metrics/analyzer/readers/st.ts",
          "src/package-checks/function-metrics/analyzer/readers/typescript.ts",
          "src/package-checks/function-metrics/analyzer/shared/clike.ts",
          "src/package-checks/function-metrics/analyzer/shared/code-reader.ts",
          "src/package-checks/function-metrics/analyzer/shared/js-style-regex.ts",
          "src/package-checks/function-metrics/analyzer/shared/rubylike.ts"
        ]
      }
    );
    const exceptionPaths = Object.values(productQualitySelections).flatMap((files) =>
      translatedQualityExclusions(files)
    );
    assert.equal(exceptionPaths.length, 22);
    assert.equal(new Set(exceptionPaths).size, 16);
    const provenance = readTranslatedProvenance();
    for (const path of exceptionPaths) {
      const target = provenance.targets.get(path);
      assert.ok(target, `${path} must have root provenance`);
      assert.equal(target.status, "translated", `${path} must remain translated`);
      assertProvenanceHeader(path, target, provenance.upstream);
    }
    for (const files of Object.values(productQualitySelections)) {
      assert.ok(files);
      for (const path of translatedQualityExclusions(files)) {
        assert.equal(selectsPath(files, path), false, `${path} must be excluded only here`);
      }
      for (const path of retainedProductPaths) {
        assert.equal(selectsPath(files, path), true, `${path} must remain selected`);
      }
    }
    for (const area of Object.values(fileMetrics.options.codeAreas)) {
      assert.deepEqual(area.codeLines, {
        lowDecisionTokenAllowance: {
          maximumCodeLines: 500,
          maximumDecisionTokens: 10
        },
        maximum: 300
      });
    }
    for (const area of Object.values(functionMetrics.options.codeAreas)) {
      assert.deepEqual(area.limits, {
        codeLines: {
          lowComplexityAllowance: { cyclomaticComplexityBelow: 5, maximum: 150 },
          maximum: 50
        },
        cyclomaticComplexity: { maximum: 10 },
        nestingDepth: { maximum: 7 },
        parameters: { maximum: 5 }
      });
    }
  });

  it("substitutes an unavailable absolute SCC command without a function-metrics command", () => {
    const commands = repositoryQualityScannerCommands({
      VIBE_CHECK_SCC_CMD: undefined
    });

    assert.equal(isAbsolute(commands.scc), true);
    assert.notEqual(commands.scc, "scc");
    assert.equal(Object.hasOwn(commands, "lizard"), false);

    const checks = createRepositoryQualityChecks(PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS, {
      scc: "scc"
    });
    assert.equal(isAbsolute(checks.fileMetrics.options.scanner.executable), true);
    assert.notEqual(checks.fileMetrics.options.scanner.executable, "scc");
    assert.equal(Object.hasOwn(checks.functionMetrics.options, "scanner"), false);
  });
});

function selectsPath(
  files: Readonly<{ readonly exclude: readonly string[]; readonly include: readonly string[] }>,
  path: string
): boolean {
  return (
    files.include.some((glob) => minimatch(path, glob, { dot: true })) &&
    !files.exclude.some((glob) => minimatch(path, glob, { dot: true }))
  );
}

const analyzerPathPrefix = "src/package-checks/function-metrics/analyzer/";
const retainedProductPaths = [
  "src/package-checks/function-metrics/analyzer/extensions/protocol.ts",
  "src/package-checks/function-metrics/analyzer/extensions/lizardwordcount.ts",
  "src/package-checks/function-metrics/analyzer/port-facade.ts",
  "src/package-checks/function-metrics/analyzer/new-reader.ts",
  "src/package-checks/function-metrics/analyzer-worker.ts",
  "src/package-checks/function-metrics/analyzer-worker-contract.ts",
  "src/package-checks/function-metrics/analyzer-adapter.ts",
  "src/package-checks/function-metrics/target-files.ts",
  "src/package-checks/function-metrics/measurement.ts",
  "src/package-checks/function-metrics/execution.ts",
  "src/package-checks/function-metrics/analyzer/core.test.ts"
] as const;

function translatedQualityExclusions(
  files:
    | Readonly<{ readonly exclude: readonly string[]; readonly include: readonly string[] }>
    | undefined
): readonly string[] {
  assert.ok(files);
  return files.exclude.filter((path) => path.startsWith(analyzerPathPrefix));
}

type ProvenanceEntry = Readonly<{
  readonly project?: string;
  readonly sourcePath: string;
  readonly spdx: string;
  readonly status: string;
  readonly version?: string;
}>;

type TranslatedProvenance = Readonly<{
  readonly targets: ReadonlyMap<
    string,
    Readonly<{ readonly entries: readonly ProvenanceEntry[]; readonly status: string }>
  >;
  readonly upstream: Readonly<{
    readonly project: string;
    readonly revision: string;
    readonly tag: string;
  }>;
}>;

function readTranslatedProvenance(): TranslatedProvenance {
  const provenance = JSON.parse(
    readFileSync(resolve(process.cwd(), "licenses/lizard-1.24.0-provenance.json"), "utf8")
  ) as unknown;
  assert.ok(isRecord(provenance));
  assert.ok(isRecord(provenance.upstream));
  const upstream = readUpstream(provenance.upstream);
  const entries = [
    ...unknownArray(provenance.files, "files"),
    ...unknownArray(provenance.supplementalSources, "supplementalSources")
  ];
  const targets = new Map<string, { entries: ProvenanceEntry[]; status: string }>();
  for (const entry of entries) {
    assert.ok(isRecord(entry));
    if (typeof entry.targetPath !== "string") continue;
    const targetEntry = readProvenanceEntry(entry, entry.targetPath);
    assert.equal(
      targets.get(entry.targetPath)?.status ?? targetEntry.status,
      targetEntry.status,
      `${entry.targetPath} must not mix provenance statuses`
    );
    const target = targets.get(entry.targetPath) ?? { entries: [], status: targetEntry.status };
    target.entries.push(targetEntry);
    targets.set(entry.targetPath, target);
  }
  return Object.freeze({
    targets,
    upstream
  });
}

function assertProvenanceHeader(
  targetPath: string,
  target: Readonly<{ readonly entries: readonly ProvenanceEntry[]; readonly status: string }>,
  upstream: Readonly<{ readonly project: string; readonly revision: string; readonly tag: string }>
): void {
  const source = readFileSync(resolve(process.cwd(), targetPath), "utf8");
  const closingComment = source.indexOf("*/");
  assert.ok(
    source.startsWith("/**") && closingComment >= 0,
    `${targetPath} must have a source header`
  );
  const header = source.slice(0, closingComment + 2);
  assert.ok(
    header.includes(`Derived from ${upstream.project} ${upstream.tag}.`),
    `${targetPath} must retain the upstream project and tag`
  );
  assert.ok(
    header.includes(`Upstream revision: ${upstream.revision}.`),
    `${targetPath} must retain the upstream revision`
  );
  assert.ok(
    header.includes(
      `SPDX-License-Identifier: ${[...new Set(target.entries.map((entry) => entry.spdx))].join(" AND ")}`
    ),
    `${targetPath} must retain its provenance SPDX identity`
  );
  for (const entry of target.entries) {
    assert.ok(
      header.includes(entry.sourcePath),
      `${targetPath} must retain source ${entry.sourcePath}`
    );
    if (entry.project !== undefined && entry.version !== undefined) {
      assert.ok(
        header.includes(`${entry.project} ${entry.version}`),
        `${targetPath} must retain supplemental source ${entry.project} ${entry.version}`
      );
    }
  }
}

function readUpstream(value: Readonly<Record<string, unknown>>): Readonly<{
  readonly project: string;
  readonly revision: string;
  readonly tag: string;
}> {
  if (
    typeof value.project !== "string" ||
    typeof value.revision !== "string" ||
    typeof value.tag !== "string"
  ) {
    throw new TypeError("provenance upstream must declare project, tag, and revision");
  }
  return Object.freeze({ project: value.project, revision: value.revision, tag: value.tag });
}

function readProvenanceEntry(
  value: Readonly<Record<string, unknown>>,
  targetPath: string
): ProvenanceEntry {
  if (
    typeof value.sourcePath !== "string" ||
    typeof value.spdx !== "string" ||
    typeof value.status !== "string"
  ) {
    throw new TypeError(`${targetPath} must declare sourcePath, spdx, and status`);
  }
  if (value.project !== undefined && typeof value.project !== "string") {
    throw new TypeError(`${targetPath} project must be a string`);
  }
  if (value.version !== undefined && typeof value.version !== "string") {
    throw new TypeError(`${targetPath} version must be a string`);
  }
  return Object.freeze({
    ...(typeof value.project === "string" ? { project: value.project } : {}),
    sourcePath: value.sourcePath,
    spdx: value.spdx,
    status: value.status,
    ...(typeof value.version === "string" ? { version: value.version } : {})
  });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unknownArray(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array`);
  return value as readonly unknown[];
}
