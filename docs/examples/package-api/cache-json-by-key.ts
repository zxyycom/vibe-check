import { rmSync } from "node:fs";

// 验收拥有本例的独占目录；模块成功或抛错时都回收，不进入教学投影。
using _fixtureCleanup = {
  [Symbol.dispose]() {
    rmSync(directory, { force: true, recursive: true });
  }
};

// #region package-api-example:cache-json-by-key
import { cacheJsonByKey } from "@zxyycom/vibe-check";

const directory = `/tmp/my-project-vibe-check-cache-${Date.now()}-${Math.random()}`;
let measurements = 0;
const options = {
  compute: () => ({ bytes: ++measurements * 1024 }),
  directory,
  key: "bundle-input:source-v3:tool-v1",
  namespace: "my-project.bundle-size",
  parse(value: unknown): { readonly bytes: number } {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      typeof (value as { bytes?: unknown }).bytes !== "number"
    ) {
      throw new TypeError("Invalid bundle-size cache payload");
    }
    return value as { readonly bytes: number };
  },
  version: "1"
};
const first = await cacheJsonByKey(options);
const second = await cacheJsonByKey(options);
if (first.source !== "computed" || second.source !== "cache" || measurements !== 1) {
  throw new Error("Expected one computation followed by a cache hit");
}
// 两条路径都返回 parser 接受的 value；业务代码直接消费它。
const bundleBytes = second.value.bytes;
if (first.value.bytes !== 1024 || bundleBytes !== 1024) {
  throw new Error("Expected the computed and cached bundle sizes to agree");
}
// #endregion package-api-example:cache-json-by-key
