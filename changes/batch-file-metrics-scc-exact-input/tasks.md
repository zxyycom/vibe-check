# Tasks

任务先固定私有 transport 与资源语义，再实现 batch workflow、同步 owner/Case，最后用局部和完整 Gate 证明全有或全无的 logical measurement。

## Readiness

- [x] 0.1 恢复 Windows argv Investigation、`fileMetrics`/scanner/process owners、SCC v4 与 area Decisions，以及相邻 Changes；确认本 Change 只修改 SCC adapter 私有 transport。
- [x] 0.2 固定 UTF-16 保守 estimator、`28_000` hard maximum、性能候选/选择规则、稳定贪心 partition、300 秒共享 deadline、stdout/stderr 各 64 MiB 累计预算与非阻断 Windows evidence 边界。
- [x] 0.3 在修改测试前运行全树 Test Evidence check，确认 Plan 形成时的实体与 Case 映射无阻断。
- [x] 0.4 完成 AI-ready 语义审计：Outcome、owner、已采用 Decision、性能调查交接、非目标、失败分类、任务依赖和验收出口均可从 Change artifacts 直接恢复，且不存在阻断性开放问题。

## Implementation

- [x] 1.1 在修改 production scanner 前，用可复现 harness 测量固定 host/profile/corpus 的当前单进程 baseline、单文件 cold start、九档 batch sizes 与六档 candidate ceilings；验证每档 measurement digest 等价，并保存至少 10 轮 wall-time 原始值、median/p95、invocation count 与曲线图。
- [x] 1.2 按 Plan 的 `110%` median / `115%` p95 规则选择不超过 `28_000` 的最小 production ceiling；以初始曲线创建完整性能 Investigation candidate 及 harness、CSV/text、曲线图资源，并声明指向 Windows argv 调查的“补充”关系。
- [x] 1.3 在 `src/package-checks/file-metrics/scc/**` 实现纯 command-line upper-bound estimator 与使用已选择私有 ceiling 的稳定 partition planner；覆盖空输入、单批、多批和单 argument 不可传输结果，不接入 public options。
- [x] 1.4 将 `scanWithScc` 改为使用已选择 ceiling 的顺序 batch workflow，共享 monotonic deadline 与 stdout/stderr 累计预算，并保持 availability probe、固定 CLI protocol 和通用 process runner 不变。
- [x] 1.5 对每批执行 CSV 与 batch-local exact-input acceptance；全部成功后拒绝重复 measurement、按 path 稳定汇合，任一失败时不返回部分结果。
- [x] 1.6 修改 SCC/file-metrics tests，直接证明 partition/argv、稳定 merge、越界与重复 row、后续批失败、单路径过长、deadline 和 output budget；按真实证明目的同步 `AUX-SCC-ADAPTER-OUTCOMES-001` 与 `WB-SCANNER-FILE-METRICS-SCOPE-001`。
- [x] 1.7 runtime 证据成立后同步 `docs/checks/file-metrics.md` 与 `docs/development/scanner-dependencies.md`，说明一个 logical scan 可用多个私有 process batches 承载，并确认 public options、schema、exports、Records 与 machine output 无变化。

## Verification

- [x] 2.1 使用同一 benchmark workload 复测最终 production ceiling，确认 runtime invocation count、measurement digest 与阈值选择一致，且性能变化没有超过已记录噪声或选择门槛；将 before/after 结果补入 candidate，完成语义审核、preflight 并发布性能 Investigation。
- [x] 2.2 运行最窄的 SCC scanner/parser、file-metrics measurement/constructor tests，证明正常单批兼容和所有新增 fail-closed 分支。
- [x] 2.3 运行 `bun run test-evidence -- check --root .`、`bun run investigations` 与 `bun run validate -- docs`，证明 Case closure、Investigation/资源/关系、owner 链接和文档结构有效。
- [x] 2.4 运行 typecheck、lint、dependency/entry checks 及跨产品行为所需的 `bun run check`；逐项记录未运行或受环境限制的命令。
- [x] 2.5 非实施的独立 reviewer 已从实际 runtime/test diff 反查用户可观察变化、内部职责、Case 证明、性能证据与未改变的 public surface；其确认无阻断，并已修复 initial/runtime evidence split 与 successful multi-batch 的正向证据缺口。
- [x] 2.6 Windows runner 可用时执行 stock SCC 4.0.0 的超预算 exact-path acceptance；不可用时明确记录端到端未验证边界并继续验收，不把当前平台证据表述为真实 Windows 运行证明。（当前 Linux x64 WSL2 环境无 Windows runner；边界已记录在 Investigation `260914-measure-scc-file-batch-transport-performance`。）
