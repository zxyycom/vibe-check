import { resolve } from "node:path";

import { changeFlag } from "../../check/flag-enablement.ts";
import {
  snapshotClosedArray,
  snapshotExactClosedRecord
} from "../../data-boundary/closed-values.ts";
import { createProjectFileRegionIndex } from "../../data-boundary/project-file-region-index.ts";
import type { ProjectFileRegion } from "../../data-boundary/project-file-region-index.ts";
import { DEFAULT_PROJECT_FILE_EXCLUDES } from "../../package-checks/project-files/configuration.ts";
import type { ProjectFileSelection } from "../../package-checks/project-files/configuration.ts";
import { collectProjectFiles } from "../../package-checks/project-files/public-collection.ts";
import type { ProjectChangeFlagRegion } from "../../project-definition/project-changes.ts";

/** 显式指定本次调试的文件全集与当前 change regions，不发现配置或取得 Git delta。 */
export interface DebugChangeFlagsOptions {
  /** 相对 cwd 或绝对 project root；校验和普通文件收集规则与 collectProjectFiles 相同。 */
  readonly projectRoot: string;
  /** 独立于 regions 的完整收集范围；默认排除省略时启用。 */
  readonly selection: ProjectFileSelection;
  /** 至少一个非空 region ID 的闭合映射，可直接传入 Definition changes.flags。 */
  readonly regions: Readonly<Record<string, ProjectChangeFlagRegion>>;
}

/** 本次所选当前文件假如发生变更时的冻结映射快照；不是实际 Git evidence 或 Check 覆盖证明。 */
export interface ChangeFlagDebugReport {
  /** 取得文件时的实际范围；不承诺文件系统原子快照或返回后的存在性。 */
  readonly scope: Readonly<{
    readonly projectRoot: string;
    readonly patterns: readonly string[];
    readonly useDefaultExcludes: boolean;
    readonly defaultExcludes: readonly string[];
    readonly fileKind: "regular";
    readonly followSymlinks: false;
    readonly snapshot: "per-call-non-atomic";
  }>;
  /** 所选全集，包含零命中；flags 为 changeFlag(id) token，hitCount 为其数量。 */
  readonly files: readonly Readonly<{
    readonly path: string;
    readonly flags: readonly string[];
    readonly hitCount: number;
  }>[];
  /** 全部已声明区域（含空区域），按 ID 稳定排序，保留已接收的完整规则。 */
  readonly regions: readonly Readonly<{
    readonly id: string;
    readonly flag: string;
    readonly patterns: readonly string[];
    readonly files: readonly string[];
  }>[];
  /** 无 I/O；已收集零命中返回 []，合法未收集路径返回 undefined，非法路径抛 TypeError。 */
  readonly flagsForFile: (path: string) => readonly string[] | undefined;
  /** 无 I/O；接收 token 而非 author ID，已知空返回 []，未知非空 flag 返回 undefined。 */
  readonly filesForFlag: (flag: string) => readonly string[] | undefined;
}

/**
 * 同步重新收集所选普通文件，并用公共 Core 关系投影全部 change flags、数量与双向查询。
 *
 * options/regions 是 descriptor-safe closed 数据输入；非法输入同步抛 TypeError，必要磁盘访问失败
 * 沿用 collectProjectFiles 的普通 Error，不返回部分结果或把失败伪装为空。默认排除只作用于收集范围。
 * 返回值 detached 且冻结；查询可解构调用。本工具不执行 Run，不自动打印、写文件或分享。
 * @example 查看当前所选文件的完整 change flag 映射并按需呈现
 * ```ts
 * import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
 * import { tmpdir } from "node:os";
 * import { join } from "node:path";
 * import { changeFlag, debugChangeFlags, formatChangeFlagDebugReport } from "@zxyycom/vibe-check";
 *
 * const projectRoot = mkdtempSync(join(tmpdir(), "change-flags-example-"));
 * try {
 *   for (const path of ["a.ts", "b.ts", "zero.txt"]) {
 *     writeFileSync(join(projectRoot, path), "example\n");
 *   }
 *   const report = debugChangeFlags({
 *     projectRoot,
 *     selection: { patterns: ["*"] },
 *     regions: {
 *       source: { patterns: ["*.ts"] },
 *       extra: { patterns: ["a.ts"] },
 *       empty: { patterns: [] }
 *     }
 *   });
 *   if (report.files.map(({ hitCount }) => hitCount).join(",") !== "2,1,0") {
 *     throw new Error("Expected overlapping, single and zero hits in the complete selected universe");
 *   }
 *   if (report.filesForFlag(changeFlag("source"))?.join(",") !== "a.ts,b.ts" ||
 *       report.flagsForFile("zero.txt")?.length !== 0 || report.flagsForFile("outside.txt") !== undefined) {
 *     throw new Error("Expected bidirectional results and distinct unknown paths");
 *   }
 *   const text = formatChangeFlagDebugReport(report); // 返回文本，不自动输出。
 *   if (!text.includes('"zero.txt" 命中=0 flags=[]') || !Object.isFrozen(report.scope)) {
 *     throw new Error("Expected explicit presentation and immutable range metadata");
 *   }
 * } finally {
 *   rmSync(projectRoot, { recursive: true, force: true });
 * }
 * ```
 */
export function debugChangeFlags(options: DebugChangeFlagsOptions): ChangeFlagDebugReport {
  const input = snapshotExactClosedRecord(options, ["projectRoot", "selection", "regions"]);
  if (input === undefined) {
    throw new TypeError("debugChangeFlags requires exactly projectRoot, selection and regions");
  }
  const regions = snapshotRegions(input.regions);
  const rules = createProjectFileRegionIndex({ regionSources: [regions] });
  const selection = snapshotSelection(input.selection);
  // Collection owns the root and selection value validation, including filesystem failure.
  if (typeof input.projectRoot !== "string") {
    throw new TypeError("debugChangeFlags projectRoot must be a string");
  }
  const paths = collectProjectFiles({ projectRoot: input.projectRoot, selection });
  const index = rules.appendSources({ fileSources: [paths] });
  const files = Object.freeze(
    index.filePaths.map((path) => {
      const ids = index.regionsForFile(path);
      if (ids === undefined)
        throw new Error(`Core omitted collected path: ${JSON.stringify(path)}`);
      const flags = Object.freeze(ids.map(changeFlag));
      return Object.freeze({ path, flags, hitCount: flags.length });
    })
  );
  const filesByPath = new Map(files.map((file) => [file.path, file.flags]));
  const patternsById = new Map(regions.map((region) => [region.id, region.patterns]));
  const reportRegions = Object.freeze(
    index.regionIds.map((id) => {
      const patterns = patternsById.get(id);
      const regionFiles = index.filesForRegion(id);
      if (patterns === undefined || regionFiles === undefined) {
        throw new Error(`Core omitted declared region: ${JSON.stringify(id)}`);
      }
      return Object.freeze({ id, flag: changeFlag(id), patterns, files: regionFiles });
    })
  );
  const filesByFlag = new Map<string, readonly string[]>(
    reportRegions.map((region) => [region.flag, region.files])
  );
  const useDefaultExcludes = selection.useDefaultExcludes ?? true;
  return Object.freeze({
    scope: Object.freeze({
      projectRoot: resolve(input.projectRoot),
      patterns: selection.patterns,
      useDefaultExcludes,
      defaultExcludes: useDefaultExcludes ? DEFAULT_PROJECT_FILE_EXCLUDES : Object.freeze([]),
      fileKind: "regular",
      followSymlinks: false,
      snapshot: "per-call-non-atomic"
    }),
    files,
    regions: reportRegions,
    flagsForFile: (path: string) => {
      // Keep illegal-path validation and known/unknown identity in the Core owner.
      index.regionsForFile(path);
      return filesByPath.get(path);
    },
    filesForFlag: (flag: string) => {
      if (typeof flag !== "string" || flag.length === 0) {
        throw new TypeError("filesForFlag requires a non-empty flag string");
      }
      return filesByFlag.get(flag);
    }
  });
}

function snapshotSelection(value: unknown): ProjectFileSelection {
  const selection =
    snapshotExactClosedRecord(value, ["patterns"]) ??
    snapshotExactClosedRecord(value, ["patterns", "useDefaultExcludes"]);
  const patterns = snapshotClosedArray(selection?.patterns);
  if (selection === undefined || patterns === undefined) {
    throw new TypeError(
      "debugChangeFlags selection requires patterns and optional useDefaultExcludes"
    );
  }
  if (!patterns.every((pattern): pattern is string => typeof pattern === "string")) {
    throw new TypeError("debugChangeFlags selection patterns must be strings");
  }
  if (!Object.hasOwn(selection, "useDefaultExcludes")) return Object.freeze({ patterns });
  if (typeof selection.useDefaultExcludes !== "boolean") {
    throw new TypeError("debugChangeFlags useDefaultExcludes must be boolean when present");
  }
  return Object.freeze({ patterns, useDefaultExcludes: selection.useDefaultExcludes });
}

function snapshotRegions(
  value: unknown
): readonly Extract<ProjectFileRegion, { kind: "patterns" }>[] {
  let regions: Readonly<Record<string, unknown>> | undefined;
  try {
    if (value !== null && typeof value === "object") {
      regions = snapshotExactClosedRecord(value, Object.getOwnPropertyNames(value));
    }
  } catch {
    // Reflective Proxy failure is an invalid input, not a successful empty mapping.
  }
  if (regions === undefined || Object.keys(regions).length === 0) {
    throw new TypeError("debugChangeFlags regions requires a non-empty closed region mapping");
  }
  return Object.freeze(
    Object.entries(regions).map(([id, regionValue]) => {
      const region = snapshotExactClosedRecord(regionValue, ["patterns"]);
      const patterns = snapshotClosedArray(region?.patterns);
      if (region === undefined || patterns === undefined) {
        throw new TypeError(
          `debugChangeFlags region ${JSON.stringify(id)} requires exactly patterns`
        );
      }
      if (!patterns.every((pattern): pattern is string => typeof pattern === "string")) {
        throw new TypeError(
          `debugChangeFlags region ${JSON.stringify(id)} patterns must be strings`
        );
      }
      // Core owns nonempty ID/pattern semantics; this adapter only establishes field types.
      return Object.freeze({ id, kind: "patterns" as const, patterns });
    })
  );
}

/**
 * 按需将 debugChangeFlags 的报告呈现为中文文本；只读取该冻结结果，不做 I/O 或自动输出。
 * 字符串以 JSON 转义呈现，包含 scope、零命中文件与空区域；文本不是稳定机器协议。
 */
export function formatChangeFlagDebugReport(report: ChangeFlagDebugReport): string {
  return [
    "Change flag 调试（当前所选文件，不是实际 Git evidence 或 Check 覆盖证明）",
    `范围: ${JSON.stringify(report.scope)}`,
    `文件: ${report.files.length}`,
    ...report.files.map(
      ({ path, flags, hitCount }) =>
        `${JSON.stringify(path)} 命中=${hitCount} flags=${JSON.stringify(flags)}`
    ),
    `区域: ${report.regions.length}`,
    ...report.regions.map(
      ({ id, flag, patterns, files }) =>
        `${JSON.stringify(id)} flag=${JSON.stringify(flag)} patterns=${JSON.stringify(patterns)} files=${JSON.stringify(files)}`
    )
  ].join("\n");
}
