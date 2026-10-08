# Parent admission yield 的历史来源

本资源于 2026-10-08 通过当前仓库的精确 `git log -S` / `git show` 取得，只保留能解释首次意图和
后续默认未变的必要节选。旧材料属于历史认识，不是当前 owner、当前验证或执行授权；没有重跑
历史 spike，没有恢复旧 Change 的实现任务，也没有复制其完整证据树。

## 首次实现：d356dcb495941918c90e3a6606cb635262d50c8b

Commit date: `2026-09-02T16:21:14Z`；subject: `feat：以内置分析器替换 functionMetrics Lizard runtime`。
提交说明的相关句子：

> 通过精确输入 Worker、资源上限与取消边界执行内置函数分析。

定位命令：

```sh
git log --format='%H %ad %s' --date=iso-strict -S 'READ_CHUNK_BYTES' -- src/package-checks/function-metrics/measurement.ts
git log --format='%H %ad %s' --date=iso-strict -S 'setTimeout' -- src/package-checks/function-metrics/measurement.ts
```

二者都只返回上述首次提交。下面是真实 TypeScript 节选，不是本轮候选实现；省略其它函数和读取
前后的初始化/返回值，完整来源用 `git show` 复核：

```ts
// git show d356dcb4:src/package-checks/function-metrics/measurement.ts
const MAXIMUM_FILE_BYTES = 8 * 1024 * 1024;
const MAXIMUM_AGGREGATE_BYTES = 64 * 1024 * 1024;
const READ_CHUNK_BYTES = 32 * 1024;

while (true) {
  if (signal.aborted) return Object.freeze({ kind: "cancelled" });
  const bytesRead = readSync(descriptor, chunk, 0, chunk.length, null);
  if (bytesRead === 0) break;
  fileBytes += bytesRead;
  if (fileBytes > MAXIMUM_FILE_BYTES || aggregateBytes + fileBytes > MAXIMUM_AGGREGATE_BYTES) {
    return Object.freeze({ kind: "resource-limit-exceeded" });
  }
  chunks.push(Buffer.from(chunk.subarray(0, bytesRead)));
  if (signal.aborted) return Object.freeze({ kind: "cancelled" });
  await new Promise<void>((resolveYield) => setTimeout(resolveYield, 0));
}
```

同提交 `measurement.resource.test.ts` 的真实测试名为：

```text
yields during admission so cancellation prevents Worker startup, Records, and waiver audit
```

关键 setup/assertion 节选，省略 options、Worker tracker 安装和 finally 清理：

```ts
writeFileSync(join(root, "src", "input.ts"), Buffer.alloc(FILE_LIMIT, 0x20));
const controller = new AbortController();
const cancellation = setTimeout(() => controller.abort(), 0);
assert.equal(workerStarted, false);
assert.deepEqual(observed.records, []);
```

测试还完整断言 `unavailable / cancelled`。`FILE_LIMIT` 为 `8 * 1024 * 1024`；原测试配置 waiver
并在被启动的 fake Worker constructor 抛错，因此能观察 admission 取消是否早于 Worker/metric/audit。

## 同提交的历史设计与 source-tree observations

完整位置：

```text
git show d356dcb4:changes/archive/replace-lizard-with-typescript-function-analyzers/design.md
git show d356dcb4:changes/archive/replace-lizard-with-typescript-function-analyzers/evidence/resource-and-cancellation.md
```

Design 的 `Worker 与 Product 边界` 条目（原文节选）：

> 已选模型是在 byte-bounded exact-path admission 后启动一个 Check-owned Worker。parent 的 `32 KiB`
> reads、单文件 `8 MiB`、aggregate `64 MiB`、cancellation checkpoints、whole-result settlement 与
> worker termination 都是 Product 责任；reader 不发现或重读文件。

Resource evidence 的 `Implementation selected` 原文节选：

> The Check parent reads only its approved exact paths in at-most-`32 KiB` byte chunks, checks cancellation
> around each chunk, and yields a macrotask after every chunk.

它保存的历史 cancellation observation 是 8 MiB、timer abort at 0 ms、三次 fresh Bun `1.3.14`
source-tree run 均 `cancelled`、零 Worker starts、wall 2.0–2.2 ms；该材料明确区分 source-tree 与
stale package / emitted Worker probe，未声明 latency/RSS acceptance budget。
这些旧数值仅证明当时报告记录了取消作用，不与本聊天样本混合，也不声称当前复测或 release evidence。

原设计没有提供为什么选 32 KiB 而非其它粒度、timeout 而非 immediate 的专项最优性证明；本轮
查询也未发现这样的明确取舍。资源证据把 latency/RSS 定为 observation，不是 acceptance budget。

## 后续默认未变的两个关键演进

1. `fa4d45f50899b8f43bc7ba4d1f4f2999a1bf42be`，`2026-09-04T03:43:51Z`：引入
   `FunctionMeasurementDependencies.yieldAdmission` 和 `yieldAdmissionToTimer`，测试 helper 注入
   `Promise.resolve()`，production default 仍为 `setTimeout(0)`。只说明测试 seam 已落地，不是
   `setImmediate` production replacement。
2. `73a1d2395f59114744cbf1b64b1e056cc8275263`，`2026-09-06T13:01:57Z`：Node host 迁移将
   Worker lifecycle 分离到 `analyzer-worker-port.ts`，加入私有 `createWorker` seam；保留
   `yieldAdmissionToTimer` default。

复核入口：

```sh
git show fa4d45f5 -- src/package-checks/function-metrics/measurement.ts src/package-checks/function-metrics/measurement.resource.test.ts
git show 73a1d239 -- src/package-checks/function-metrics/measurement.ts src/package-checks/function-metrics/analyzer-worker-port.ts
```

当前行为仍须以当前源码、测试和 owner 判断，不能用这两个历史 diff 代替当次验证。
