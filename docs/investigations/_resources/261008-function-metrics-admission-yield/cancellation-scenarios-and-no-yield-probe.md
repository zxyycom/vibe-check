# 取消场景与无宏任务让步探针

用途：补充 `261008-function-metrics-admission-yield` 同轮后续的历史场景和删除让步取舍。
材料于 2026-10-08 取得并整理；历史由原调查子代理继续追溯，主代理抽样复核。
探针来自本聊天此前的实际工具输出，本次文档整理没有重新运行它。原有性能样本另存，未改写。

## Decision 时间线

状态为 2026-10-08 查询时的状态。归档记录用于恢复原始意图，当前约束回到 active Decision 与 owner。

| 日期 | 稳定 ID / 查询状态 | 与本问题有关的认识 |
| --- | --- | --- |
| 2026-08-15 | `260815-cooperatively-cancel-task-graphs` / archived, unaligned | 首次表达 programmatic Run 的协作取消；当天被下一条修订。 |
| 2026-08-15 | `260815-cancel-task-admission-and-drain-started-work` / archived, aligned | 调用方可把 CLI/service/editor/CI 的 Ctrl+C、timeout、用户停止映射到 signal；engine 停止新 admission 并 drain 已启动工作。 |
| 2026-08-17 | `260817-execute-check-functions-in-caller-runtime` / active, aligned | 同 runtime 的项目函数只能协作取消；单个 Check 可以私用 subprocess/Worker。 |
| 2026-09-02 | `260902-replace-lizard-runtime-with-product-owned-typescript-analyzers` / archived, aligned | 内置 analyzer 迁移在取消和完整结果边界内执行。 |
| 2026-09-03 | `260903-adopt-selected-lizard-extensions-in-product-owned-analyzer` / active, aligned | 继续保留 resource、cancellation 和 whole-input failure 边界。 |

复核入口是在工作区根执行 `mise exec -- bun run decisions -- show <完整 ID>`。
[8 月 15 日修订记录](../../../decisions/archive/cancel-task-admission-and-drain-started-work.md)
的背景明确列出调用方停止场景；[8 月 17 日记录](../../../decisions/execute-check-functions-in-caller-runtime.md)
保留同 runtime 与 Check 私有 Worker 的边界。这些场景是产品设计依据，合成输入则是实现证明材料。

## 两版迁移设计与旧实现

以下入口定位历史版本，路径按该 commit 保留；不要求工作树恢复已归档 Change。

```sh
git show 18c86308b82726c0637ebd8f8ee00f872e43410a:changes/replace-lizard-with-typescript-function-analyzers/design.md
git show d356dcb495941918c90e3a6606cb635262d50c8b:changes/archive/replace-lizard-with-typescript-function-analyzers/design.md
git show d356dcb4:changes/archive/replace-lizard-with-typescript-function-analyzers/evidence/source-alignment-deviations.md
git show d356dcb4:changes/archive/replace-lizard-with-typescript-function-analyzers/evidence/resource-and-cancellation.md
```

- **2026-09-01 原 Plan，design 第 38 行：**批准的 exact-path 读取、定期 signal、现有 reporter/final seam。
  Worker、32 KiB 和 timer API 尚未指定。迁移主要服务于移除 Python/Lizard runtime 依赖。
- **2026-09-02 最终 design，第 25、33 行：**保留有界工作要求，选定 byte-bounded parent admission
  和一个 Check-owned Worker；32 KiB、8/64 MiB、checkpoint 与 termination 由 Product 负责。
- **deviation ledger 的 Analyzer cancellation 行：**上游 core/protocol 没有 cancellation hook，
  因而取消放在 Check-owned execution，保持 token/processor semantics。
- **resource evidence 第 7、43–44 行：**逐 chunk macrotask 让步；8 MiB admission 与深层 conditional
  分别用于两阶段取消验证。深层输入是 6000 层的合成输入，不是实际用户事故记录。

直接父版本为 `853b30eaaa1a0545edf24b3622a5245d16c94a63`：

```sh
git show 853b30ea:src/package-checks/function-metrics/measurement.ts
git show 853b30ea:src/package-checks/function-metrics/lizard/scanner.ts
```

旧 measurement 第 26–36 行在扫描前后检查 signal；旧 scanner 第 30–35 行用
`runProcessSync`、`timeout: 300_000`，未传入 signal。同步扫描本来就阻塞同线程 abort 回调。
这支持区分旧行为、迁移验收目标和新实现能力；新模型是否拥有同等 deadline 需另行证明。

子代理查询及历史材料支持取消意图；未找到 32 KiB 最优性或 timeout/immediate 选型的明确依据，
也未找到促成这一实现的真实用户取消投诉。

## 无宏任务让步探针

执行条件：

- Linux / mise-bound Bun 1.3.14；源码 HEAD 为 `d266937d0c3e76dfeeee87f7b0901316e162dea3`。
- 独占 `mkdtemp` 目录，`input.ts` 为 8 MiB ASCII 空格；每模式一次。
- 通过私有 `measureFunctionMetrics` 依赖 seam 注入受控 Worker port。
  `subscribe` 返回空清理函数，`postMessage` 只记录提交的 source bytes，不回复结果；
  `terminate` 计数。没有创建真实 Worker 线程或执行 analyzer。
- measurement 前安排 `setTimeout(() => controller.abort(), 0)`。
- 三模式依次为当前默认、包装 `setImmediate` 的 Promise、`Promise.resolve()`。
  最后一项仅移除宏任务调度，源码读取循环中的 `await` 仍存在。
- 全部结算为 cancelled；断言端口创建次数为 0、0、1。
  每模式清除 timer，最终删除自有 fixture 并断言目录不存在。

原工具输出：

```jsonl
{"runtime":"Bun 1.3.14","mode":"default-timer","kind":"cancelled","workerStarts":0,"posts":0,"bytesPosted":0,"terminations":0}
{"runtime":"Bun 1.3.14","mode":"immediate","kind":"cancelled","workerStarts":0,"posts":0,"bytesPosted":0,"terminations":0}
{"runtime":"Bun 1.3.14","mode":"no-macrotask-yield","kind":"cancelled","workerStarts":1,"posts":1,"bytesPosted":8388608,"terminations":1}
```

这里的 `workerStarts` 是受控端口 factory 调用计数，不是物理线程计数。
取消前是否到达创建/提交边界是本探针的观察对象；取消耗时、FD 泄漏、真实线程退出与完整 Check
Records 未在此探针中测量。脚本经 stdin 执行，未保存为可重跑的文件。
