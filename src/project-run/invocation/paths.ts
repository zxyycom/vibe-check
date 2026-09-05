import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";

import type { DiagnosticChannel } from "../diagnostic-logging/logger.ts";

import type { ProjectOutputs } from "../../project-definition/project-definition.ts";

/**
 * Invocation owner 的 absolute paths；刻意排除 caller-owned cross-Run state、cache storage 和
 * external-tool workspace。
 */
export type ResolvedInvocationPaths = Readonly<{
  /** Check-local absolute directories；保持私有，避免披露 sibling capability。 */
  readonly checkArtifactDirectories: readonly ResolvedCheckArtifactDirectory[];
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
    readonly diagnosticLogSuffix: string | undefined;
    readonly learnedAdmissionEnabled: boolean;
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
    diagnosticLogSuffix: input.diagnosticLogSuffix,
    learnedAdmissionEnabled: input.learnedAdmissionEnabled
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
    readonly diagnosticLogSuffix: string | undefined;
    readonly learnedAdmissionEnabled: boolean;
  }>
): Readonly<Record<DiagnosticChannel, string | null>> {
  const file = (channel: DiagnosticChannel): string | null =>
    input.diagnosticLogSuffix === undefined ||
    (channel === "learnedAdmission" && !input.learnedAdmissionEnabled)
      ? null
      : join(
          input.diagnosticDirectory,
          diagnosticLogFileNameForChannel(channel, input.diagnosticLogSuffix)
        );
  return Object.freeze({
    core: file("core"),
    learnedAdmission: file("learnedAdmission"),
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
    learnedAdmission: readback("learnedAdmission"),
    scheduler: readback("scheduler")
  });
}

type ResolvedCheckArtifactDirectory = Readonly<{
  readonly checkId: string;
  readonly directory: string;
}>;

/** 只返回当前 Check-local artifact directory，不向 callback 暴露 sibling directories。 */
export function artifactDirectoryForCheck(
  paths: ResolvedInvocationPaths,
  checkId: string
): string | null {
  return (
    paths.checkArtifactDirectories.find((entry) => entry.checkId === checkId)?.directory ?? null
  );
}

function resolveCheckArtifactDirectories(
  checkArtifactBaseDirectory: string | null,
  checkIds: readonly string[]
): readonly ResolvedCheckArtifactDirectory[] {
  if (checkArtifactBaseDirectory === null) return Object.freeze([]);

  const directories: ResolvedCheckArtifactDirectory[] = [];
  const checkIdByEncodedDirectory = new Map<string, string>();
  for (const checkId of checkIds) {
    const encodedDirectory = encodeCheckArtifactDirectory(checkId);
    const priorCheckId = checkIdByEncodedDirectory.get(encodedDirectory);
    if (priorCheckId !== undefined && priorCheckId !== checkId) {
      throw new Error("Distinct Check IDs resolved to one artifact directory");
    }
    checkIdByEncodedDirectory.set(encodedDirectory, checkId);
    directories.push(
      Object.freeze({ checkId, directory: join(checkArtifactBaseDirectory, encodedDirectory) })
    );
  }
  return Object.freeze(directories);
}

/**
 * SHA-256 base64url component 不包含分隔符或 traversal token，且远低于常规 filesystem component length。
 * raw Check ID 仍由既有 facts 保存。
 */
function encodeCheckArtifactDirectory(checkId: string): string {
  return `check-${createHash("sha256").update(checkId, "utf8").digest("base64url")}`;
}

function diagnosticLogFileNameForChannel(channel: DiagnosticChannel, suffix: string): string {
  switch (channel) {
    case "core":
      return `core-${suffix}.log`;
    case "scheduler":
      return `scheduler-${suffix}.log`;
    case "learnedAdmission":
      return `learned-admission-${suffix}.log`;
  }
}
