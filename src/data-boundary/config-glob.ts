import micromatch from "micromatch";

/** Collection 与 Run 共用的完整原生列表匹配参数。 */
export const CONFIG_GLOB_OPTIONS = Object.freeze({
  dot: true,
  matchBase: false,
  nobrace: false,
  nocase: false,
  noext: false,
  noglobstar: false,
  posix: true,
  strictSlashes: false
});

/** 整份正/负列表由 micromatch 原生解释，不是逐条 any 匹配。 */
export function matchesConfigPatterns(candidatePath: string, patterns: readonly string[]): boolean {
  return selectConfigPaths([candidatePath], patterns).length > 0;
}

/** 按共同列表语义选择已约定的 slash paths，不改写文件名字符；空列表始终选择空集合。 */
export function selectConfigPaths(paths: readonly string[], patterns: readonly string[]): string[] {
  if (patterns.length === 0) return [];
  return micromatch([...paths], [...patterns], CONFIG_GLOB_OPTIONS);
}
