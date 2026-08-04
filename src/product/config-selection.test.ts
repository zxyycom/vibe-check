import { strict as assert } from "node:assert";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  loadSemanticProjectConfig,
  ProjectConfigError
} from "./config-file.ts";
import { createConfigInitCandidates } from "./config-init.ts";
import { resolveProjectConfigPaths } from "./config-paths.ts";
import { resolveQualityConfig } from "./config-resolution.ts";
import {
  ProjectConfigRequiredError,
  selectProjectConfig
} from "./config-selection.ts";
import { DEFAULT_CONFIG, NeutralProjectConfig } from "./config.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("repository configuration policy", () => {
  it("validates the migrated repository policy and generated anonymous schema", async () => {
    const paths = resolveProjectConfigPaths(repoRoot);
    const semanticConfig = await loadSemanticProjectConfig(paths.configPath);
    const resolvedConfig = resolveQualityConfig(semanticConfig);
    const generatedSchema = createConfigInitCandidates().schemaBytes;
    const sourceDocument = JSON.parse(
      await readFile(paths.configPath, "utf8")
    ) as Record<string, unknown>;

    assert.equal(sourceDocument.$schema, "./config.schema.json");
    assert.notDeepEqual(resolvedConfig, DEFAULT_CONFIG);
    assert.equal(resolvedConfig.artifactDir, "artifacts/vibe-check-quality");
    assert.deepEqual(resolvedConfig.include, [
      "src/product/**/*.ts",
      "scripts/docs/**/*.ts",
      "scripts/quality/**/*.ts",
      "scripts/tools/*.ts",
      "scripts/tools/validators/**/*.ts",
      "scripts/vibe-check-workspace/**/*.ts",
      "docs/**/*.md",
      "openspec/**/*.md"
    ]);
    assert.deepEqual(Object.keys(resolvedConfig.codeAreas), [
      "docs-specs",
      "generated",
      "product-source",
      "schemas-examples",
      "script-tooling"
    ]);
    assert.deepEqual(await readFile(paths.schemaPath), generatedSchema);
  });
});

describe("project configuration selection", () => {
  it("selects explicit over discovered policy and applies CLI overrides after validation", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "vibe-check-selection-"));
    const paths = resolveProjectConfigPaths(projectRoot);
    const explicitPath = join(projectRoot, "config", "explicit.json");

    try {
      await writeConfig(paths.configPath, { artifactDir: "artifacts/discovered" });
      await writeConfig(explicitPath, {
        artifactDir: "artifacts/explicit",
        report: { ...NeutralProjectConfig.report, topN: 7 }
      });

      const selected = await selectProjectConfig({
        cliOverrides: { artifactDir: "artifacts/cli", topN: 3 },
        explicitConfigFile: "config/../config/explicit.json",
        gateRequested: true,
        projectRoot
      });

      assert.deepEqual(selected, {
        config: resolveQualityConfig(NeutralProjectConfig, {
          artifactDir: "artifacts/cli",
          topN: 3
        }),
        path: explicitPath,
        source: "explicit"
      });
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });

  it("discovers only the fixed path and uses the neutral default only for an absent ungated candidate", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "vibe-check-selection-"));
    const paths = resolveProjectConfigPaths(projectRoot);

    try {
      await writeConfig(join(projectRoot, "vibe-check.config.json"), {
        artifactDir: "artifacts/not-discovered"
      });
      const defaultSelection = await selectProjectConfig({
        cliOverrides: {},
        explicitConfigFile: null,
        gateRequested: false,
        projectRoot
      });
      assert.deepEqual(defaultSelection, {
        config: resolveQualityConfig(NeutralProjectConfig),
        source: "default"
      });

      await writeConfig(paths.configPath, {
        artifactDir: "artifacts/discovered"
      });
      const discoveredSelection = await selectProjectConfig({
        cliOverrides: {},
        explicitConfigFile: null,
        gateRequested: false,
        projectRoot
      });
      assert.equal(discoveredSelection.source, "discovered");
      assert.equal(discoveredSelection.path, paths.configPath);
      assert.equal(
        discoveredSelection.config.artifactDir,
        "artifacts/discovered"
      );
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });

  it("requires a file-backed policy for every gate and reports both recovery paths", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "vibe-check-selection-"));
    const candidatePath = resolveProjectConfigPaths(projectRoot).configPath;

    try {
      await assert.rejects(
        selectProjectConfig({
          cliOverrides: {},
          explicitConfigFile: null,
          gateRequested: true,
          projectRoot
        }),
        (error: unknown) => {
          assert.ok(error instanceof ProjectConfigRequiredError);
          assert.equal(error.configPath, candidatePath);
          assert.match(error.message, /init/);
          assert.match(error.message, /--config/);
          return true;
        }
      );
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });

  it("keeps selected file and candidate inspection errors terminal", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "vibe-check-selection-"));
    const paths = resolveProjectConfigPaths(projectRoot);
    const explicitPath = join(projectRoot, "missing-explicit.json");

    try {
      await writeConfig(paths.configPath, {});
      const selectedFailures = [
        {
          explicitConfigFile: explicitPath,
          path: explicitPath,
          reason: "explicit document is invalid",
          source: "explicit"
        },
        {
          explicitConfigFile: null,
          path: paths.configPath,
          reason: "discovered document is invalid",
          source: "discovered"
        }
      ] as const;

      for (const selectedFailure of selectedFailures) {
        const failure = new Error(selectedFailure.reason);
        await assert.rejects(
          selectProjectConfig(
            {
              cliOverrides: {},
              explicitConfigFile: selectedFailure.explicitConfigFile,
              gateRequested: false,
              projectRoot
            },
            {
              load: async (path) => {
                assert.equal(path, selectedFailure.path);
                throw new ProjectConfigError(path, failure);
              }
            }
          ),
          (error: unknown) => {
            assert.ok(error instanceof ProjectConfigError);
            assert.equal(error.code, "invalid-project-config");
            assert.equal(error.configPath, selectedFailure.path);
            assert.equal(error.cause, failure);
            assert.match(
              error.message,
              new RegExp(`selected ${selectedFailure.source} config`)
            );
            assert.match(error.message, new RegExp(selectedFailure.reason));
            return true;
          }
        );
      }

      const inspectionFailure = Object.assign(
        new Error("candidate cannot be inspected"),
        { code: "EACCES" }
      );
      await assert.rejects(
        selectProjectConfig(
          {
            cliOverrides: {},
            explicitConfigFile: null,
            gateRequested: false,
            projectRoot
          },
          { inspect: async () => Promise.reject(inspectionFailure) }
        ),
        (error: unknown) =>
          error instanceof Error &&
          error.message.includes(paths.configPath) &&
          error.cause === inspectionFailure
      );
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });
});

async function writeConfig(
  path: string,
  overrides: Record<string, unknown>
): Promise<void> {
  const document = {
    ...structuredClone(NeutralProjectConfig),
    ...overrides
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(document, null, 2)}\n`, "utf8");
}
