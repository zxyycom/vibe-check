/** Public validation and immutable snapshot boundary for one project-file selection. */

import { resolve } from "node:path";

import {
  snapshotClosedArray,
  snapshotExactClosedRecord
} from "../../data-boundary/closed-values.ts";
import { collectProjectFiles as collectTrustedProjectFiles } from "./collection.ts";
import { PROJECT_FILE_SOURCES } from "./configuration.ts";
import type { ProjectFileSelection, ProjectFileSource } from "./configuration.ts";

/** 调用方请求一次项目文件收集时必须完整提供的 root 与 selection。 */
export interface CollectProjectFilesOptions {
  /** 显式 project root；relative path 相对当前工作目录解析，不能为空或含 U+0000。 */
  readonly projectRoot: string;
  /** 完整的显式 selection；本工具不推断任何 Check 默认值。 */
  readonly selection: ProjectFileSelection;
}

type ResolvedCollectProjectFilesOptions = Readonly<{
  readonly projectRoot: string;
  readonly selection: ProjectFileSelection;
}>;

/**
 * 按一份完整的显式 selection 同步收集 project-root-relative slash paths。
 *
 * 成功结果是冻结的稳定去重排序快照，空数组表示没有匹配路径。非法参数同步抛出
 * `TypeError`；选定 filesystem 或 Git source 的收集失败继续抛出普通 `Error`，不会回退来源。
 */
export function collectProjectFiles(
  authoredOptions: CollectProjectFilesOptions
): readonly string[] {
  const options = parseOptions(authoredOptions);
  return Object.freeze([...collectTrustedProjectFiles(options.projectRoot, options.selection)]);
}

function parseOptions(value: unknown): ResolvedCollectProjectFilesOptions {
  const options = snapshotExactClosedRecord(value, ["projectRoot", "selection"]);
  if (options === undefined) {
    throw new TypeError(
      "collectProjectFiles requires an options record with exactly projectRoot and selection"
    );
  }

  const projectRoot = parseProjectRoot(options.projectRoot);
  if (projectRoot === undefined) {
    throw new TypeError(
      "collectProjectFiles projectRoot must be a non-empty string without U+0000"
    );
  }

  const selection = parseSelection(options.selection);
  if (selection === undefined) {
    throw new TypeError(
      "collectProjectFiles selection must be a complete record with source, include, and exclude"
    );
  }

  return Object.freeze({ projectRoot, selection });
}

function parseProjectRoot(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 && !value.includes("\0")
    ? resolve(value)
    : undefined;
}

function parseSelection(value: unknown): ProjectFileSelection | undefined {
  const selection = snapshotExactClosedRecord(value, ["source", "include", "exclude"]);
  if (selection === undefined) return undefined;

  const include = snapshotStringArray(selection.include);
  const exclude = snapshotStringArray(selection.exclude);
  if (include === undefined || exclude === undefined || !isProjectFileSource(selection.source)) {
    return undefined;
  }

  return Object.freeze({ exclude, include, source: selection.source });
}

function snapshotStringArray(value: unknown): readonly string[] | undefined {
  const items = snapshotClosedArray(value);
  return items !== undefined && items.every((item): item is string => typeof item === "string")
    ? Object.freeze([...items])
    : undefined;
}

function isProjectFileSource(value: unknown): value is ProjectFileSource {
  return PROJECT_FILE_SOURCES.some((source) => source === value);
}
