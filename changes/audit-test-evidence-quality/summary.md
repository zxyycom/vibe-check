# 测试质量全量普查结论

2026-10-22，**282 个常规测试文件、766 个当前测试实体全部审读，未审为 0**。子代理完成全部正文、参数矩阵和实际委托材料的主要审查；主代理闭合精确集合、核对输入并复核关键结论。显式 integration、类型、installed runtime 与 documentation 示例验收也已另行审读，范围见[覆盖证明](coverage.md)。本报告是本次审计交接，不替代行为 owner，也不表示已实施清理。

## 结论与处理原则

确实存在应清理的低质量证据，主要是**无效断言、未进入声称分支的 fixture、被吞掉的失败信号，以及无法区分目标回归的观察器**，而不是大量完整测试都没有目的。

- **可直接局部清理：** 重复参数行、恒真/未接线断言、fixture 自证层及重复字段断言。具体范围见下表。
- **应保留义务后改写：** callback containment、负向安全、精确 scope、失败结算、预算接线、并发与独立 oracle。一个局部断言失效，不代表整个实体可删。
- **整实体：** 当前没有充分依据支持无条件删除整个实体；Gate G4 有 **1 个条件合并候选**，先迁移 exact-entry-keys 和 raw required-set 断言，再删除重复实体/golden 并同步 Case。独立审查已纠正“只迁唯一 exact-key 即可”的遗漏：特殊 runtime lane 的有效 enablement 不消费 raw required metadata。
- **保留独立层级：** unit、真实 Worker/进程、public Run、安装后 consumer、schema/material acceptance 观察不同边界；同 Case 或相似输入不等于重复。大输入、取消、强杀和安全矩阵不因慢而删除。

这里的实体是 Bun 可寻址的 `it`/`test` 节点，不是断言、参数行或 Case。以下候选编号可在各分区报告中恢复完整测试名、owner、缺陷、最小动作与证据去向。

## 可先删除的局部内容

| 分区 / 引用 | 精确清理对象 | 仍需保留 |
| --- | --- | --- |
| [Package P-04 / P-05](package-review.md) | 测试自己 append 后检查尾元素；guard 后重复检查同一 sourceMap.file。 | 默认 selection/freeze、真实 consumer、source-map 与 packaged-source bytes。 |
| [Gate G1](gate-review.md) | 三处检查未传入执行的临时目录、且使用旧布局的文件不存在断言。 | native outcomes/Records/cancellation；需要 absence 证明时接入真实 artifact root。 |
| [Markdown M6](markdown-link-review.md) | parser 必须是同一函数对象的 identity 断言。 | 同实体的合法/非法 data 行为。 |
| [Analyzer AN-CENSUS-002](analyzers-review.md) | 两行完全相同的 Swift protocol/get 参数中后一行。 | 前一相同行与其它非重复输入；不删除实体或 Case。 |
| [Package tools PT-4](package-tools-review.md) | 手写四元素数组的 length===4 断言。 | readonly assignability、identity、literal inference 与正负类型证据。 |
| [Run/Definition RD-05 / RD-06](run-definition-review.md) | primitive string 的 isFrozen；helper 返回 expected 后外层再次比较 fixture 的伪 read 层。 | 真正数组冻结、真实 consumer 引用断言、两个 Run 与 reader close。 |
| [Run outputs RO-L1](run-outputs-review.md) | 从未接入 observer 的空数组与“没有 summary”断言。 | disabled factory/clock tripwires 和真实 enabled summary。 |
| [Scheduler SCH-005](scheduler-review.md) | SUT 调用前，由 fixture 自己保证的新对象/frozen 断言。 | Product graph/state/methods、opaque keys 与 successor/旧视图行为。 |
| [Scanners SS-01](scanners-scope-review.md) | 相同实参重复计算 cache configuration 再 deepEqual 的断言。 | 独立硬编码 backend shape、package/custom 和 exact-input key 变体。 |

以上是审计建议，尚未删行。Package P-02 的九处无效 type aliases 必须和根导出观察器一起处理；不是九个测试实体，也不在替代义务未闭合前直接清空。

## 优先改写：让目标回归真的报错

| 优先级 / owner | 候选与问题 | 最小方向 |
| --- | --- | --- |
| 1 — Run / Scheduler / settlement | RD-01/02、SCH-001：callback 内 assert 被边界捕获而外层未观察失败；DJC-01、G3 的 throwing getter/sentinel 同样可能被吞。 | 外部捕获值、调用计数及明确 passed/failed 结算；把关键 assert 移到不会吞异常的外层。 |
| 1 — Package | P-01/02 根导出 observer 漏 direct value/type export，负向 typeof-import 又查内部 module 值空间；P-03 安全矩阵被 equality 兜底遮蔽。 | 独立观察真实根导出；有效 root import-type 负例；能区别独立 safety policy 的 source/projection 反例。 |
| 1 — JSON / command / secret | DJC-02 input canary 未进入 argv/env；DJC-03 redirect 无请求历史且未断 outcome；DJC-04 unsafe schema 只看 Records；SS-03 未确认真实 finding 就检查无泄漏。 | 给负断言真实正对照、精确请求/失败终态及对应安全 surface；保留各独立输入原因。 |
| 1 — Check scope / resource / publication | DJC-05 自有 exclusion 被默认排除遮蔽；SS-02 仅测 SCC helper、不测跨 batch output-budget 接线且 stderr 未主导；SS-04 protocol-failed 只到 adapter；DJC-06 只检查发布前已清掉的旧 temp。 | 构造能进入目标分支的输入，观察 whole-Check/scan 失败、无 partial facts、后续 batch 未启动及本次全部 owned temp 清理。 |
| 2 — Repository / analyzer | R-01 统计 oracle 自等且未经过 ABBA 分组；R-02 format expected 引用受测 targets；R-03 exact vectors 只看 IDs；R-04 source import 字符串观察器漏真实 Gate 路径/子目录；AN-CENSUS-001 corpus 只校验自带计数、可静默缩水。 | 独立数值/正向范围 oracle、结构化递归边界观察及实际 corpus 长度/成员/唯一性 guards；保留来源身份与固定 Python expected。 |
| 2 — Definition / JSON identity | RD-07、SCH-004 差异比较同时改变多项字段；RD-08 比的是两种零需求；DJC-07 document-authoritative 没有区别性引用输入。 | 同一 baseline 单变量矩阵；让 identity/demand 的差异影响可观察结果。 |
| 2 — Lifecycle / concurrency | RD-03 所谓 unstaged 文件其实未跟踪；RD-04 接受 passed 或 unavailable；RD-09 错 phase 可 return；SCH-002 失败 writer 没有尝试计数；SCH-003 只统计共享 callback 总数。 | 真实 tracked unstaged fixture、精确 outcome/phase、故障发生见证及每 Run trace/结算。 |
| 2 — Timing / Markdown / output | PT-3 用固定 10ms 放行并发；PT-1/2 front matter/MD052 helper fixture 不触发被禁止分支；M1/M2 newline/cancellation 证明预满足或靠 getter 次数；RO-R1 单 Check 与覆盖式 helper 不能证明唯一 heartbeat/最后结算取消。 | 明确握手/barrier，区分性 Markdown 输入，真实 pending 状态与两个 gated Checks；不删除原义务。 |
| 2 — Gate / hygiene | G2 只看全体 Records，其他四项失败能掩盖 advisory lint 丢失；R-05 的三个 CLI fixture 与两个 docs 例子未回收独占 tmp。 | owning Check 的具体 evidence；成功/失败均 finally 回收，保留业务验收。 |

分区报告中的进一步边界不全部等于坏测试：Markdown M3 的 target-only、M4 的可选锚点、M5 的精确批次，以及 RO-N1 的 canonical 键序输入均是补强建议。RO-N2 的长日志 header 须由 owner/动态实验确认，尚未宣布 Product bug。Package P-06 的法律 fixture 二次读取耦合仍是待证项。

## 跨分区复核与 Case 漂移

- **写入故障不能跨 owner 冒领：** machine lifecycle 已真实注入同步 writeFileSync 与 rename 故障；它没有独立 close 阶段，不承接 progress tee 的 file write/close catches。RO-X2 仍为输出 owner 的补强建议，不是现有 setup-failure 实体应删除的依据。
- **handoff 隐私：** 当前正向引用消费与 machine/core canary 断言有价值；跨组反查没有把它提升为已证明所有 scheduler 日志、records.ndjson 或 presence-only metadata 都安全。RO-X1 保留为精确补强边界，不据局部未读 surface 断言存在真实泄漏。
- **并发：** repository material drift 测试暂改真实 checkout，但正式 Gate 已有 mutex。直接并行 Bun/外部编辑仍属未复现风险，不能误报正式 Gate 已竞态或直接删掉唯一 drift 负例。
- **Case 文案：** Gate 的 maxTargetReads、command output-limit 范围、upstream advisory 1.24.0/当前 1.24.1、READERS-A 七/九条规则均有漂移线索；DJC-08 测试名宣称 conditional，实际只证明 format annotation。按对应 owner 校准或收窄，不由历史文字反向制造新测试义务。

## 已执行证据与未验证边界

- 起点、终点的官方两页查询完全一致：190 Cases；全树 static/registration check 均通过 766 实体。11 分区审读并集与当前官方集合完全相等，重复、未知、遗漏均为 0；282 文件 SHA-256 全匹配，详见[覆盖证明](coverage.md)。
- **独立动态反证 RD-01：** 仅在 ignored scratch 复制测试，把 execution callback 的 signal assert 换成必失败 `assert.fail`，目标实体仍为 **1 pass / 0 fail**。证明的是测试内断言丢失失败信号，不是 Product context 已错误。
- **P-01/P-02 继承的隔离反证：** 当前 source helper 对追加 direct value/type export 的入口副本仍提取相同清单；typeof-import 形式在 type-only export 增加前后均编译通过，而 named import-type guard 检出 TS2578。输入未变，证据继续有效；并非真实 artifact/Gate 绕过实验。
- 其余候选主要是逐行静态反事实推导，尚未逐项执行 mutation；不把预测的假绿、时序风险或潜在输入缺口说成已复现故障。主代理另窄查 callback、Git、SCC、secret、cache、corpus 及此前 Gate/Markdown/package 关键 source。

最终独立审查与材料/Case/Change 检查结果在任务清单与[覆盖证明](coverage.md)记录。原始查询、分区精确 keys、哈希和探针保存在 ignored `.log/test-quality-audit/20261022-full-02N0Mb/`；前序三个分区的原始证据在 `20261022-9LGQjv/`，不提交派生实体账本。

审计记录形成时只写审计材料与协调入口，**未修改测试、Case、Product、Gate 策略或预算，未提交 Git**。当时没有运行原始全体测试正文、typecheck、package build/install 或完整 Gate；closure 与材料检查不证明正文通过，也不证明后续清理实施的验收结果。
