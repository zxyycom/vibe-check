# 缓存计算结果

`cacheJsonByKey(...)` 是 package 预提供的可选工具：当 custom Check 或普通项目代码已经能生成**完整的 semantic key**时，
调用它复用 caller-owned 的本地 canonical JSON 计算结果。调用完成后，调用方可按自己的 Check 或项目流程继续处理该结果。

## 最小用法

```ts
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
```

## key、payload 与结果

调用方提供 absolute、信任且可删除的 `directory`、非空 `namespace`、payload `version`、opaque
`key`、同步 `parse` 与同步/异步 `compute`。`key` 必须覆盖所有会改变 computation 结果的输入、
实现版本、options、toolchain 与声明的外部状态；helper 不判断 key 是否完整。

helper 对固定 API version、namespace、version 和 key 的 canonical structure 计算 SHA-256 identity，
只以 digest 命名 entry。raw key 不进入文件名、envelope、result 或 helper-owned diagnostics。磁盘 entry
在 closed envelope、identity、canonical object payload 与同步 parser 都成功前不可信；只有全部通过才是 hit。
miss、invalid payload 或 read failure 后，helper 恰好调用一次 `compute`，并让 computed payload 经过相同的
detached canonical-object/parser boundary。

返回的冻结 result envelope 表示本次 helper 调用，而非 Check 结算：hit 为
`{ value: T, source: "cache", read: "hit", write: "not-attempted" }`；computed 为
`{ value: T, source: "computed", read: "miss" | "invalid" | "failed", write: "stored" | "failed" }`。
`value` 是同步 parser 返回的 domain value，类型 `T` 由 parser 推断；调用方从中读取计算结果，而不是从 observation 字段恢复 payload。
读取已有缓存时，parser 拒绝 payload 会使本次读取成为 `invalid`，随后重新计算；`compute` 失败或 parser 拒绝新计算的 payload 则直接传播，且不写 entry。
storage failure 不改变已接受的 computed value，也不自动创建 Check message、Record 或 terminal status。parser owner 决定是否进一步冻结它返回的 domain value。

## 并发与安全边界

写入在 caller directory 内经 unique temporary file 和 atomic rename 发布。并发 miss 可以重复 computation，
但 target 只作为完整有效 entry 读取。需要避免重复 computation 时由调用方协调并发；缓存目录的清理也由调用方负责。

directory 是 caller 信任且可删除的本地 state，不提供 containment、remote sharing、authenticity 或 secret
protection；不得将 secret、token 或低熵敏感材料放入 key，SHA-256 digest 也不是保密机制。consumer 自己
决定是否把 `read` / `write` observation 转换为 Check 事实。

## 缓存测量而非判决示例

你写了一个检查 `dist/app.js` gzip 大小的 Check。相同文件反复压缩有成本，但大小阈值仍应按本次规则判断。

用 `cacheJsonByKey` 保存自己计算的大小，而不是上次的通过结论。下面每次都读取当前文件，用同一份 bytes 生成 key 并计算；调用步骤见[运行约定](building-project-gate.md#运行专题片段)：

```ts
import { defineContextCallback } from "@zxyycom/vibe-check";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { cacheJsonByKey, defineCheck, defineConfig } from "@zxyycom/vibe-check";

function parseMeasurement(value: unknown): { compressedBytes: number } {
  if (
    value === null ||
    typeof value !== "object" ||
    !("compressedBytes" in value) ||
    typeof value.compressedBytes !== "number" ||
    !Number.isSafeInteger(value.compressedBytes) ||
    value.compressedBytes < 0
  )
    throw new TypeError("Invalid gzip measurement");
  return { compressedBytes: value.compressedBytes };
}

const gzipSize = defineCheck({
  checkId: "gzip-size",
  displayName: "Gzip size",
  options: { maximumBytes: 100_000 },
  execute: defineContextCallback("check.execute", {
    contextNeeds: ["project"],
    callback: async (
      options: { readonly maximumBytes: number },
      { project }
    ) => {
      const source = await readFile(resolve(project.root, "dist/app.js"));
      const level = 9;
      const key = JSON.stringify({
        sourceHash: createHash("sha256").update(source).digest("hex"),
        measurementRevision: "gzip-size-v1",
        level,
        nodeVersion: process.versions.node,
        zlibVersion: process.versions.zlib ?? null,
        bunVersion: process.versions.bun ?? null
      });
      const cached = await cacheJsonByKey({
        directory: resolve(project.root, ".cache/quality/gzip-size"),
        namespace: "my-project.gzip-size",
        version: "1",
        key,
        parse: parseMeasurement,
        compute: () => ({ compressedBytes: gzipSync(source, { level }).byteLength })
      });
      const maximumBytes = options.maximumBytes;
      const data = {
        compressedBytes: cached.value.compressedBytes,
        maximumBytes,
        cacheSource: cached.source
      };
      return data.compressedBytes <= maximumBytes
        ? { status: "passed", data }
        : { status: "failed", data };
    }
  })
});

const definition = defineConfig({
  checks: [gzipSize],
  outputs: { machinePublication: { enabled: false } }
});
```

运行前需有 `dist/app.js`。这里读取已生成产物；构建本身如何增量复用是另一项任务，不由这个 key 覆盖。

写自己的缓存时，分清三件事：

| 部分 | 本例如何定义 |
| --- | --- |
| 哪些变化必须重算？ | key 包含文件内容摘要、计算实现版本、压缩参数与运行时/压缩库版本；计算读取其它输入时也要加入。 |
| 复用的事实是什么？ | payload 只有 `compressedBytes`；`version` 标识 payload 格式，`parse` 验证读取和新计算的值。 |
| 本次是否通过？ | 每次用当前 `maximumBytes` 判断，包括缓存命中时。阈值不影响压缩结果，因此不进入 key。 |

缓存目录是项目拥有、允许写入并可删除的本地目录。helper 负责读写与失效回退，不判断 key 是否完整，也不提供防篡改或保密保证；本例显式从 `project.root` 解析目录。

按以下顺序验证缓存行为：

1. 连续运行两次，大小相同，`cacheSource` 从 `computed` 变成 `cache`。
2. 改文件内容或 `level`，应重新计算；计算实现变化时同步更新 `measurementRevision`。
3. 只把阈值降到实测大小以下，即使命中缓存，也应失败。
4. 删除或破坏缓存文件，应重新计算；存储失败不抹掉本次已计算的结果，计算或 payload 校验失败则不能当成通过。

selection 决定是否做检查；cache 只复用检查内部的计算。本例的机制正确性与性能收益分别验证，是否值得缓存仍需测量。完整 helper 契约见本页前文；现成 Check 已有缓存选项时，可直接使用其能力。
