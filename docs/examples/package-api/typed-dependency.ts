// #region package-api-example:typed-dependency
import { defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const CHANGED_FILES_DATA_VERSION = 1 as const;

type ChangedFilesData = Readonly<{
  readonly files: readonly string[];
  readonly version: typeof CHANGED_FILES_DATA_VERSION;
}>;

const changedFiles = defineCheck({
  checkId: "changed-files",
  displayName: "Changed files",
  // `true` 是唯一的 runtime declaration；返回值的 handoff 类型由 execution 自动推断。
  handoff: true,
  parseData(data): ChangedFilesData {
    if (
      data.version !== CHANGED_FILES_DATA_VERSION ||
      !Array.isArray(data.files) ||
      !data.files.every((value): value is string => typeof value === "string")
    ) {
      throw new TypeError("Unsupported changed-files data");
    }
    return { files: data.files, version: data.version };
  },
  execution() {
    const bytesByPath = new Map<string, Uint8Array>([
      ["src/index.ts", new TextEncoder().encode("export {}\n")]
    ]);
    return {
      status: "passed",
      data: { files: ["src/index.ts"], version: CHANGED_FILES_DATA_VERSION },
      handoff: bytesByPath
    };
  }
});

const analyzeChangedFiles = defineCheck({
  checkId: "analyze-changed-files",
  displayName: "Analyze changed files",
  dependsOn: [changedFiles.checkId],
  execution({ dependencies }) {
    const read = dependencies.get(changedFiles);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };

    // canonical data 仍在 parser 边界；handoff 保留 same-Run reference identity。
    const data = changedFiles.parseData(read.data);
    const firstFile = data.files[0];
    const firstFileBytes = firstFile === undefined ? undefined : read.handoff.get(firstFile);
    if (firstFileBytes === undefined) {
      return { status: "unavailable", reason: { code: "changed-file-bytes-unavailable" } };
    }
    return {
      status: "passed",
      data: { analyzedByteCount: firstFileBytes.byteLength, analyzedFileCount: data.files.length }
    };
  }
});

const definition = defineConfig({
  checks: [changedFiles, analyzeChangedFiles],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
// #endregion package-api-example:typed-dependency
