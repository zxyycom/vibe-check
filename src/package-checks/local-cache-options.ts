import { isAbsolute } from "node:path";

import {
  hasExactPlainRecordKeys,
  snapshotClosedRecord,
  snapshotExactClosedRecord
} from "../data-boundary/closed-values.ts";

/** 本地缓存的封闭配置；启用时由调用方提供自己拥有、可信且可删除的绝对目录，停用时不能声明目录。 */
export type LocalCacheOptions =
  | Readonly<{ readonly enabled: false }>
  | Readonly<{ readonly enabled: true; readonly directory: string }>;

export function resolveOptionalLocalCacheOptions(value: unknown): LocalCacheOptions | undefined {
  if (value === undefined) return Object.freeze({ enabled: false as const });
  const cache = snapshotClosedRecord(value);
  if (cache === undefined) return undefined;
  if (hasExactPlainRecordKeys(cache, ["enabled"]) && cache.enabled === false)
    return Object.freeze({ enabled: false as const });
  if (
    hasExactPlainRecordKeys(cache, ["enabled", "directory"]) &&
    cache.enabled === true &&
    typeof cache.directory === "string"
  )
    return Object.freeze({ enabled: true as const, directory: cache.directory });
  return undefined;
}

export function validLocalCacheOptions(value: unknown): value is LocalCacheOptions {
  const disabled = snapshotExactClosedRecord(value, ["enabled"]);
  if (disabled?.enabled === false) return true;
  const enabled = snapshotExactClosedRecord(value, ["enabled", "directory"]);
  return (
    enabled?.enabled === true &&
    typeof enabled.directory === "string" &&
    enabled.directory.length > 0 &&
    !enabled.directory.includes("\0") &&
    isAbsolute(enabled.directory)
  );
}
