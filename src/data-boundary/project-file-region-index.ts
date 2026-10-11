import {
  hasExactPlainRecordKeys,
  snapshotClosedArray,
  snapshotClosedPolicyRecord,
  snapshotClosedRecord
} from "./closed-values.ts";
import { selectConfigPaths } from "./config-glob.ts";
import { isNormalizedProjectRelativePath } from "./project-path.ts";

/** 区域的值数据；规则匹配整个文件域，实际成员只保留来源明确给出的 files。 */
export type ProjectFileRegion =
  | Readonly<{
      /** 区域唯一身份；非空字符串（允许 U+0000），重复 ID 拒绝而不合并。 */
      readonly id: string;
      readonly kind: "patterns";
      /** 完整原生正/负 glob 列表；空数组无成员，不应用磁盘收集的默认排除。 */
      readonly patterns: readonly string[];
    }>
  | Readonly<{
      /** 已经由来源筛选的 normalized root-relative slash paths，也加入索引文件域。 */
      readonly files: readonly string[];
      /** 区域唯一身份；非空字符串（允许 U+0000），重复 ID 拒绝而不合并。 */
      readonly id: string;
      readonly kind: "members";
    }>;

/** 多份纯值来源；所有路径必须使用同一个 project root 的相对 slash 坐标。 */
export interface ProjectFileRegionSources {
  /** 多份文件路径数组；重复路径合并，文件不必存在。 */
  readonly fileSources?: readonly (readonly string[])[];
  /** 多份区域数组；ID 在全部已接收来源中唯一。 */
  readonly regionSources?: readonly (readonly ProjectFileRegion[])[];
}

/** 无 I/O 的只读双向关系快照；所有枚举和查询数组均冻结、去重并按文本顺序排列。 */
export interface ProjectFileRegionIndex {
  /** 显式文件源与实际成员文件的完整并集，包括没有所属区域的文件。 */
  readonly filePaths: readonly string[];
  /** 全部已声明区域的 ID，包括已知空区域。 */
  readonly regionIds: readonly string[];
  /** 合并新增值来源并重建独立新视图；不刷新旧来源或修改当前视图。非法输入抛 TypeError。 */
  readonly appendSources: (sources: ProjectFileRegionSources) => ProjectFileRegionIndex;
  /** 查询区域的全部文件；合法未知 ID 返回 undefined，已知空返回 []，非法 ID 抛 TypeError。 */
  readonly filesForRegion: (regionId: string) => readonly string[] | undefined;
  /** 查询文件的全部区域；合法未知路径返回 undefined，已知零命中返回 []，非法路径抛 TypeError。 */
  readonly regionsForFile: (filePath: string) => readonly string[] | undefined;
}

interface ReceivedFileRegionValues {
  readonly filePaths: readonly string[];
  readonly regions: readonly ProjectFileRegion[];
}

/**
 * 从多份文件与区域值数据构造无 I/O 的只读双向关系；省略 sources 得到空视图。
 *
 * 输入逐层执行 closed、descriptor-safe detached 校验，非法结构、路径或重复区域 ID 同步抛
 * TypeError。规则使用共同完整 patterns matcher；实际成员保留来源筛选。结果不验证文件存在性，
 * 不应用扫描默认排除，不承诺文件系统新鲜度或原子快照；来源获取与刷新由调用方负责。
 * @example 从值来源定位文件与区域并追加重建
 * ```ts
 * import { createProjectFileRegionIndex } from "@zxyycom/vibe-check";
 *
 * const index = createProjectFileRegionIndex({
 *   fileSources: [["src/a.ts", "docs/readme.md"], ["src/a.ts", "src/b.ts"]],
 *   regionSources: [[
 *     { id: "source", kind: "patterns", patterns: ["src/*.ts", "!src/ignored.ts"] },
 *     { id: "reviewed", kind: "members", files: ["src/a.ts"] },
 *     { id: "empty", kind: "members", files: [] }
 *   ]]
 * });
 *
 * if (index.regionsForFile("src/a.ts")?.join(",") !== "reviewed,source") {
 *   throw new Error("Expected overlapping regions");
 * }
 * if (index.regionsForFile("docs/readme.md")?.length !== 0 || index.filesForRegion("unknown") !== undefined) {
 *   throw new Error("Expected known empty and unknown to remain distinct");
 * }
 *
 * const next = index.appendSources({ fileSources: [["src/new.ts"]] });
 * if (next.filesForRegion("source")?.length !== 3 || next.filesForRegion("reviewed")?.length !== 1) {
 *   throw new Error("Expected rules to rebuild without expanding actual members");
 * }
 * if (index.regionsForFile("src/new.ts") !== undefined || !Object.isFrozen(next.filePaths)) {
 *   throw new Error("Expected independent immutable views");
 * }
 * ```
 */
export function createProjectFileRegionIndex(
  sources: ProjectFileRegionSources = {}
): ProjectFileRegionIndex {
  return buildFileRegionIndex(parseSources(sources));
}

function parseSources(value: unknown): ReceivedFileRegionValues {
  const sources = snapshotClosedPolicyRecord(value, {
    optional: ["fileSources", "regionSources"]
  });
  if (sources === undefined)
    throw new TypeError(
      "project file-region sources must contain only fileSources and regionSources"
    );
  const filePaths: string[] = [];
  const regions: ProjectFileRegion[] = [];
  if (Object.hasOwn(sources, "fileSources")) {
    for (const fileSource of requireArray(sources.fileSources, "fileSources")) {
      for (const path of parsePaths(fileSource, "file source")) filePaths.push(path);
    }
  }
  if (Object.hasOwn(sources, "regionSources")) {
    for (const regionSource of requireArray(sources.regionSources, "regionSources")) {
      for (const region of requireArray(regionSource, "region source")) {
        regions.push(parseRegion(region));
      }
    }
  }
  return Object.freeze({ filePaths: freezeUniqueText(filePaths), regions: Object.freeze(regions) });
}

function parseRegion(value: unknown): ProjectFileRegion {
  const region = snapshotClosedRecord(value);
  if (region === undefined) throw new TypeError("project file region must be a closed record");
  const id = requireRegionId(region.id);
  switch (region.kind) {
    case "patterns": {
      if (!hasExactPlainRecordKeys(region, ["id", "kind", "patterns"]))
        throw new TypeError(`patterns region ${id} must contain only id, kind and patterns`);
      const patterns = requireArray(region.patterns, `region ${id} patterns`).map((pattern) => {
        if (typeof pattern !== "string" || pattern.length === 0)
          throw new TypeError(`region ${id} patterns must contain non-empty strings`);
        return pattern;
      });
      return Object.freeze({ id, kind: "patterns", patterns: Object.freeze(patterns) });
    }
    case "members":
      if (!hasExactPlainRecordKeys(region, ["id", "kind", "files"]))
        throw new TypeError(`members region ${id} must contain only id, kind and files`);
      return Object.freeze({
        files: parsePaths(region.files, `region ${id} files`),
        id,
        kind: "members"
      });
    default:
      throw new TypeError(`region ${id} kind must be patterns or members`);
  }
}

function requireArray(value: unknown, label: string): readonly unknown[] {
  const array = snapshotClosedArray(value);
  if (array === undefined) throw new TypeError(`${label} must be a closed dense array`);
  return array;
}

function parsePaths(value: unknown, label: string): readonly string[] {
  return freezeUniqueText(requireArray(value, label).map(requireFilePath));
}

function requireFilePath(value: unknown): string {
  if (!isNormalizedProjectRelativePath(value))
    throw new TypeError("file path must be a normalized project-root-relative slash path");
  return value;
}

function requireRegionId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0)
    throw new TypeError("region ID must be a non-empty string");
  return value;
}

function buildFileRegionIndex(received: ReceivedFileRegionValues): ProjectFileRegionIndex {
  const regions = [...received.regions].sort((left, right) => compareText(left.id, right.id));
  const filesByRegion = new Map<string, readonly string[]>();
  const filePaths = freezeUniqueText([
    ...received.filePaths,
    ...regions.flatMap((region) => (region.kind === "members" ? region.files : []))
  ]);
  const regionsByFile = new Map<string, string[]>(filePaths.map((path) => [path, []]));
  for (const region of regions) {
    if (filesByRegion.has(region.id)) throw new TypeError(`duplicate region ID: ${region.id}`);
    const files =
      region.kind === "members"
        ? region.files
        : freezeUniqueText(selectConfigPaths(filePaths, region.patterns));
    filesByRegion.set(region.id, files);
    for (const path of files) {
      const memberships = regionsByFile.get(path);
      if (memberships === undefined)
        throw new Error("file-region membership is outside the file domain");
      memberships.push(region.id);
    }
  }
  for (const memberships of regionsByFile.values()) Object.freeze(memberships);
  const regionIds = Object.freeze(regions.map((region) => region.id));
  return Object.freeze({
    filePaths,
    regionIds,
    appendSources(sources: ProjectFileRegionSources): ProjectFileRegionIndex {
      const added = parseSources(sources);
      return buildFileRegionIndex({
        filePaths: [...filePaths, ...added.filePaths],
        regions: [...regions, ...added.regions]
      });
    },
    filesForRegion(regionId: string): readonly string[] | undefined {
      return filesByRegion.get(requireRegionId(regionId));
    },
    regionsForFile(filePath: string): readonly string[] | undefined {
      return regionsByFile.get(requireFilePath(filePath));
    }
  });
}

function freezeUniqueText(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort(compareText));
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
