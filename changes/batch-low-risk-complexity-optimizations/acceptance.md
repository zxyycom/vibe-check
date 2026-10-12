# 本批实施与验收交接

本页恢复当前 Change 的采用结果、证据边界和下一动作。**实施、产品独立审查及本轮文档/代码规范复核通过，无遗留实质发现。**
本轮完整 Gate 为 43/43；原始测量与本轮增量证据分别保存。当前尚未集成 `main`、发布或结项。

## 实际结果与范围

基线为 `b3c8fecce5a2ff835948f76f9fd4fa5a8e2fe853`；本批修改 14 个产品文件和 12 个相邻测试/支持文件。
本批保持公开行为、错误优先序、输出顺序和策略结果，索引仅存在于原调用或 prepared closure 生命周期。

| 切面 | 采用结果与行为边界 |
| --- | --- |
| C01 / C03 | seen Set 分别保留 identifier 首次出现和 blocker 重复拒绝，逐项 validation 与错误次序不变。 |
| R08 | flags、direct relation 与 artifact lookup 局部索引；直接授权/provider identity、实时 terminal/handoff facts 和跨 Run namespace 隔离保留。 |
| R04 | 当前 prepare 内按 scope 分组；四次 prepare、root/membership 与 scope 首错顺序保留，无 scope 时省去分组扫描。 |
| K04 / K07 / K14 | code-area membership、滚动 argv 预算与原始坐标比较；首位置 policy/严格阈值、UTF-16 预算/oversized 拒绝、稳定 range/ordinal 保留。 |
| T01 / T02 | 不可变 graph/prediction/score/history 索引；first-match、评分/tie/fallback/schema 保留，活动状态/capacity 实时读取，可变 history 每次重新合并。 |
| C05 | 未采用。once-per-call Set 候选在 2/5-key schema 上为原耗时的 3.898/9.203 倍，512-key 为 0.302 倍；常见小 schema 的退化阻止采用，正式源码未变。 |

范围和 owner 见[proposal](proposal.md)，设计与取舍见[design](design.md)。R05、跨阶段 graph 复用、策略调整和跨 Run 状态属于其它工作。

## 性能采用判断

原正式测量使用 Bun 1.3.14 / Node 24.18.0：37 个 small/scaled workload、5 对交错独立进程，每行每进程 3 批 warmup、7 批计时，全部 2,590 批保留。
完整序列化输出及 workload 元数据跨双侧/进程一致，主线程和独立 reviewer 分别复算原始统计一致。
采用项的放大 workload 在五对进程中均更快；数值、分布及 workload 边界统一从[证据阅读入口](evidence/reading-guide.md)进入。
这些结果绑定风格整改前的 after-final；本轮 flags 增量成本另见[规范复核](#本轮规范复核)，不把旧测量重标为当前源码。

- **接受的小输入成本**：C01/8 为 0.005031 → 0.006291 ms（约 +1.26 µs，五对中四对更慢）；reader 构造加 8 次读取为 0.000925 → 0.001948 ms（约 +1.02 µs，五对全部更慢）。本批接受有限绝对成本以获得放大输入收益，保持简单实现，不据此新增经验阈值。
- **未证明的改善**：R04/8 singleton 与无 scope/512 的配对方向不稳定；其它微小信号也须结合配对分布，不能仅凭 pooled median 宣称收益。
- **组合路径解释**：`T01-T02-public-prepare` 是 prepare（含 missing-history read）+ 三次 decide；19.174481 → 9.203477 ms 不代表 isolated prepare，原始 results/protocol 的统一 IO 排除措辞对此不适用，详见[计时澄清](evidence/reading-guide.md#组合-workload-的计时澄清e1)。

这些是局部 owner 或组合路径结果；未证明 Run 端到端、内存、真实 scanner I/O、所有规模无回退或生产 SLA，五对进程也不是跨主机独立实验。

## 验证与 owner 影响

下列是前轮实际执行证据；本轮另由下一节交接，原日志保留形成时对象。

| 证据来源 | 已验证与未覆盖边界 |
| --- | --- |
| 实施自测 | 项目固定 runtime 下 Core/Run 108、Checks 55、Learned 29 tests 通过；product typecheck/lint、format 与 Case 闭合通过。 |
| [主线程验证](evidence/root-validation/README.md) | 最终完整 Gate 43/43、exit 0，含 package artifact 和外部 Node 24 consumer，candidate `0.0.0-local.aa7ca827d229`；归档后补过 validate、Case、Change、Decision、format。Gate elapsed 33.3 s，p95 5,491.3 ms 超过 5,000 ms advisory，非阻断也非本批收益证据。 |
| [独立产品审查](evidence/independent-review/review.md) | 新建非实施 GPT‑6.1‑sol reviewer 审查 baseline 至 `7b1ca20f8b8049b0c4ef7c499beeec6cae78bcb5`：66 tests / 19 files、Case、源码 SHA/归档/全部统计复核通过，无产品实质阻断。E1 后续说明经同一 reviewer 定向复核；未重跑 Gate、benchmark、工程静态检查或 Node consumer。 |
| 文档与测试影响 | 实际 diff 独立反查确认无需改变用户页面、README、public JSDoc、examples、schema 或内部稳定职责；12 个测试/支持文件扩展既有行为，704 Bun 实体、176 Cases、15 Topics 闭合。共享 Scheduler/learned owner 的串行关系见[协调页](../../docs/governance/change-coordination.md#scheduler-证据队列)。 |

实施、测量和产品独立审查由用户指定的 GPT‑6.1‑sol 角色承担，主线程承接范围、取舍和交付审计。

## 本轮规范复核

以完整编码规范审查上述 26 个文件及临时测量、转换和审计代码；产品只删除 flags 的无责任转发层，提交为 `435eb4dc`。辅助代码按真实 fixture/IO/审计责任整理，新增验证代码同样通过边界类型和完整静态检查。
文档以采用结论和当前阅读任务为主，压缩重复与过程史，并由非实施 reviewer 核对主承诺、生命周期、证据身份和复现路径。

- 当前产品：14 项目标测试与完整 Gate 43/43 通过，candidate `0.0.0-local.dbb0d18d75a0`；13 个 harness TS、4 个转换/验证 TS 的 strict/lint/format 通过。
- 证据等价：原实验定义、37 行完整 smoke、原始汇总与审计输出核对通过；新旧 source/helper 身份分开归档，原 44/10/16 组 SHA 不变。
- flags 补测：旧优化后源码对当前源码的两行、五对进程共 140 个样本，配对方向混合；不证明新增提速或无回退。未重跑其余正式计时、端到端或内存测量。

独立审查、实际命令、Gate advisory、完整数值及新版复现步骤统一见[本轮规范复核材料](evidence/style-review/README.md)。

## 失败与探索材料

- ambient Bun 1.4.2 / Node 26.8.2 的测量属于探索，Core/Run 的 13 项失败由固定 Bun 重跑消除；未通过改断言迁就环境。
- 首轮完整 Gate 42/43，唯一阻断为 `strategy.ts` 305 code lines 超过 300。原实施代理内联单次使用的转发比较器后为 298；规则/waiver 未变。最终 after 重新冻结、验证和测量，首轮 after 及失败日志保留。
- 7 份原始 patch/lint 输出的必要空白以无损 archive 保留路径与 SHA；未规范化原字节或放宽检查。材料位置及历史协议迭代见[证据阅读入口](evidence/reading-guide.md)。

## 下一动作与交接边界

本轮改动按产品整改、辅助复现证据与阅读交接分组保存，受影响验证通过；完成依据见[任务](tasks.md)。
集成或 Change 结项各按当前授权执行；Change 删除须取得明确授权并通过 finalize 门禁。

产品改动的可审阅提交为 `4d69e6bb`（Core/Run）、`2d057d0c`（Checks）、`765f7186`（learned）；`7b1ca20f` 保存首次交接，`e44e06d4` 保存独立审查与 E1 澄清。
本轮产品规范整改为 `435eb4dc`，新版辅助代码和证据为 `62715f70`；最终交付页和归档由主线程核对，独立审查的冻结对象见各报告。
证据留在本 Change，源码/数据按 commit、patch、helper 和清单重建，不保存完整源副本、依赖或临时状态。
形成时辅助根 `/tmp/vibe-low-risk-bench.OMhMtE`、`/tmp/vibe-low-risk-verification.jOmqWA`、`/tmp/vibe-low-risk-review.5n66j6` 已交接可复现材料；后续精确清理前先核对存在状态、目标和当前授权，不能仅凭本文推断仍存在。
