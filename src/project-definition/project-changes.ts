import {
  hasExactPlainRecordKeys,
  snapshotClosedArray,
  snapshotClosedRecord
} from "../data-boundary/closed-values.ts";

/** Project 自有的 Git comparison，用于为一次 Run 推导 change flags。 */
export interface ProjectChangeSource {
  /** 作为 comparison base 的 Git revision。 */
  readonly compareWith: string;
}

/** 一个 change flag 的 project-root-relative、exclude-first glob region。 */
export interface ProjectChangeFlagRegion {
  readonly exclude: readonly string[];
  readonly include: readonly string[];
}

/** 由 Project Definition 拥有的静态 change preparation 配置。 */
export interface ProjectChangesConfiguration {
  readonly source: ProjectChangeSource;
  /** 至少一个非空 author ID 到其匹配 region 的映射。 */
  readonly flags: Readonly<Record<string, ProjectChangeFlagRegion>>;
}

/**
 * 解析并冻结 change preparation 的 closed Definition grammar。
 * Runtime Git acquisition 与 region matching 有各自的 Run owner，不在此边界执行。
 */
export function parseProjectChangesConfiguration(
  value: unknown
): ProjectChangesConfiguration | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined || !hasExactPlainRecordKeys(data, ["flags", "source"])) return undefined;
  const source = parseSource(data.source);
  const flags = parseFlags(data.flags);
  return source === undefined || flags === undefined ? undefined : Object.freeze({ flags, source });
}

function parseSource(value: unknown): ProjectChangeSource | undefined {
  const source = snapshotClosedRecord(value);
  if (
    source === undefined ||
    !hasExactPlainRecordKeys(source, ["compareWith"]) ||
    !isGitComparisonRevision(source.compareWith)
  ) {
    return undefined;
  }
  return Object.freeze({ compareWith: source.compareWith });
}

function parseFlags(value: unknown): Readonly<Record<string, ProjectChangeFlagRegion>> | undefined {
  const flags = snapshotClosedRecord(value);
  if (flags === undefined || Object.keys(flags).length === 0) return undefined;
  const parsed: Record<string, ProjectChangeFlagRegion> = {};
  for (const [flagId, region] of Object.entries(flags)) {
    if (!isNonEmptyString(flagId)) return undefined;
    const normalizedRegion = parseRegion(region);
    if (normalizedRegion === undefined) return undefined;
    Object.defineProperty(parsed, flagId, {
      configurable: false,
      enumerable: true,
      value: normalizedRegion,
      writable: false
    });
  }
  return Object.freeze(parsed);
}

function parseRegion(value: unknown): ProjectChangeFlagRegion | undefined {
  const region = snapshotClosedRecord(value);
  if (region === undefined || !hasExactPlainRecordKeys(region, ["exclude", "include"])) {
    return undefined;
  }
  const exclude = parseStringArray(region.exclude);
  const include = parseStringArray(region.include);
  return exclude === undefined || include === undefined
    ? undefined
    : Object.freeze({ exclude, include });
}

function parseStringArray(value: unknown): readonly string[] | undefined {
  const values = snapshotClosedArray(value);
  return values === undefined || !values.every(isNonEmptyString)
    ? undefined
    : Object.freeze([...values]);
}

function isGitComparisonRevision(value: unknown): value is string {
  return isNonEmptyString(value) && !value.startsWith("-") && !value.includes("\0");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
