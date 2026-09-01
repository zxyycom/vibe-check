/** caller-keyed canonical JSON cache 的公开存储边界。 */
import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { isAbsolute, join } from "node:path";

import {
  canonicalizeJsonObject,
  canonicalJsonBytes,
  type CanonicalJsonObject
} from "../data-boundary/canonical-data.ts";
import { hasExactPlainRecordKeys, snapshotClosedRecord } from "../data-boundary/closed-values.ts";

const CACHE_API_VERSION = "caller-keyed-json-v1";
const CACHE_ENVELOPE_KEYS = ["cacheFormatVersion", "identityDigest", "payload"] as const;

/**
 * `cacheJsonByKey` 的 caller-owned identity、payload parser 与 computation。
 *
 * `key` 必须覆盖所有会改变 computation 结果的输入、实现、options、toolchain 与声明的外部状态；
 * 不能放入 secret 或低熵敏感值。`directory` 是调用方信任、可自行删除的本地状态空间。
 */
type NonThenable<T extends object> = T & Readonly<{ readonly then?: undefined }>;

/** Caller-keyed JSON cache 的 options。 */
export interface CacheJsonByKeyOptions<T extends object> {
  readonly compute: () => unknown;
  readonly directory: string;
  readonly key: string;
  readonly namespace: string;
  readonly parse: (value: unknown) => NonThenable<T>;
  readonly version: string;
}

/** `cacheJsonByKey` 返回的闭合 cache observation 与本次 parser value。 */
export type CacheJsonByKeyResult<T extends object> =
  | Readonly<{
      readonly read: "hit";
      readonly source: "cache";
      readonly value: T;
      readonly write: "not-attempted";
    }>
  | Readonly<{
      readonly read: "failed" | "invalid" | "miss";
      readonly source: "computed";
      readonly value: T;
      readonly write: "failed" | "stored";
    }>;

/**
 * 按 caller 提供的完整 semantic key 复用本地 canonical JSON object。
 *
 * cache hit 不会跳过或重放 Check settlement、Records、messages、duration 或 side effects。读取或写入失败
 * 只通过返回的 observation 可见；只要 `compute` 与 `parse` 成功，就仍返回本次 computation 的 value。
 * 不提供依赖发现、默认目录、lock/single-flight、TTL/LRU、cleanup、remote cache 或 tamper protection。
 */
export async function cacheJsonByKey<T extends object>(
  authoredOptions: CacheJsonByKeyOptions<T>
): Promise<CacheJsonByKeyResult<T>> {
  const options = parseOptions(authoredOptions);
  const identityDigest = cacheIdentityDigest(options);
  const targetPath = join(options.directory, `${identityDigest}.json`);
  const cached = await readCacheEntry({ identityDigest, parse: options.parse, targetPath });
  if (cached.hit) {
    return Object.freeze({
      read: "hit",
      source: "cache",
      value: cached.value,
      write: "not-attempted"
    });
  }

  const payload = canonicalizeJsonObject(await options.compute());
  if (payload === undefined) {
    throw new TypeError("cacheJsonByKey compute must return a canonical JSON object");
  }
  const value = parseSynchronously(options.parse, payload, "computed value");
  const stored = await publishCacheEntry({
    directory: options.directory,
    identityDigest,
    parse: options.parse,
    payload,
    targetPath
  });
  return Object.freeze({
    read: cached.read,
    source: "computed",
    value,
    write: stored ? "stored" : "failed"
  });
}

type ParsedOptions<T extends object> = Readonly<{
  readonly compute: () => unknown;
  readonly directory: string;
  readonly key: string;
  readonly namespace: string;
  readonly parse: (value: unknown) => T;
  readonly version: string;
}>;

function parseOptions<T extends object>(value: CacheJsonByKeyOptions<T>): ParsedOptions<T> {
  const record = snapshotClosedRecord(value);
  if (
    record === undefined ||
    !hasExactPlainRecordKeys(record, [
      "compute",
      "directory",
      "key",
      "namespace",
      "parse",
      "version"
    ])
  ) {
    throw new TypeError("cacheJsonByKey options must be a closed object");
  }
  const { compute, directory, key, namespace, parse, version } = record;
  if (typeof compute !== "function" || typeof parse !== "function") {
    throw new TypeError("cacheJsonByKey compute and parse must be functions");
  }
  if (
    typeof directory !== "string" ||
    directory.length === 0 ||
    directory.includes("\0") ||
    !isAbsolute(directory)
  ) {
    throw new TypeError(
      "cacheJsonByKey directory must be a non-empty absolute path without U+0000"
    );
  }
  if (typeof namespace !== "string" || namespace.length === 0) {
    throw new TypeError("cacheJsonByKey namespace must be a non-empty string");
  }
  if (typeof version !== "string" || version.length === 0) {
    throw new TypeError("cacheJsonByKey version must be a non-empty string");
  }
  if (typeof key !== "string" || key.length === 0) {
    throw new TypeError("cacheJsonByKey key must be a non-empty string");
  }
  const typedOptions: ParsedOptions<T> = {
    compute: value.compute,
    directory: value.directory,
    key: value.key,
    namespace: value.namespace,
    parse: value.parse,
    version: value.version
  };
  if (
    typedOptions.compute !== compute ||
    typedOptions.directory !== directory ||
    typedOptions.key !== key ||
    typedOptions.namespace !== namespace ||
    typedOptions.parse !== parse ||
    typedOptions.version !== version
  ) {
    throw new TypeError("cacheJsonByKey options changed during validation");
  }
  return Object.freeze(typedOptions);
}

function cacheIdentityDigest(options: ParsedOptions<object>): string {
  return createHash("sha256")
    .update(
      canonicalJsonBytes({
        cacheApiVersion: CACHE_API_VERSION,
        key: options.key,
        namespace: options.namespace,
        payloadVersion: options.version
      })
    )
    .digest("hex");
}

type CacheRead<T extends object> =
  | Readonly<{ readonly hit: true; readonly value: T }>
  | Readonly<{ readonly hit: false; readonly read: "failed" | "invalid" | "miss" }>;

async function readCacheEntry<T extends object>(
  input: Readonly<{
    readonly identityDigest: string;
    readonly parse: (value: unknown) => T;
    readonly targetPath: string;
  }>
): Promise<CacheRead<T>> {
  let source: string;
  try {
    source = await fs.readFile(input.targetPath, "utf8");
  } catch (error: unknown) {
    return isMissingPath(error)
      ? Object.freeze({ hit: false, read: "miss" })
      : Object.freeze({ hit: false, read: "failed" });
  }
  try {
    const envelope = parseEnvelope(JSON.parse(source), input.identityDigest);
    if (envelope === undefined) return Object.freeze({ hit: false, read: "invalid" });
    return Object.freeze({
      hit: true,
      value: parseSynchronously(input.parse, envelope.payload, "cached payload")
    });
  } catch {
    return Object.freeze({ hit: false, read: "invalid" });
  }
}

function parseEnvelope(
  value: unknown,
  identityDigest: string
): Readonly<{ readonly payload: CanonicalJsonObject }> | undefined {
  const record = snapshotClosedRecord(value);
  if (record === undefined || !hasExactPlainRecordKeys(record, CACHE_ENVELOPE_KEYS))
    return undefined;
  if (record.cacheFormatVersion !== CACHE_API_VERSION || record.identityDigest !== identityDigest) {
    return undefined;
  }
  const payload = canonicalizeJsonObject(record.payload);
  return payload === undefined ? undefined : Object.freeze({ payload });
}

function parseSynchronously<T extends object>(
  parse: (value: unknown) => T,
  payload: CanonicalJsonObject,
  subject: string
): T {
  const value = parse(payload);
  if (isThenable(value))
    throw new TypeError(`cacheJsonByKey parse must synchronously return ${subject}`);
  return value;
}

function isThenable(value: unknown): boolean {
  return (
    ((typeof value === "object" && value !== null) || typeof value === "function") &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

async function publishCacheEntry<T extends object>(
  input: Readonly<{
    readonly directory: string;
    readonly identityDigest: string;
    readonly parse: (value: unknown) => T;
    readonly payload: CanonicalJsonObject;
    readonly targetPath: string;
  }>
): Promise<boolean> {
  const temporaryPath = join(input.directory, `.vibe-check-cache-${randomUUID()}.tmp`);
  try {
    await fs.mkdir(input.directory, { recursive: true });
    await fs.writeFile(
      temporaryPath,
      JSON.stringify({
        cacheFormatVersion: CACHE_API_VERSION,
        identityDigest: input.identityDigest,
        payload: input.payload
      }),
      { encoding: "utf8", flag: "wx" }
    );
  } catch {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    return false;
  }

  try {
    await fs.rename(temporaryPath, input.targetPath);
    return true;
  } catch (error: unknown) {
    if (!isConcurrentTargetConflict(error)) return false;
    const concurrent = await readCacheEntry({
      identityDigest: input.identityDigest,
      parse: input.parse,
      targetPath: input.targetPath
    });
    return concurrent.hit;
  } finally {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

function isConcurrentTargetConflict(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "EEXIST"
  );
}

function isMissingPath(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "ENOENT"
  );
}
