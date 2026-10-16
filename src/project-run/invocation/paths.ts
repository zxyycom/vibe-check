import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";

import type { DiagnosticChannel } from "../diagnostic-logging/logger.ts";
import type { DiagnosticLogFileNaming } from "../controls/contract.ts";

import type { ProjectOutputs } from "../../project-definition/project-definition.ts";

/**
 * Invocation owner 的 absolute paths；刻意排除 caller-owned cross-Run state、cache storage 和
 * external-tool workspace。
 */
export type ResolvedInvocationPaths = Readonly<{
  /** Check-local absolute directories；保持私有，避免披露 sibling capability。 */
  readonly checkArtifactDirectories: ResolvedCheckArtifactDirectoryIndex;
  /** caller 选择的 Check-owned invocation artifact absolute base；未配置时为 `null`。 */
  readonly checkArtifactBaseDirectory: string | null;
  /** 按 owner channel 分开的 diagnostic absolute targets。 */
  readonly diagnosticLoggingFiles: Readonly<Record<DiagnosticChannel, string | null>>;
  /** 按既有 RunResult-relative contract 投影的 diagnostic channel files。 */
  readonly diagnosticLoggingReadbackFiles: Readonly<Record<DiagnosticChannel, string | null>>;
  /** 本次 invocation 的 machine publisher absolute target。 */
  readonly machinePublicationDirectory: string;
  /** caller 为本 Run 指定的 progress transcript target；不设置则只保留 terminal。 */
  readonly progressLogFile: string | null;
  /** 每个 callback 共享的 absolute effective project root。 */
  readonly projectRoot: string;
}>;

/** 在任何 author callback 前恰好一次解析全部 Product-owned invocation target。 */
export function resolveInvocationPaths(
  input: Readonly<{
    readonly checkArtifactBaseDirectory: string | undefined;
    readonly checkIds: readonly string[];
    readonly diagnosticLogFileNaming: DiagnosticLogFileNaming;
    readonly diagnosticLogSuffix: string | undefined;
    readonly outputConfiguration: ProjectOutputs;
    readonly progressLogFile: string | undefined;
    readonly projectRoot: string;
  }>
): ResolvedInvocationPaths {
  const projectRoot = resolve(input.projectRoot);
  const checkArtifactBaseDirectory =
    input.checkArtifactBaseDirectory === undefined
      ? null
      : resolve(projectRoot, input.checkArtifactBaseDirectory);
  const diagnosticDirectory = resolve(
    projectRoot,
    input.outputConfiguration.diagnosticLogging.directory
  );
  const diagnosticLoggingFiles = diagnosticFilesFor({
    diagnosticDirectory,
    diagnosticLogFileNaming: input.diagnosticLogFileNaming,
    diagnosticLogSuffix: input.diagnosticLogSuffix
  });
  const machinePublicationDirectory = resolve(
    projectRoot,
    input.outputConfiguration.machinePublication.directory
  );

  return Object.freeze({
    checkArtifactDirectories: resolveCheckArtifactDirectories(
      checkArtifactBaseDirectory,
      input.checkIds
    ),
    checkArtifactBaseDirectory,
    diagnosticLoggingFiles,
    diagnosticLoggingReadbackFiles: diagnosticReadbackFiles(projectRoot, diagnosticLoggingFiles),
    machinePublicationDirectory,
    progressLogFile:
      input.progressLogFile === undefined ? null : resolve(projectRoot, input.progressLogFile),
    projectRoot
  });
}

function diagnosticFilesFor(
  input: Readonly<{
    readonly diagnosticDirectory: string;
    readonly diagnosticLogFileNaming: DiagnosticLogFileNaming;
    readonly diagnosticLogSuffix: string | undefined;
  }>
): Readonly<Record<DiagnosticChannel, string | null>> {
  const file = (channel: DiagnosticChannel): string | null => {
    if (input.diagnosticLogSuffix === undefined) return null;
    const basename =
      input.diagnosticLogFileNaming === "channel"
        ? `${channel}.log`
        : `${channel}-${input.diagnosticLogSuffix}.log`;
    return join(input.diagnosticDirectory, basename);
  };
  return Object.freeze({
    core: file("core"),
    scheduler: file("scheduler")
  });
}

function diagnosticReadbackFiles(
  projectRoot: string,
  files: Readonly<Record<DiagnosticChannel, string | null>>
): Readonly<Record<DiagnosticChannel, string | null>> {
  const readback = (channel: DiagnosticChannel): string | null => {
    const file = files[channel];
    return file === null ? null : relative(projectRoot, file);
  };
  return Object.freeze({
    core: readback("core"),
    scheduler: readback("scheduler")
  });
}

type ResolvedCheckArtifactDirectoryIndex = Readonly<{
  readonly get: (checkId: string) => string | undefined;
}>;

/** 只返回当前 Check-local artifact directory，不向 callback 暴露 sibling directories。 */
export function artifactDirectoryForCheck(
  paths: ResolvedInvocationPaths,
  checkId: string
): string | null {
  return paths.checkArtifactDirectories.get(checkId) ?? null;
}

function resolveCheckArtifactDirectories(
  checkArtifactBaseDirectory: string | null,
  checkIds: readonly string[]
): ResolvedCheckArtifactDirectoryIndex {
  let directories: Map<string, string> | undefined;
  let checkIdByEncodedDirectory: Map<string, string> | undefined;
  return Object.freeze({
    get(checkId: string): string | undefined {
      if (checkArtifactBaseDirectory === null || !checkIds.includes(checkId)) return undefined;
      const existing = directories?.get(checkId);
      if (existing !== undefined) return existing;
      const encodedDirectory = encodeCheckArtifactDirectory(checkId);
      const priorCheckId = checkIdByEncodedDirectory?.get(encodedDirectory);
      if (priorCheckId !== undefined && priorCheckId !== checkId) {
        throw new Error("Distinct Check IDs resolved to one artifact directory");
      }
      directories ??= new Map();
      checkIdByEncodedDirectory ??= new Map();
      checkIdByEncodedDirectory.set(encodedDirectory, checkId);
      const directory = join(checkArtifactBaseDirectory, encodedDirectory);
      directories.set(checkId, directory);
      return directory;
    }
  });
}

/**
 * SHA-256 base64url component 不包含分隔符或 traversal token，且远低于常规 filesystem component length。
 * raw Check ID 仍由既有 facts 保存。
 */
function encodeCheckArtifactDirectory(checkId: string): string {
  return `check-${createHash("sha256").update(checkId, "utf8").digest("base64url")}`;
}
