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
`{ source: "cache", read: "hit", write: "not-attempted" }`；computed 为
`{ source: "computed", read: "miss" | "invalid" | "failed", write: "stored" | "failed" }`。compute 或
parser failure 直接传播且不写 entry；storage failure 不改变已接受的 computed value，也不自动创建 Check
message、Record 或 terminal status。parser owner 决定是否进一步冻结它返回的 domain value。

## 并发与安全边界

写入在 caller directory 内经 unique temporary file 和 atomic rename 发布。并发 miss 可以重复 computation，
但 target 只作为完整有效 entry 读取。需要避免重复 computation 时由调用方协调并发；缓存目录的清理也由调用方负责。

directory 是 caller 信任且可删除的本地 state，不提供 containment、remote sharing、authenticity 或 secret
protection；不得将 secret、token 或低熵敏感材料放入 key，SHA-256 digest 也不是保密机制。consumer 自己
决定是否把 `read` / `write` observation 转换为 Check 事实。
