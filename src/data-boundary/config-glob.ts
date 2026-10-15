import micromatch from "micromatch";
import { isNormalizedProjectRelativePath } from "./project-path.ts";

// Preserve the pinned native parser's own failure for longer patterns.
const MAX_NATIVE_PATTERN_LENGTH = 64 * 1024;

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
  const literals = literalConfigPathSet(patterns);
  if (literals !== undefined && paths.every(isNormalizedProjectRelativePath)) {
    const available = new Set(paths);
    // Native positive lists emit the first occurrence in pattern order, not input order.
    return [...literals].filter((path) => available.has(path));
  }
  return micromatch([...paths], [...patterns], CONFIG_GLOB_OPTIONS);
}

/** Only this narrow, normalized alphabet has native exact-membership semantics. */
export function literalConfigPathSet(patterns: readonly string[]): ReadonlySet<string> | undefined {
  const allLiteralPaths = patterns.every(
    (pattern) =>
      pattern.length <= MAX_NATIVE_PATTERN_LENGTH &&
      pattern
        .split("/")
        .every((part) => /^[A-Za-z0-9_.-]+$/u.test(part) && part !== "." && part !== "..")
  );
  return allLiteralPaths ? new Set(patterns) : undefined;
}
