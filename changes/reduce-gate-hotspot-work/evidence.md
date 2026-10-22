# 实施与测量证据

2026-10-21 的 function-metrics、Markdown 测试与 consumer preparation 分解记录。设计与当前范围见 [design](design.md)。

## 结果摘要

- function-metrics 主要耗时在 Worker 内分析，保留实现。
- Markdown 完整测试 lane 中位数 5,575.97→2,897.70 ms，采用测试局部 parse-facts cache。
- consumer 整进程中位数 1,348.02→1,114.03 ms，采用 builder 按需加载与独立文档 fixture writer。

这些是三个独立 workload 的观察，不相加为 Gate 墙钟收益。

## 负载与方法

本轮测量与验收于 2026-10-21 完成（Asia/Shanghai；raw 使用 UTC）。Linux x64 / 6 logical CPU / mise Bun 1.3.14，HEAD 34c58409。前序测试优化同时存在于 before/after，不重复计算其收益。所有正式比较均为无插桩样本，每组 1 次 warmup + 3 次 measured；不从这三个样本估计 P95 或统计显著性。

- `measure.mjs before`：从真实 Gate function-metrics policy 选中并冻结 563 个文件、2,599,832 bytes，保存路径、字节与摘要。用 public `defineConfig` / `functionMetrics` / `run` 执行完整单 Check（包含 Worker），没有其它 Gate Check 并发。after 使用同一冻结输入，不让本轮 scripts 移动改变负载。正常样本覆盖完整 Check；已有 C-layer harness 只提供重叠诊断，不把分项机械相加。
- Markdown：真实 `resolveProjectGateTestLanes(...).productMarkdownLinks` 的完整文件清单，每个样本一个新的 `bun test` runner，不只挑慢项；同时保留 runner 的每项耗时。额外 build-time AST timer 对同一 10,001 引用、同一三个预算进行定位，嵌套时间不相加，bundle 的 JIT/加载形状不等同于普通 test runner。

本轮 before 启动前已实际读取 graph fixture：`"[x](attachment) ".repeat(10_001)`。换行改空格属于前序任务，已在当时的工作区中生效；本轮开始时保留它，本轮只增加 test-local cache。相对 HEAD 的累计 diff 仍包含前序布局改动，不能把它再次算入本轮收益。两个普通 runner 阶段与两个 profile 均使用相同空格语料；其 parser 计时差异不能反过来当作语料变化的证据。
- Consumer：每个样本一个新的 child，动态加载真实 material module，执行真实隔离 install、文档/runtime/types fixture 和独立 entry resolver child，然后清理。process wall 包含 import、preparation 与 cleanup；分项来自同一 child。两个阶段的全部 consumer 样本使用同一 artifact path / SHA-256 与 candidate `0.0.0-local.7de95ed6b493`，不包含 root candidate preparation。
- 分层 consumer profile 另通过 build-time timer 包装实际函数，只用于解释 preparation 内部阶段；bundle 会改变 module graph/加载形状，因此 import 改善仅取无插桩 child 的观察，不能用 profile bundle 的 import 时间代替。

命令为 `mise exec -- bun run changes/reduce-gate-hotspot-work/measure.mjs before` / `after`；profile-only 恢复使用 `before-profile` / `after-profile`。Markdown timer 为 `mise exec -- bun run changes/reduce-gate-hotspot-work/profile-markdown.mjs before` / `after`。前者原型在 workload/输出构建参数上修正后，完整 baseline 已成功保存；profile-only 的重跑未覆盖既有正常计时样本。正式 Gate 始终只经 `bun run check`。

## 成本分解与采用项

**function-metrics：未实施运行时优化。** before 的完整单 Check 中位数 3,848.11 ms。独立读/解码诊断 7.98 ms；C-layer 正常 production measurement 3,704.43 ms；另一次 diagnostic Worker roundtrip 3,479.98 ms，其中 adapter + port 3,453.67 ms，差值 26.30 ms。这些不是同一次 operation 的可加分解，也没有单独隔离 adapter mapping；证据足以说明主要成本在 Worker 内真实分析，不在无效等待或进程重复启动。当前 policy 已把 area exact inputs 去重成一次 Worker batch，host façade 也已有 reader/extension 索引复用。保留逐 chunk `setImmediate`、8/64 MiB caps、真实 Worker、完整选集和 source-aligned internals；不采用跳过分析、缩减输入、重复结果缓存或多 Worker/调度调整。

**Markdown：采用同一 test-local parse-facts cache 消除重复 grammar parse。** 普通 runner 中，10,001 引用矩阵占 lane 中位约 4,115.46 ms；其它各项通常低于 200 ms。before diagnostic 三次 parse 分别约 936 / 672 / 599 ms；after 只有第一次 parse（约 678 ms），后两次没有 parse 调用，source 收集含 cache restore 分别约 83 / 63 ms。三个 trial 仍新建 resolver、读取当前 source bytes，完整执行图构建与逻辑计费；保留 false/显式大预算下的完整 counts、零 Finding/Records 和 10,000 上限拒绝。缓存及真实 source/target mutation 的语义由相邻既有直接测试拥有。此预算 Case 的 Proves 保持原目的，不声称该实体独立证明 cache hit 或 byte mutation。

**Consumer：采用惰性 local fallback 与独立 fixture writer，消除子进程不需要的 builder/renderer 加载。** before preparation profile 为 fixture 7.21 ms（文档约 6.07 / runtime 0.86，包含关系）、install 895.01 ms、types fixture 16.87 ms、entry resolver 40.42 ms。`acceptance-input.ts` 仅在 Gate input 全缺失时加载 local preparation；显式有效或非法 input 均不加载它。`documentation-fixture.ts` 原样承接复制，完整 renderer/字节比对/可执行示例留在 documentation acceptance。真实 Bun install、独立 entry child、当前锁定声明复制和 containment/provenance 验证均保留，没有缓存或复用上轮 consumer 安装。

新增加载边界断言复用现有 test entity：复制当前 acceptance module，准备带 top-level marker 的 local builder stub，在隔离 child 中证明 import、有效/非法 Gate input 不加载 builder，仅 direct fallback 加载并返回准备结果。完整物理 cold integration 另实际执行，不把 stub 当作物理安装证明。

## 前后观察

| Uninstrumented workload | Before median（min–max） | After median（min–max） | Interpretation |
| --- | --- | --- | --- |
| function-metrics 单 Check | 3,848.11 ms（3,844.70–4,866.82） | 4,152.60 ms（3,811.91–5,056.75） | 未修改实现，不声称改善；中位 +7.9%，范围重叠 |
| 完整 Product Markdown lane | 5,575.97 ms（5,206.98–5,729.52） | 2,897.70 ms（2,761.36–2,996.53） | -2,678.27 ms / -48.0% |
| 10,001 引用预算 test entity | 4,115.46 ms（4,087.02–4,201.54） | 1,720.69 ms（1,643.46–1,780.64） | -58.2%，包含在 lane 内，不能再相加 |
| consumer child 整进程（含清理） | 1,348.02 ms（1,201.91–1,381.58） | 1,114.03 ms（1,081.63–1,148.08） | -233.98 ms / -17.4% |
| 同 child 的 module import | 199.63 ms（193.90–211.85） | 28.00 ms（25.71–29.80） | -171.62 ms / -86.0%，包含在整进程内 |
| 同 child 的 preparation | 1,020.54 ms（882.66–1,029.43） | 959.60 ms（935.12–998.16） | install 未改，不把该差异独立归因于优化 |
| 同 child 的 cleanup | 90.03 ms（85.91–99.90） | 90.84 ms（90.75–99.41） | 未修改 |

每个 consumer 阶段的第一个样本 preparation 分别为 8,637.27 / 6,100.83 ms，完整保留但标为 warmup，不计入稳定样本统计。它们的 install 内部依赖解析、网络/缓存和文件链接未再独立分解，不能把初次波动或缓存变热归因于本轮优化；也没有清除共享包缓存制造 cold 对照。

正常 function samples 的 final outcome 均相同，C-layer 两次结果的完整 metricView 数组（4,327 项）严格相等；该 view 的字段范围由既有 harness 拥有，不把它扩大为所有 FunctionMetric 字段的 parity 证明。Product 实现本轮未修改，完整行为测试另由 Gate 执行。CPU 频率和共享宿主未锁定，以上不是端到端稳定预算承诺。

## 验收与文档影响

- 起点与修改后 `bun run test-evidence -- check --root .`：766 entities / 190 Cases，全树闭合，实体身份不变。
- 最窄 graph/acceptance/input：9 passed；增加加载 marker guard 后 acceptance/input：3 passed。完整 Gate 执行全部 22 test lanes，包含 consumer docs fixture/test 的实际新路径。
- `bun run typecheck -- scripts`、`bun run lint -- scripts`、`bun run validate`、Change check 和 `git diff --check` 通过；Gate 另覆盖 Product typecheck/lint、format、材料与质量检查。
- `bun run check`：30 passed / 13 not-applicable / 0 failed / 0 unavailable，Product elapsed 25.0 s；总反馈 28,485.7 ms（含 root candidate prepare 2,702.5 ms）。mean 1,997.0 ms / P95 4,265.5 ms，均在原预算内，但 mean 仅略低于 2,000 ms，仍有波动风险。
- `bun run check -- --all`：43 passed / 0 failed / 0 unavailable，Product elapsed 29.2 s；总反馈 30,104.8 ms。mean 1,622.6 ms / P95 3,329.7 ms，在原预算内。实际 function-metrics 5,465.5 ms、Markdown lane 约 3.0 s、consumer provider 983.7 ms。它们是本次真实混合 workload 下的单次观察，不与前次 32.6 s 作受控提速比较。
- `bun run package:candidate:integration`：6 passed / 0 failed，9.19 s，在既有 30 s 硬边界内，实际覆盖 cold build/install/reuse 与损坏恢复。
- 两次正式 Gate 均未产生性能告警；未改任何告警预算、Check/lane/preset membership、并发或资源限额。下一次 cold install 或宿主争用仍可能重新触发告警。
- 非实施代理 `hotspot_review` 从实际 diff、owner、Case 和相邻 cache mutation evidence 反查，未发现剩余问题。内部 lifecycle 说明和现有 acceptance Case 已同步；Markdown Case 保留原预算证明。公开 Product/API/JSDoc/发布材料未变，无需更新用户指南。

## 留存与重放边界

本目录的 `before-measurements.json`、`after-measurements.json`、`before-markdown-profile.json`、`after-markdown-profile.json` 和 `workload.json` 保存形成时 raw、环境、样本及输入身份。两个 driver 只服务本 Change，不进入 routine tests、Product 或 Gate manifest。

`workload.json` 指向本次独占的 `.cache/vibe-check/gate-hotspots/cb62ea67-d1dc-4f69-889d-073c6b8c232e/`，保留 2.60 MB 冻结输入与可丢弃的 profile bundles，供本轮结果复核；在未来获授权的 Change 结项后可精确清理此目录，不清理共享 install cache。首次原型在同父目录产生的空目录不参与本轮 evidence，可在核对为空后清理。

本轮 before/after consumer 样本形成时均重验旧 candidate tarball 的相同 SHA-256；后续正式 Gate rebuild 已按 package lifecycle 清理该旧 tarball，当时的后续 candidate 为 `0.0.0-local.7425d37042db`。因此本报告保留历史 observation 而不承诺旧 tarball 仍可重放；新轮次必须以新输出目录、当前源码和新冻结 artifact 重新形成 baseline，不能覆盖本轮 raw 或把新 candidate 冒充旧样本。冻结 function 输入仍可用于其独立 Check 复核。

正式 console logs：`.log/gate-test-work/hotspots-XAJMxw/`；invocations：`.log/project-gate/2026-10-21T11-07-55.102Z-2542417-0dd85564-5e94-40a6-8d69-c66ff9751aee/` 与 `.log/project-gate/2026-10-21T11-08-21.207Z-2548467-a0c55953-b4f8-41a2-a15a-69da816f4810/`。正式 Gate 后只补本 Change 证据与任务勾选；该轮记录形成时尚未 stage、commit 或 finalize；其它会话的 Investigation 保持原样。
