import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import { classifyFiles } from "../model/code-areas.ts";
import { createEmptyMetrics } from "../model/schema.ts";
import type { ResolvedQualityConfig } from "../model/schema.ts";
import { buildFingerprints, collectScanFiles } from "../input/files.ts";
import { maybeScanBaselineRevision } from "../scan-command/baseline/scan.ts";
import { collectToolMetadata } from "../scan-command/tool-metadata.ts";
import {
  TEST_QUALITY_CONFIG,
  TEST_SCANNER_DEPENDENCIES
} from "../../test/config.ts";
import type { ScannerDependencySnapshot } from "../../../scanner-dependencies.ts";
import { runCurrentRevisionScan } from "./current-revision/index.ts";
import type { ScanContext } from "./current-revision/scan-context.ts";

describe("baseline revision capability eligibility", () => {
  it("resolves an eligible baseline tool when the current revision has no input for it", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-baseline-eligibility-"));
    const repository = join(tempDir, "repository");
    const rawDir = join(tempDir, "raw");
    const cacheRootDir = join(tempDir, "cache");
    const fakeSccPath = join(tempDir, "fake-scc.ts");
    const fakeJscpdPath = join(tempDir, "fake-jscpd.ts");
    const config = baselineEligibilityConfig();
    const dependencies = baselineEligibilityDependencies(
      fakeJscpdPath,
      fakeSccPath
    );

    try {
      mkdirSync(repository, { recursive: true });
      mkdirSync(rawDir, { recursive: true });
      writeFakeJscpd(fakeJscpdPath);
      writeFakeScc(fakeSccPath);
      initializeRepository(repository);
      writeFixtureFile(repository, "docs/a.md", DUPLICATE_DOCUMENT);
      writeFixtureFile(repository, "docs/b.md", DUPLICATE_DOCUMENT);
      const baselineCommitSha = commitAll(repository, "baseline");
      rmSync(join(repository, "docs/b.md"));
      commitAll(repository, "current");

      const scanFiles = collectScanFiles(repository, config);
      const fileMap = classifyFiles(scanFiles, config.codeAreas, config.generatedFiles);
      const fingerprints = buildFingerprints(fileMap, repository);
      const context = createScanContext({
        cacheRootDir,
        config,
        dependencies,
        fingerprints,
        rawDir,
        repository
      });

      const currentResults = await withMutedConsoleLog(() =>
        runCurrentRevisionScan({
          context,
          fileMap,
          scanFiles,
          scanProfile: "full"
        })
      );

      assert.deepEqual(
        currentResults.find((result) => result.capabilityId === "duplicate-detection"),
        { capabilityId: "duplicate-detection", status: "no-input" }
      );
      assert.equal(context.toolResults.some((tool) => tool.name === "jscpd"), false);

      context.metrics.metadata.tools = collectToolMetadata(context.toolResults);
      context.metrics.baseline = {
        commitDate: null,
        commitSha: baselineCommitSha,
        metadata: {
          commitDate: null,
          commitSha: baselineCommitSha,
          commitTitle: null,
          configVersion: config.version,
          selectionReason: "explicit",
          toolMetadata: context.metrics.metadata.tools
        },
        status: "generated"
      };
      context.metrics.comparisonStatus = "compared";
      const baselineSnapshot = await withMutedConsoleLog(() =>
        maybeScanBaselineRevision({
          config,
          root: repository,
          runtime: context
        })
      );

      assert.ok(baselineSnapshot);
      assert.ok(
        baselineSnapshot.duplicateCode.length > 0,
        "baseline duplicate measurement should run for its own eligible inputs"
      );
      assert.equal(
        context.toolResults.some((tool) => tool.name === "jscpd"),
        false,
        "baseline-only resolution must not change current tool metadata"
      );
      assert.equal(
        context.metrics.metadata.tools.some((tool) => tool.name === "jscpd"),
        false
      );
      assert.equal(
        context.metrics.baseline.metadata?.toolMetadata.some(
          (tool) => tool.name === "jscpd"
        ),
        true
      );

      const cachedRun = await captureConsoleLogs(() =>
        maybeScanBaselineRevision({
          config,
          root: repository,
          runtime: context
        })
      );
      assert.ok(cachedRun.result);
      assert.deepEqual(
        cachedRun.result.duplicateCode,
        baselineSnapshot.duplicateCode
      );
      assert.ok(
        cachedRun.logs.some((message) => message.includes("Reusing baseline snapshot")),
        "the baseline snapshot cache should remain reusable"
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

const DUPLICATE_DOCUMENT = `
# Shared section

This deliberately repeated paragraph contains enough words for duplicate
detection to treat both baseline files as eligible and produce a fragment.
The baseline measurement must resolve its own component after materializing
the baseline revision instead of reusing current revision eligibility.
`;

function baselineEligibilityConfig(): ResolvedQualityConfig {
  return {
    ...TEST_QUALITY_CONFIG,
    cacheDir: ".cache/quality",
    codeAreas: {
      docs: {
        description: "Markdown documentation",
        excludeGlobs: [],
        globs: ["docs/**/*.md"],
        warningPolicy: "moderate"
      }
    },
    generatedFiles: [],
    include: ["docs/**/*.md"],
    checks: {
      ...TEST_QUALITY_CONFIG.checks,
      duplication: {
        ...TEST_QUALITY_CONFIG.checks.duplication,
        defaultMinimumTokens: 5,
        minimumTokensByCodeArea: { docs: 5 }
      }
    }
  };
}

function baselineEligibilityDependencies(
  fakeJscpdPath: string,
  fakeSccPath: string
): ScannerDependencySnapshot {
  return {
    ...TEST_SCANNER_DEPENDENCIES,
    duplication: {
      args: [fakeJscpdPath],
      availabilityArgs: [fakeJscpdPath, "--version"],
      executable: process.execPath,
      maxConcurrency: 2
    },
    file: {
      args: [fakeSccPath],
      availabilityArgs: [fakeSccPath, "--version"],
      executable: process.execPath
    }
  };
}

function writeFakeJscpd(filePath: string): void {
  writeFileSync(
    filePath,
    [
      "import { mkdirSync, readFileSync, writeFileSync } from \"node:fs\";",
      "import { resolve } from \"node:path\";",
      "if (process.argv.includes(\"--version\")) {",
      "  process.stdout.write(\"jscpd 4.0.0\\n\");",
      "} else {",
      "  const configPath = process.argv[process.argv.indexOf(\"--config\") + 1];",
      "  const outputDir = process.argv[process.argv.indexOf(\"--output\") + 1];",
      "  const config = JSON.parse(readFileSync(configPath, \"utf8\"));",
      "  mkdirSync(outputDir, { recursive: true });",
      "  writeFileSync(",
      "    resolve(outputDir, \"jscpd-report.json\"),",
      "    JSON.stringify({ duplicates: [{",
      "      lines: 3,",
      "      tokens: 12,",
      "      firstFile: { name: resolve(config.path[0]), start: 1, end: 3 },",
      "      secondFile: { name: resolve(config.path[1]), start: 1, end: 3 }",
      "    }] })",
      "  );",
      "}"
    ].join("\n"),
    "utf8"
  );
}

function createScanContext({
  cacheRootDir,
  config,
  dependencies,
  fingerprints,
  rawDir,
  repository
}: {
  cacheRootDir: string;
  config: ResolvedQualityConfig;
  dependencies: ScannerDependencySnapshot;
  fingerprints: ScanContext["fingerprints"];
  rawDir: string;
  repository: string;
}): ScanContext {
  return {
    cacheRootDir,
    changedFiles: [],
    config,
    dependencies,
    fingerprints,
    metrics: createEmptyMetrics({
      configVersion: config.version,
      commitSha: git(repository, ["rev-parse", "HEAD"]),
      repository,
      scope: {
        excludeDirs: [...config.excludeDirs],
        generatedFiles: [...config.generatedFiles],
        include: [...config.include]
      },
      tools: []
    }),
    rawDir,
    root: repository,
    toolResults: []
  };
}

function writeFakeScc(filePath: string): void {
  writeFileSync(
    filePath,
    [
      "if (process.argv.includes(\"--version\")) {",
      "  process.stdout.write(\"scc version 3.7.0\\n\");",
      "} else {",
      "  process.stdout.write(",
      "    \"Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC\\n\" +",
      "    \"Markdown,,docs/a.md,8,6,0,2,0,100,6\\n\"",
      "  );",
      "}"
    ].join("\n"),
    "utf8"
  );
}

function writeFixtureFile(rootDir: string, relativePath: string, content: string): void {
  const filePath = join(rootDir, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}

function initializeRepository(repository: string): void {
  git(repository, ["init", "--quiet"]);
  git(repository, ["config", "user.email", "quality-test@example.invalid"]);
  git(repository, ["config", "user.name", "Quality Test"]);
}

function commitAll(repository: string, message: string): string {
  git(repository, ["add", "."]);
  git(repository, ["commit", "--quiet", "-m", message]);
  return git(repository, ["rev-parse", "HEAD"]);
}

function git(repository: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repository,
    encoding: "utf8"
  }).trim();
}

async function withMutedConsoleLog<T>(callback: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  console.log = () => undefined;
  try {
    return await callback();
  } finally {
    console.log = originalLog;
  }
}

async function captureConsoleLogs<T>(
  callback: () => Promise<T>
): Promise<{ logs: string[]; result: T }> {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...values: unknown[]) => {
    logs.push(values.map(String).join(" "));
  };
  try {
    return { logs, result: await callback() };
  } finally {
    console.log = originalLog;
  }
}
