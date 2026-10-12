# 本批实施与验收交接

2026-10-12：实施与测量已完成，完整 Gate 通过；**指定模型的独立审查尚未完成，因此本 Change 不结项、不作为完整验收通过交付**。
主线程只负责编排、取舍、实际 diff 与证据审计；本批实施、测量子代理均为 GPT‑6.1‑sol，没有切换其它模型。

## 实际范围

基线为 `b3c8fecce5a2ff835948f76f9fd4fa5a8e2fe853`，开始时工作树干净。
修改 14 个产品源码文件和 12 个相邻测试/支持文件，无新增依赖或公开接口。

| 切面 | 已实施 | 保留的边界与直接证据 |
| --- | --- | --- |
| C01 / C03 | 局部 seen Set | identifier 首次出现语义与 blocker 重复拒绝分开；未知值、空值和错误次序未重排。 |
| R08 | selection-local flags、reader-local direct relations、invocation-local artifact 索引 | direct dependency/observation 授权仍区分；每次读取当前 terminal/handoff facts；两次 Run 的 artifact namespace 隔离。 |
| R04 | 每次 graph preparation 内按 scope 分组 | 仍保留四次 prepare；root/membership、scope cap/terminal/activation/reachability 次序不变；无 scope 时不额外扫描分组。 |
| K04 / K07 / K14 | code-area membership、滚动 argv 预算、原始坐标排序 | 首位置 policy 值与较严阈值保留；UTF-16 成本、预算边界和 oversized 拒绝不变；同排序键的稳定顺序与最终 range/ordinal 不变。 |
| T01 / T02 | prepared closure 的 graph/prediction/score 索引，单次 prediction 的 history 索引，单次 recording 的 prediction 索引 | first-match、评分/tie/fallback/schema 不变；活动 scope 与 capacity 每次决定重新读取；不缓存可变 history 合并状态。 |

T02 没有另加 activation-ID Set；未修改现有 getter/snapshot shape。R05、跨阶段 graph 复用、队列、mutex frontier、策略算法及跨 Run 状态均未实施。
**C05 未采用**：独立隔离候选在项目固定 runtime 的 2/5-key schema 上为原耗时的 3.898/9.203 倍；512-key 虽为 0.302 倍，也不足以接受常用小 schema 的退化。正式 `closed-values.ts` 未变。

## 性能证据与采用边界

正式环境为项目固定 Bun 1.3.14 / Node 24.18.0。37 个 small/scaled workload，5 对交错独立进程，顺序为 B A / A B / B A / A B / B A。
每 workload 每进程先热身 3 个 iteration-batch，再计时 7 批；全部 2,590 批保留，无剔除。before/after 均为只读冻结源码；正式计时不与 Gate/测试并行。
完整序列化输出及 workload 元数据跨双侧、跨进程一致；主线程另用 Python 标准库重算全部 median/MAD/min/max、进程中位数和配对比率，与原汇总逐值一致。
这不是穷举语义证明，也不是 Run 端到端、内存或外部 SCC 进程测量。

下表为**局部每次调用的 pooled batch median**，不是五次独立实验的置信区间；五对进程比率和全部分布见[证据入口](evidence/README.md)。

| 放大 workload | Before ms | After ms | After / Before |
| --- | ---: | ---: | ---: |
| C01，512 identifiers | 1.298481 | 0.330381 | 0.254 |
| C03，512 blockers，含重复拒绝 | 2.056028 | 0.494409 | 0.240 |
| R08，512 flags/checks selection | 9.918968 | 0.300682 | 0.030 |
| R08，构造 reader + 512 次读取 | 0.486307 | 0.086538 | 0.178 |
| R08，构造 artifact 索引 + 512 次查询 | 2.560215 | 0.485048 | 0.189 |
| R04，512 singleton scopes，四次 prepare | 10.647781 | 7.812765 | 0.734 |
| T01，512-task critical-path preparation | 0.783196 | 0.289004 | 0.369 |
| T01，512-series history prediction | 9.166199 | 5.981763 | 0.653 |
| T01，512-task history recording | 4.411929 | 1.738791 | 0.394 |
| T01/T02，512 tasks，prepared 后三次决定 | 8.681113 | 0.498834 | 0.057 |
| T01/T02，512 tasks，public prepare + 三次决定 | 19.174481 | 9.203477 | 0.480 |
| K04，256 code areas | 39.059817 | 3.259113 | 0.083 |
| K07，2,048 paths 的 batch planner | 13.005767 | 0.029238 | 0.002 |
| K14，2,048 findings | 10.262461 | 2.568667 | 0.250 |

上述放大行的五对进程均更快，但不据此推导真实项目整体加速。
小输入有明确成本：C01/8 为 0.005031 → 0.006291 ms（1.250 倍，约 +1.26 µs；五对中四对更慢）；reader 构造加 8 次读取为 0.000925 → 0.001948 ms（2.106 倍，约 +1.02 µs；五对全部更慢）。
本批接受这两项有限绝对准备成本以获得放大输入收益，保留简单一致实现，不凭微基准新增自适应阈值；不声称无回退或已满足未声明的生产延迟预算。
R04/8 singleton 的 pooled 比率虽为 0.778，五对中四对更慢；无 scope/512 的 0.935 也无稳定方向。K04/4 和其它小输入同样应查看配对分布，而非只引用 pooled 改善。
未修改的 C05 对照存在波动，提醒本次测量仍受共享主机、JIT/GC 等影响。

## 验证与失败记录

命令均从仓库根运行，正式命令由 `mise exec --` 固定项目 runtime：

- Core/Run：`bun test src/project-definition src/check-settlement src/project-run/check-execution src/project-run/task-scheduler src/project-run/run-callback-context.test.ts src/project-run/controls/flags.test.ts`，108 pass / 0 fail。
- Checks：相邻 duplicate detection、SCC scanner、Markdown lint 测试，55 pass / 0 fail；完整 Gate 再覆盖对应产品 suites。
- Learned：`bun test src/package-tools/learned-critical-path src/project-run/invocation/learned-scheduling.test.ts src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts scripts/project/admission-workbench/policy.test.ts`，29 pass / 0 fail。
- product typecheck/lint、目标 format、Case 闭合通过；704 个 Bun 实体、176 个 Case、15 个 Topic 未增加虚假映射。
- `bun run check -- --all` 最终 **43/43 通过、exit 0**，包括 import boundary、package artifact、外部 Node 24 consumer 的 types/docs/runtime 验收；candidate 为 `0.0.0-local.aa7ca827d229`。
- Gate elapsed 33.3 s；Check duration p95 5,491.3 ms 超过 5,000 ms advisory budget，已保留告警，不作为阻断失败，也不作为本批性能改善证据。
- evidence 与交接文档加入后，补跑 `bun run validate`、`bun run test-evidence -- check --root .`、`bun run change-plan -- check-all changes`、`bun run decisions -- check`、`bun run format check` 和 `git diff --check`，全部通过。产品源码逐文件 SHA 与最终测量/完整 Gate 的 frozen after 相同；没有因附加证据再次重跑完整 Gate。

首轮 PATH Bun 1.4.2 / Node 26.8.2 的测量只作探索；Core/Run 的 13 项失败由项目固定 Bun 重跑消除，没有迁就运行时差异修改断言。
首轮完整 Gate 为 42/43，通过以外的唯一项是 `strategy.ts` 305 code lines 超过现有 300 上限。原实施代理删除单次使用的纯转发比较器，将同一调用内联到排序 lambda 后为 298 行；没有压行、提高限额、加 waiver 或新建形式模块。
第一次 after 快照与 Gate 失败日志均保留；最终 after 重新冻结并重新通过 strict/full lint/format、smoke parity 和完整 Gate，旧数据未冒充最终数据。
归档暂存时 Git 空白检查拒绝原始 patch 与 lint 输出中的必要/原生空白；最终把这 7 份文件无损封装并保留路径/SHA，解包逐字节一致后重新通过提交检查，没有修改原始证据或放宽规则。

## 文档与测试影响审计

主线程逐项读取实际源码/测试 diff 后的判断：

- 用户页面、README、示例、JSDoc 公共签名与 machine schema 无需更新：未新增可选参数或能力，默认值、授权、回调时机、错误/取消、输出及 I/O 边界未改变；相关契约与包验收继续通过。
- 内部 owner 无新增职责或生命周期规则；索引属于原 owner 的私有实现，局部 JSDoc 已说明不可变 graph 与实时 boundary facts 分离。Change 协调页登记共享 Scheduler/learned owner 的串行约束，不改其它策略计划。
- 12 个测试/支持文件扩展既有语义实体：覆盖重复/未知值、最新 dependency facts、跨 Run artifact 隔离、scope 首错顺序、argv 边界、稳定 ordinal、重复 prediction first-match、同 identity history 合并及活动状态变化。既有 Case 目的未变，账本闭合通过。
- 这些是主线程结果审计与机械证据。**非实施 GPT‑6.1‑sol 的独立正确性、测试证明力和文档反查仍缺失**；不能用主线程检查或 43/43 Gate 替代任务 2.3。

## 剩余工作与文件归宿

新建实施代理与独立 reviewer 均收到线程数上限错误；Paseo 可用配置也没有本项目所需的 GPT‑6.1‑sol 环境，因此没有切换模型、创建其它工作区或复用旧代理冒充新独立职责。
需要可新建指定模型审查代理的运行上下文，对当前稳定 diff 完成任务 2.3；若发现实质问题，再定向修复并重验相关证据。在此前保留 Plan，不合入 `main`，不 finalize。

最终测量脚本、源码重建 patch/清单、配置、原始结果、失败尝试、统计及 Gate 日志留在本 Change 的 `evidence/`，不新增常驻 benchmark 产品或独立 Investigation。
`/tmp/vibe-low-risk-bench.OMhMtE` 和 `/tmp/vibe-low-risk-verification.jOmqWA` 暂为待审查的复现辅助物；仓库归档不包含完整源码副本、node_modules 或进程临时状态。
独立审查和归档完整性复核完成后，可清理这些本任务临时根；本轮不清理，避免未完成审查失去现场。后续 Change 结项仍需明确删除授权。

## 提交与恢复边界

当前分支为 `codex/batch-low-risk-complexity-optimizations`，产品改动分为三个可独立审阅的提交：

- `4d69e6bb`：Core/Run 局部索引及其行为测试。
- `2d057d0c`：Checks 的 membership、batch planning 与 Finding 排序。
- `765f7186`：learned helper 不可变索引及其行为测试。

Plan、协调页与证据单独保存，不将未完成独立审查隐含为已结项。普通 commit 使用现有 post-commit hook；当前分支非 main，hook 明确跳过 push。未发布、未推送远端或改写历史。
