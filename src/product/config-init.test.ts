import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { AnySchema } from "ajv";

import {
  createConfigInitCandidates,
  initializeProjectConfig,
  ProjectConfigInitError
} from "./config-init.ts";
import { loadSemanticProjectConfig } from "./config-file.ts";
import { NeutralProjectConfig } from "./config.ts";
import {
  CONFIG_SCHEMA_REFERENCE,
  resolveProjectConfigPaths
} from "./config-paths.ts";
import { parseConfigDocument } from "./config-validation.ts";

const CONFIG_SHA256 =
  "93bb299a33e4e012904875c06529b9295197144217a13d9224e37dc30dc97c15";
const SCHEMA_SHA256 =
  "22570bae3cb5464ef1892940eea2817cf0084dcfa272e3c623c1d8ecd4eba97c";

describe("project configuration initialization", () => {
  it("generates deterministic commented config and an anonymous editor schema", () => {
    const first = createConfigInitCandidates();
    const second = createConfigInitCandidates();

    assert.deepEqual(first, second);
    assert.notStrictEqual(first.configBytes, second.configBytes);
    assert.notStrictEqual(first.schemaBytes, second.schemaBytes);

    const configSource = decodeUtf8(first.configBytes);
    const schemaSource = decodeUtf8(first.schemaBytes);
    assert.equal(configSource.endsWith("\n"), true);
    assert.equal(schemaSource.endsWith("\n"), true);
    assert.doesNotMatch(configSource, /\r/);
    assert.doesNotMatch(schemaSource, /\r/);
    assert.equal(sha256(first.configBytes), CONFIG_SHA256);
    assert.equal(sha256(first.schemaBytes), SCHEMA_SHA256);
    assert.equal(
      configSource.match(/^\s*\/\//gm)?.length,
      4,
      "only the four product-owned section comments are emitted"
    );

    const document = parseVibeCheckJson(configSource);
    const schema = JSON.parse(schemaSource) as Record<string, unknown>;
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(Object.hasOwn(schema, "$id"), false);
    assert.equal(
      (document as Record<string, unknown>).$schema,
      CONFIG_SCHEMA_REFERENCE
    );
    assert.deepEqual(parseConfigDocument(document), NeutralProjectConfig);

    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(
      schema as AnySchema
    );
    assert.equal(validate(document), true, JSON.stringify(validate.errors));
  });

  it("creates a complete discovery-ready file set in a new project", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-init-new-"));

    try {
      const expectedPaths = resolveProjectConfigPaths(projectRoot);
      const candidates = createConfigInitCandidates();
      const result = initializeProjectConfig(projectRoot);

      assert.deepEqual(result, {
        configPath: expectedPaths.configPath,
        schemaPath: expectedPaths.schemaPath,
        state: "discovery-ready"
      });
      assert.deepEqual(readFileSync(result.configPath), candidates.configBytes);
      assert.deepEqual(readFileSync(result.schemaPath), candidates.schemaBytes);
      assert.deepEqual(
        await loadSemanticProjectConfig(result.configPath),
        NeutralProjectConfig
      );
    } finally {
      rmSync(projectRoot, { force: true, recursive: true });
    }
  });

  it("reuses a normal tool directory without changing sibling entries", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-init-reuse-"));
    const paths = resolveProjectConfigPaths(projectRoot);
    const siblingPath = join(paths.directoryPath, "owner-note.txt");

    try {
      mkdirSync(paths.directoryPath);
      writeFileSync(siblingPath, "project-owned\n", "utf8");

      const result = initializeProjectConfig(projectRoot);

      assert.equal(result.state, "discovery-ready");
      assert.equal(readFileSync(siblingPath, "utf8"), "project-owned\n");
      assert.deepEqual(
        readdirSync(paths.directoryPath).sort(),
        ["config.json", "config.schema.json", "owner-note.txt"]
      );
    } finally {
      rmSync(projectRoot, { force: true, recursive: true });
    }
  });

  it("keeps existing regular targets byte-for-byte and creates only missing targets", () => {
    const candidates = createConfigInitCandidates();
    const cases = [
      {
        arrange(paths: ReturnType<typeof resolveProjectConfigPaths>): void {
          writeFileSync(paths.configPath, "existing-config-not-json\n", "utf8");
          writeFileSync(paths.schemaPath, "existing-schema-not-json\n", "utf8");
        },
        expectedConfig: Buffer.from("existing-config-not-json\n"),
        expectedSchema: Buffer.from("existing-schema-not-json\n"),
        expectedCreated: [],
        label: "both targets already exist"
      },
      {
        arrange(paths: ReturnType<typeof resolveProjectConfigPaths>): void {
          writeFileSync(paths.configPath, "existing-config-not-json\n", "utf8");
        },
        expectedConfig: Buffer.from("existing-config-not-json\n"),
        expectedSchema: candidates.schemaBytes,
        expectedCreated: ["schema"],
        label: "schema is missing"
      },
      {
        arrange(paths: ReturnType<typeof resolveProjectConfigPaths>): void {
          writeFileSync(paths.schemaPath, "existing-schema-not-json\n", "utf8");
        },
        expectedConfig: candidates.configBytes,
        expectedSchema: Buffer.from("existing-schema-not-json\n"),
        expectedCreated: ["config"],
        label: "config is missing"
      }
    ] as const;

    for (const testCase of cases) {
      const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-init-target-"));
      const paths = resolveProjectConfigPaths(projectRoot);
      try {
        mkdirSync(paths.directoryPath);
        testCase.arrange(paths);
        const created: string[] = [];

        const result = initializeProjectConfig(projectRoot, {
          openExclusive(path) {
            created.push(path === paths.configPath ? "config" : "schema");
            return openSync(path, "wx");
          }
        });

        assert.equal(result.state, "discovery-ready", testCase.label);
        assert.deepEqual(created, testCase.expectedCreated, testCase.label);
        assert.deepEqual(
          readFileSync(paths.configPath),
          testCase.expectedConfig,
          testCase.label
        );
        assert.deepEqual(
          readFileSync(paths.schemaPath),
          testCase.expectedSchema,
          testCase.label
        );
      } finally {
        rmSync(projectRoot, { force: true, recursive: true });
      }
    }
  });

  it("preserves an exclusive-create race while removing owned partial files", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-init-race-"));
    const paths = resolveProjectConfigPaths(projectRoot);

    try {
      mkdirSync(paths.directoryPath);

      assertInitFailure(() =>
        initializeProjectConfig(projectRoot, {
          openExclusive(path) {
            if (path === paths.schemaPath) {
              writeFileSync(path, "concurrent-schema\n", { flag: "wx" });
            }
            return openSync(path, "wx");
          }
        })
      );

      assert.equal(existsSync(paths.configPath), false);
      assert.equal(readFileSync(paths.schemaPath, "utf8"), "concurrent-schema\n");
    } finally {
      rmSync(projectRoot, { force: true, recursive: true });
    }
  });

  it("cleans only invocation-owned files and removes an owned directory only when empty", () => {
    const emptyProject = mkdtempSync(join(tmpdir(), "vibe-check-init-clean-empty-"));
    const occupiedProject = mkdtempSync(
      join(tmpdir(), "vibe-check-init-clean-occupied-")
    );
    const preexistingProject = mkdtempSync(
      join(tmpdir(), "vibe-check-init-clean-preexisting-")
    );

    try {
      const emptyPaths = resolveProjectConfigPaths(emptyProject);
      assertInitFailure(() =>
        initializeProjectConfig(emptyProject, {
          write() {
            throw new Error("controlled first write failure");
          }
        })
      );
      assert.equal(existsSync(emptyPaths.directoryPath), false);

      const occupiedPaths = resolveProjectConfigPaths(occupiedProject);
      const concurrentPath = join(occupiedPaths.directoryPath, "concurrent-owner.txt");
      let writes = 0;
      let cleanupStarted = false;
      assertInitFailure(() =>
        initializeProjectConfig(occupiedProject, {
          removeFile(path) {
            unlinkSync(path);
            if (!cleanupStarted) {
              cleanupStarted = true;
              writeFileSync(concurrentPath, "keep\n", "utf8");
            }
          },
          write(fileDescriptor, bytes) {
            writes += 1;
            if (writes === 2) {
              throw new Error("controlled second write failure");
            }
            writeFileSync(fileDescriptor, bytes);
          }
        })
      );
      assert.equal(readFileSync(concurrentPath, "utf8"), "keep\n");
      assert.equal(existsSync(occupiedPaths.configPath), false);
      assert.equal(existsSync(occupiedPaths.schemaPath), false);

      const preexistingPaths = resolveProjectConfigPaths(preexistingProject);
      mkdirSync(preexistingPaths.directoryPath);
      writeFileSync(preexistingPaths.configPath, "preexisting-config\n", "utf8");
      assertInitFailure(() =>
        initializeProjectConfig(preexistingProject, {
          write() {
            throw new Error("controlled missing-schema write failure");
          }
        })
      );
      assert.equal(
        readFileSync(preexistingPaths.configPath, "utf8"),
        "preexisting-config\n"
      );
      assert.equal(existsSync(preexistingPaths.schemaPath), false);
    } finally {
      rmSync(emptyProject, { force: true, recursive: true });
      rmSync(occupiedProject, { force: true, recursive: true });
      rmSync(preexistingProject, { force: true, recursive: true });
    }
  });

  it("rejects invalid roots, a symlinked tool directory, and non-regular targets", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-init-invalid-"));
    const fileRoot = join(tempDir, "not-a-directory");
    const missingRoot = join(tempDir, "missing");
    const projectRoot = join(tempDir, "project");
    const externalDirectory = join(tempDir, "external-tool-directory");
    const paths = resolveProjectConfigPaths(projectRoot);
    const targetProject = join(tempDir, "target-project");
    const targetPaths = resolveProjectConfigPaths(targetProject);
    const externalFile = join(tempDir, "external-config.json");

    try {
      writeFileSync(fileRoot, "file\n", "utf8");
      mkdirSync(projectRoot);
      mkdirSync(externalDirectory);
      symlinkSync(externalDirectory, paths.directoryPath, "dir");

      assertInitFailure(() => initializeProjectConfig(fileRoot));
      assertInitFailure(() => initializeProjectConfig(missingRoot));
      assertInitFailure(() => initializeProjectConfig(projectRoot));
      assert.deepEqual(readdirSync(externalDirectory), []);
      assert.equal(existsSync(paths.configPath), false);
      assert.equal(existsSync(paths.schemaPath), false);

      mkdirSync(targetProject);
      mkdirSync(targetPaths.directoryPath);
      writeFileSync(externalFile, "external\n", "utf8");
      symlinkSync(externalFile, targetPaths.configPath, "file");
      assertInitFailure(() => initializeProjectConfig(targetProject));
      assert.equal(readFileSync(externalFile, "utf8"), "external\n");
      assert.equal(existsSync(targetPaths.schemaPath), false);

      unlinkSync(targetPaths.configPath);
      mkdirSync(targetPaths.configPath);
      assertInitFailure(() => initializeProjectConfig(targetProject));
      assert.equal(existsSync(targetPaths.schemaPath), false);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});

function assertInitFailure(action: () => unknown): ProjectConfigInitError {
  try {
    action();
  } catch (error: unknown) {
    assert.ok(error instanceof ProjectConfigInitError);
    assert.match(error.message, /initialize project config/i);
    assert.doesNotMatch(error.message, /failed to load config/i);
    return error;
  }
  assert.fail("expected project config initialization to fail");
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function parseVibeCheckJson(source: string): unknown {
  const bun = globalThis as typeof globalThis & {
    readonly Bun: {
      readonly JSONC: {
        parse(input: string): unknown;
      };
    };
  };
  return bun.Bun.JSONC.parse(source);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
