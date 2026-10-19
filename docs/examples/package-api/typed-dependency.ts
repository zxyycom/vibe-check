// #region package-api-example:typed-dependency
import { defineCheck, defineConfig, defineContextCallback, run } from "@zxyycom/vibe-check";

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
  execute() {
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
  execute: defineContextCallback("check.execute", {
    contextNeeds: ["dependencies"],
    callback: (_options, { dependencies }) => {
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
  })
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

// #region package-api-example:typed-dependency-audit
const auditChangedFiles = defineCheck({
  checkId: "audit-changed-files",
  displayName: "Audit changed files",
  observes: [changedFiles.checkId, analyzeChangedFiles.checkId],
  execute: defineContextCallback("check.execute", {
    contextNeeds: ["dependencies"],
    callback: (_options, { dependencies }) => {
      const observations = dependencies.list();
      const changedFilesObservation = observations.find(
        ({ checkId }) => checkId === changedFiles.checkId
      );
      if (
        changedFilesObservation === undefined ||
        (changedFilesObservation.outcome.status !== "passed" &&
          changedFilesObservation.outcome.status !== "failed")
      ) {
        return {
          status: "unavailable",
          reason: { code: "changed-files-data-unavailable" }
        };
      }

      const data = changedFiles.parseData(changedFilesObservation.outcome.data);
      return {
        status: "passed",
        data: {
          directDependencyCount: observations.length,
          changedFileCount: data.files.length
        }
      };
    }
  })
});
const audited = await run(
  defineConfig({ ...definition, checks: [changedFiles, analyzeChangedFiles, auditChangedFiles] })
);
if (audited.kind !== "completed") throw new Error(`Run did not complete: ${audited.kind}`);
// #endregion package-api-example:typed-dependency-audit

if (audited.aggregate !== "passed") {
  throw new Error("Expected the provider, consumer and audit to pass");
}
const auditOutcome = audited.snapshot.checks.find(
  ({ checkId }) => checkId === auditChangedFiles.checkId
)?.outcome;
if (
  auditOutcome?.status !== "passed" ||
  auditOutcome.data.directDependencyCount !== 2 ||
  auditOutcome.data.changedFileCount !== 1
) {
  throw new Error("Expected audit data from both direct observations");
}
