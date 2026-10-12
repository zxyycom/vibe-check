---
title: "优先复杂度优化的行为与性能验证"
id: "261012-verify-priority-complexity-optimizations"
formedAt: "2026-10-12T02:56:38Z"
question: "R01、R02、R03、C02 与优先 Check 热点能否通过局部复用降低公共路径开销，并保持既有行为契约？"
tags:
  - "algorithmic-complexity"
  - "optimization"
  - "performance"
relations:
  - type: "补充"
    target: "261012-audit-checks-core-algorithmic-complexity"
    summary: "补充优先候选实施前后的公共路径测量与行为证据"
---

## 形成时背景

前序[Check 与 Core 算法复杂度调查](./audit-checks-core-algorithmic-complexity.md)在 2026-10-12 形成了
39 组线索，并建议先处理公共 Run 的 R01/R02/R03/C02，再验证自然 Check 负载上的 K01/K05/K06。
39 组不是已确认性能 Bug 数；旧报告覆盖 347 个生产文件，本轮没有重做全仓审计。

用户随后授权按优先方向实施优化。本轮保存的是**七组候选实施前后的独立测量与行为证据**，
与前序的静态风险及有界计数分别保留，因此声明“补充”关系，不覆盖前序资源或历史结论。
没有用户延迟预算或现成 SLA，本轮不能据此建立新的产品容量承诺或 CI 时间阈值。

## 调查目的

本轮回答三个相互独立的问题：目标重复操作是否消失；完整公共调用的耗时是否有可观察改善；
索引与复用是否保持既有顺序、facts、授权、安全、错误及取消契约。

范围仅为 R01 blocker settlement 查找、R02 scope 查找与选优、R03 graph fingerprint、
C02 session lookup/known-ID Set，以及 K01 目录名字、K05 heading slug、K06 重叠 Git 历史测量。
不激活其它调度 Change，不引入公开 API、第三方依赖、limits、waiver 或跨调用缓存。

成功判断依赖测量、行为测试、非实施审查和工程 Gate 的组合；操作计数不是耗时，
snapshot digest 相同也不能单独证明所有未测行为。小规模波动与剩余成本必须单独报告。

## 调查范围与依据

### 时点、版本与两批基线

取证日期为 2026-10-12。第一批 before 为冻结 HEAD
`b01676764100e81603c0d64749a1b56a66682337`；source manifest 为 `c7de77b1…`。
第一批 after 与第二批 before 的 source manifest 均为 `1905a34d…`，后者在第一批优化树上另行冻结。
因此第二批 Check 收益必须与自己的 before 比较，不能再叠入原始 Run before 的收益。
第二批初轮 after source manifest 为 `73ef120c…`，Gate 修复后的最终测量树为 `b5336be5…`。
截至该测量时点，第一批 Run 生产模块其间只有 formatter linewrap；empty-Check workload 不经过 K helper。
后续规范审查树为 `817a47c1…`，与历史测量分别绑定，差异和验证见下文“提交前规范审查”。
完整 source/harness/lock 哈希由各 `*-identity.json` 保存，不能仅用未变化的 HEAD 表示 after 工作树。

主测量使用锁定 Bun 1.3.14；Node 24.18.0 只用于公共 Run smoke，不提供 Node 性能收益结论。
宿主为 Linux x64/WSL2，计时窗口记录 CPU、内存配额和负载；环境共享、JIT/GC 与调度波动未被消除。
第一批 before 副本曾位于仓库 ignored tmp，影响 Bun 测试发现；随后迁至仓库外并核对 718 个文件哈希。
迁移不改产品或测试发现规则；副本共享未修改的已安装依赖，仅供本轮 before 复测。

### 公共调用协议

所有计时均排除 import、fixture 建立、Check/Definition 构造、断言、digest 与 JSON 输出；
公共 Run 计入完整 `await run`，文件收集计入完整同步 `collectProjectFiles` 调用。
每形状/规模独立串行进程，3 warmups、9 samples；N=1/8 的 Run 每 sample 20 calls，
K01 N=32 每 sample 10 calls，其余每 sample 1 call，批次指标为每调用平均值的 median。
保留全样本、MAD、min/max，不剔除异常值、不估算 p95。操作计数使用独立非 timing invocation。

| 路径 | 冻结输入与核对 |
| --- | --- |
| 公共 Run | root `defineConfig`/`run`；independent 与稀疏 chain，N=1/8/32/64/128/256/512；static、maxParallel=1、常数 passed callback、全部 outputs disabled。 |
| K01 | 公共 collectProjectFiles；平目录 N=32/1024 个空文件、同数精确 patterns、useDefaultExcludes=false；核对 frozen canonical selected paths。 |
| K05 | 公共 markdownLinkValidation→defineConfig/run；H=Q=16/4096，所有 link 指向 same-document 最后一个合法 slug；cache/outputs disabled；核对 occurrences=Q、targetReads=0、Findings/Records=0。 |
| K06 | 公共 maintenanceReminders/run；真实临时 Git，root+4 successors/R=1 与 root+32 successors/R=8，同 root base，每 commit +1 行；核对有序 clear assessments、commitCount/changedLines。 |

Run 的 256 pilot 通过后将 512 纳入两侧协议。K01 的 4096 pilot 在 20 秒进程 deadline 后退出 124，
没有合法 wall sample，不能把 deadline 当单调用耗时；正式 before 前共同缩小两侧规模到 1024。
Check 单调用上限 10 秒、整轮有界停止；fixture Git init/add/commit 在 timer 外，未修改工作区仓库 Git。
真实 Git Trace2 只用于独立计数，清除继承 GIT_*、隔离系统/global config；保留命令计数而不保留原始 trace。

### 采用内容与行为证据来源

四个保留 Plan 分别为 `optimize-public-run-lookup-overhead`、`index-operation-local-directory-names`、
`index-markdown-anchor-slugs`、`reuse-maintenance-commit-measurements`。实施结论依据实际 diff、测量与行为证据；
稳定实现不变量分别由下表链接的 owner 承接，公开承诺保持原范围。独立正确性审查另由两个非实施代理完成。
复核测量协议时读 `final-measurement-handoff.md`，旧 `measurement-handoff.md` 保存初轮；操作状态以正文及规范审查记录为准。
identity/manifest 核对版本及输入，
raw/pilot/control/comparison 保存全样本、失败探索与误差；需要复核具体数值或噪声时再展开，不必顺读全部资源。

## 调查结果与边界

### 七组实施结论与证据强度

七组目标重复操作均已被局部索引或复用接替。完整公共调用的测量支持大规模 Run、K05、K06 的场景收益；
K01 的完整收集收益仍未证实。以下计数来自独立非 timing invocation，时间证据见后续两节；
测量阶段首轮 Gate 41/43 阻断经职责拆分和补测后，测量树 Gate 为 43/43。

| 组 | 已采用实现与稳定 owner | 直接操作证据 | 必须保持的边界 |
| --- | --- | --- | --- |
| R01 | [Scheduler](../development/scheduler.md)：当前 inspection 的 settled-kind、mutex、resource 索引。 | chain N=128 settlement find 比较 690880→0。 | 只认可当前 settled facts，dependency→mutex→resource 分类优先级不变。 |
| R02 | [Scheduler](../development/scheduler.md)：compiled graph scope/activation 索引、decision-local active Set 与最优候选 fold。 | independent N=128 scope find 比较 2812544→0。 | cap、priority、scope ID、Task ID 顺序及全相等时声明顺序不变。 |
| R03 | [Scheduler](../development/scheduler.md)：invocation 内惰性 graph fingerprint。 | N=128 graph JSON.stringify 258→1。 | 同一 immutable DTO 的原字节 stringify 与 SHA-256，跨 invocation 隔离。 |
| C02 | [Check results](../development/check-results.md)：注册校验后建立私有 slot Map 与 known-ID Set。 | N=64 slot find 2080→0；known-ID 数组 entries 4096→0。 | 索引指向同一 mutable slot，canonical slots 枚举顺序不变。 |
| K01 | [Project files](../development/project-files.md)：operation-local decoded name→entry list。 | N=1024 名字比较 1048576→0。 | 同 spelling 的 raw-byte 候选及原顺序完整保留，fidelity/no-follow 与每次调用重新观察不变。 |
| K05 | [Markdown Link](../development/markdown-link-resolution.md)：按 immutable facts 身份惰性建立 invocation-local slug Set。 | H=Q=4096 slug 比较 16777216→0；一次 Set 构造/4096 entries、4096 次 has。 | parser/slugger 继续生成 slug；target live authorization、budget 与当前 bytes 校验每次执行。 |
| K06 | [Maintenance Reminders](../checks/maintenance-reminders.md)：execute-local first-occurrence history index、成功 base resolution 与已验证 changedLines prefix。 | K=32/R=8 真实 Git 进程 266→35：rev-parse 9→2、rev-list 1→1、diff-tree 256→32。 | first-parent 逐 commit numstat 累加；失败/overflow 不推进 prefix，成功短 prefix 可复用，取消检查保留。 |

### 公共 Run：四组优化共同支持大规模收益

| N=512，完整 Run median ms | independent before→after | chain before→after |
| --- | ---: | ---: |
| 主采样 | 3555.936→587.295 | 1616.593→358.463 |
| 后续 before→after 交错 control | 3681.737→630.315 | 1667.522→467.281 |

保守采用交错 control，两个形状分别约降低 **83% / 72%**。这不是固定收益保证：
chain control after 范围 395.1–904.7 ms，主采样与 control 不完全一致；N=8 chain control 为 +0.66%，
落在观测噪声内，不能宣称每个规模都确定改善。每个规模的完整比较与误差见 `public-run-comparison.json`。
所有 measured snapshot digest 与 declarativeFingerprint 两侧相同；断言同时检查成功终态与关闭的 outputs。
digest 不覆盖完整 RunResult 的 duration 字节，也不意味着所有合法调用行为已穷尽。

C02 探针在 constructor 后安装 wrapper，Set 只数数组参数；零值只代表 open/settle 中被替代操作，
不是没有初始化或分配。构造阶段 O(C) 索引由源码说明，不由零计数证明。
公共 Run 仍有每 boundary 扫描、局部索引构建与四次 graph DTO freeze；没有证明整个 Run 为线性。
同协议、身份核对和目标计数支持“这批局部复用造成所测路径收益”的解释，
但没有逐项 ablation，不能把全部毫秒收益分摊给 R01/R02/R03/C02，也未测 CPU/峰值内存收益。

### Check 路径：K05/K06 大规模收益成立，K01 仅证实扫描消除

| 自己的 before→final | 大规模主 median ms | 最终同窗串行 control median ms |
| --- | ---: | ---: |
| K01，N=1024 | 1223.450→1243.457 | 2412.190→1866.548 |
| K05，H=Q=4096 | 771.864→602.244 | 800.629→636.501 |
| K06，K=32/R=8 | 483.934→66.200 | 517.893→68.981 |

最终 K05 主样本降低 21.97%，control 降低 **20.50%**；K06 分别降低 **86.32%/86.68%**，两轮方向一致。
K05 control 两侧范围 734.8–919.1 / 587.4–707.3 ms，仍有噪声，但这轮不重叠；不能继续使用初轮 33.72% 交付。
同 source/harness/fixture 身份、成功结果 digest 与目标计数共同支持收益解释，仍不是任意输入收益保证。
K01 最终主样本 +1.64%；control 表面降低 22.62%，但两侧范围 1264–3446 / 1307–2361 ms 强烈重叠，
不能以该 median 差称稳定收益，也不能把“移除 N² 名字比较”说成“完整收集提速”。
当前数据没有隔离 matcher、filesystem、canonicalization 与新增索引的各自耗时，不能确证涨幅归因。
作为 eager index 的额外 final sanity，同 N=1024 使用 broad `**/*.ts`，median 7.488→7.296 ms，
两侧范围重叠；仅一个 before→after 进程对，不宣称确定改善或回退，不修改已冻结主协议。
小规模 final 主样本 K05/K06 较旧窗口 before 上升 35.42%/43.96%；同窗 control 的范围重叠、方向反转或幅度衰减，
K06 主 median 16.058→23.117 ms 且主范围不重叠，同窗 control 为 15.408→16.380 ms、范围重叠；因果未隔离，
不能断言确定回退，也不能保证无回退。完整误差见 `check-priority-final-comparison.json` 与 final broad/count comparison。
Map.get 计数含既有目录缓存，不是纯名字索引调用数。零比较只说明目标扫描被接替，初始化、I/O 与其它算法操作仍在。
K05 大样本 source 实际为 204799 bytes，fixture/manifest/before/after SHA 与 bytes 全部一致；
此前交接消息的 221183 是转述笔误，原历史样本未改，见 `check-priority-fixture-consistency.json`。
完整 matcher、必要 filesystem/parser/I/O、Git changedLines 数据本身仍是成本，不因索引成为整体线性。
小规模、cross-document/missing-anchor、大型真实项目、非 Linux filesystem 与不同 Git 负载未作性能承诺。

### Gate 转折与最终测量来源

初轮 K05/K06 control 降低 33.72%/86.42%；K01 主样本 +6.90%、control +2.39%，完整路径未证实提速。
这些证据仍保留在旧 after/control/comparison/handoff，不改写为新结果，且不作为最终交付收益数字。
首轮 `mise exec -- bun run check -- --all` 为 41/43 passed、exit 1，存在四个实质阻断：
K01 `targetEntry`、K06 `#measuredChangedLines` cyclomatic complexity 均为 11，超过既有 10；
Markdown resolver 与 Run admission 两个测试文件 code-lines 为 396/328，超过既有 300，见 first Gate summary。

原 owner 最小修复：K01 提取 `validatedDirectoryEntry`，保留 bucket 全候选 fidelity 检查与选择顺序；
K06 提取 `#measuredCommitPrefix`，只有完整成功结果才提交 prefix，增加每 commit 一次 async continuation。
K05 endpoint 实体迁至 `local-resolver.endpoints.test.ts` 与 support，Run 两个 graph 实体迁至 `task-engine.graph-observation.test.ts`；
Case 只更新三条实体路径映射，不变更义务、limits、waiver、选择或公开契约。
两原非实施 reviewer 再次审查净 diff 无阻断；K06 新 continuation 使旧时长不能直接代表最终实现，故补测全部 K 组合。
最终复用原冻结 K-before、同 harness/fixture/locks，另保存 final raw/identity/count/control/broad，不重跑原 Run 计时。

### 行为保持与交付验证

行为测试的直接义务包括：session 注册输入 mutation、opaque/NUL IDs、known reason 与 canonical 顺序；
blocker 的 dependsOn/observes settled 区别与 dependency→mutex→resource 优先级、scope ordering/tie；
同字节 fingerprint、跨 Scheduler invocation 隔离和旧 snapshot 保持。
K01 覆盖精确路径/反序重复选择、每目录单读、下一调用 freshness 与有损 UTF-8/U+FFFD 冲突；
K05 覆盖 duplicate/Unicode/encoded/missing fragments、flags、跨文档、live authorization 与新 resolver freshness；
K06 两个新增测试实体覆盖成功复用、跨 execute 重测、first-occurrence、失败/overflow 恢复、短 prefix 与 cache-hit cancellation。
这些测试不证明所有输入；完整 Gate 另提供集成与包消费证据，不代替性能测量。

测量时点的验证如下：首轮第一批 C02 18 项、Run 31 项自验通过；主线程全 Product typecheck/lint 通过，
916 files format check 通过；Case 完整性实际为 704 entities/176 Cases/15 topics，通过，diff check 为 0。
两个 K06 实体映射至既有 Case，无新增 Case/Topic；其它测试增强沿用行为 owner 的原实体。
第一批独立审查另以锁定 runtime 运行 C02 11 tests、Run 14 files/41 tests，通过；
两批静态正确性、测试证据与实际 diff 文档影响审查均交接无实质阻断。
第二批首轮非实施代理使用 `mise exec -- bun test` 验证：project-files 的 collection、collection-path-identity、
public-collection 三文件 12 pass；markdown-link-validation 8 files/28 pass；maintenance-reminders 7 files/10 pass，
合计 18 files/50 pass，Bun 1.3.14；Gate 修复与实体迁移后由原 reviewer 再次净 diff 复核。
第二轮同命令完整 Gate **43/43 passed、exit 0**，exact candidate 为 `0.0.0-local.33c633e98132`，无 blocking Findings；
产品/脚本测试、类型/lint、包 artifact 与隔离 consumer runtime/types/docs 等检查通过，见 final Gate summary。
elapsed-to-initial-result 75.008 秒（prepare 22.371、setup 0.466、Product Run 52.171）在现有 90 秒告警预算内；
Check mean 3095.1 ms 超过 2000、nearest-rank p95 9179.0 ms 超过 5000，原告警保留，不因 Gate passed 隐去。
这不是 Gate before/after 实验，不能宣称 Gate 更快；Gate p95 与本轮九样本性能测量的“不估 p95”是不同口径。
最终 K source/冻结 before/fixture 哈希在计数及 broad 后稳定；`bun run validate`、Case 完整性、
18 个 Change 集合与 69 份 Investigation 全量检查通过；源文件格式和 diff whitespace 检查通过。
测量阶段独立证据审计后已核对并清理该阶段三个临时根、两份 notes 与两份 pointers，共七个精确目标；
正式资源、工作区 Git index 和依赖目录未改变。旧临时路径不可直接重用，恢复条件见 `temporary-cleanup.json`。

### 提交前规范审查

2026-10-12 追加 AI-ready 文档与全量变更代码审查，以编码规范而非邻近代码为判断依据。
文档前置七组结果，区分稳定 owner、当前 Plan 和历史测量，清理过时待办及 Markdown 泛型/路径表达。
生产代码收敛 graph fingerprint 的单一 state 输入，并明确 base lookup 返回 history index；测试补足第二次 Run
decision 非空断言，将预期计数集中到具名场景，并把 fixture setup 纳入清理边界。两个生产文件及三个测试/辅助文件
的逐项哈希差异见 `style-review-verification.json`；114 项相邻测试、Product 类型/lint 和 Case 完整性通过。

五个一次性测量脚本同样按规范整改：边界先接收 `unknown` 并验证，工作负载使用判别分支，intrinsic 安装与恢复保持连续。
`benchmark-boundaries.ts` 只承接这些脚本共同依赖的输入和 public import 边界；复现身份须同时核对主脚本与此依赖的 SHA。
六文件另经严格类型检查、同一 implementation lint 规则和格式检查通过；五处 native 方法桥接的逐行 lint 例外
各自说明 receiver/返回契约，不以临时用途豁免边界校验，仓库规则未修改。
原始测量 JSON 未改写，`restore-measured-scripts.patch` 从审查版恢复五个原脚本；已在独立临时目录逐字节验证恢复结果，
使用步骤和两版 SHA 保存在审查记录中。补充 smoke 的八个 fixture 描述按目录键与原 manifest 相同，六组操作计数及结果 digest
与旧 final evidence 相同（stack samples 除外）。本轮没有重建 before/after 性能对照，前述耗时仍只描述原测量版本。

审查树随后通过 `mise exec -- bun run check -- --all`：43/43 passed，exact candidate 为
`0.0.0-local.52746d5962d9`，无 blocking Findings。elapsed-to-initial-result 43136.3 ms，Check mean 1982.8 ms；
nearest-rank p95 5143.2 ms 超过既有 5000 ms 告警预算，告警保留。这是集成验收，不是 Gate 提速实验。
审查原件备份、smoke 输出、重建 fixture 及补丁复核的四个新临时根已精确清理；恢复补丁、SHA 对照和验证摘要正式保留。

### 适用边界与重跑条件

本轮取证完成时，产品优化已写入工作树，报告经候选预检后正式建立并同步索引；
历史报告与原始样本保持不变，四个 Plan 保留。该时点尚未执行 Git add/commit/push 或 Change finalize/delete；
后续 Git 提交与 Change 删除分别以当前授权和对应门禁为准，报告本身不授予这些操作权限。

重跑应核对 source/harness/runtime/fixture 身份，并独占计时窗口。旧临时路径已清理，恢复准备见 `temporary-cleanup.json`；
早期 identity/count 资源记录当时的 private helper 调用方式，重跑需先核对当前签名；五个脚本的版本恢复与规范审查边界见上节。
换用真实项目、其它 filesystem/runtime 或新的负载形状，需要另取性能证据；
前序其余 32 组线索的优先级、风险与修复状态也不能由本轮七组结果推定。

## 随附资源

- [benchmark-boundaries.ts](./_resources/261012-verify-priority-complexity-optimizations/benchmark-boundaries.ts)
- [broad-collection-control.ts](./_resources/261012-verify-priority-complexity-optimizations/broad-collection-control.ts)
- [check-priority-after-identity.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-after-identity.json)
- [check-priority-after-operation-counts.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-after-operation-counts.json)
- [check-priority-after.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-after.json)
- [check-priority-before-identity.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-before-identity.json)
- [check-priority-before-operation-counts.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-before-operation-counts.json)
- [check-priority-before-summary.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-before-summary.json)
- [check-priority-before.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-before.json)
- [check-priority-benchmark.ts](./_resources/261012-verify-priority-complexity-optimizations/check-priority-benchmark.ts)
- [check-priority-broad-after.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-broad-after.json)
- [check-priority-broad-before.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-broad-before.json)
- [check-priority-broad-comparison.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-broad-comparison.json)
- [check-priority-comparison.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-comparison.json)
- [check-priority-final-broad-after.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-final-broad-after.json)
- [check-priority-final-broad-before.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-final-broad-before.json)
- [check-priority-final-broad-comparison.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-final-broad-comparison.json)
- [check-priority-final-comparison.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-final-comparison.json)
- [check-priority-final-identity.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-final-identity.json)
- [check-priority-final-interleaved-controls.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-final-interleaved-controls.json)
- [check-priority-final-operation-count-comparison.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-final-operation-count-comparison.json)
- [check-priority-final-operation-counts.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-final-operation-counts.json)
- [check-priority-final-verification.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-final-verification.json)
- [check-priority-final.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-final.json)
- [check-priority-fixture-consistency.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-fixture-consistency.json)
- [check-priority-fixture-manifest.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-fixture-manifest.json)
- [check-priority-fixtures.ts](./_resources/261012-verify-priority-complexity-optimizations/check-priority-fixtures.ts)
- [check-priority-interleaved-controls.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-interleaved-controls.json)
- [check-priority-operation-count-comparison.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-operation-count-comparison.json)
- [check-priority-operation-counts.ts](./_resources/261012-verify-priority-complexity-optimizations/check-priority-operation-counts.ts)
- [check-priority-pilot-anchors-16.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-pilot-anchors-16.json)
- [check-priority-pilot-anchors-4096.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-pilot-anchors-4096.json)
- [check-priority-pilot-directory-1024.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-pilot-directory-1024.json)
- [check-priority-pilot-directory-32.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-pilot-directory-32.json)
- [check-priority-pilot-directory-4096.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-pilot-directory-4096.json)
- [check-priority-pilot-directory-512.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-pilot-directory-512.json)
- [check-priority-pilot-reminders-32.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-pilot-reminders-32.json)
- [check-priority-pilot-reminders-4.json](./_resources/261012-verify-priority-complexity-optimizations/check-priority-pilot-reminders-4.json)
- [core-after-operation-counts.json](./_resources/261012-verify-priority-complexity-optimizations/core-after-operation-counts.json)
- [core-before-operation-counts.json](./_resources/261012-verify-priority-complexity-optimizations/core-before-operation-counts.json)
- [final-gate-summary.json](./_resources/261012-verify-priority-complexity-optimizations/final-gate-summary.json)
- [final-measurement-handoff.md](./_resources/261012-verify-priority-complexity-optimizations/final-measurement-handoff.md)
- [first-gate-summary.json](./_resources/261012-verify-priority-complexity-optimizations/first-gate-summary.json)
- [measurement-handoff.md](./_resources/261012-verify-priority-complexity-optimizations/measurement-handoff.md)
- [public-run-after-identity.json](./_resources/261012-verify-priority-complexity-optimizations/public-run-after-identity.json)
- [public-run-after-operation-counts.json](./_resources/261012-verify-priority-complexity-optimizations/public-run-after-operation-counts.json)
- [public-run-after.json](./_resources/261012-verify-priority-complexity-optimizations/public-run-after.json)
- [public-run-before-identity.json](./_resources/261012-verify-priority-complexity-optimizations/public-run-before-identity.json)
- [public-run-before-operation-counts.json](./_resources/261012-verify-priority-complexity-optimizations/public-run-before-operation-counts.json)
- [public-run-before-summary.json](./_resources/261012-verify-priority-complexity-optimizations/public-run-before-summary.json)
- [public-run-before.json](./_resources/261012-verify-priority-complexity-optimizations/public-run-before.json)
- [public-run-benchmark.ts](./_resources/261012-verify-priority-complexity-optimizations/public-run-benchmark.ts)
- [public-run-bun-pilot-256.json](./_resources/261012-verify-priority-complexity-optimizations/public-run-bun-pilot-256.json)
- [public-run-bun-smoke.json](./_resources/261012-verify-priority-complexity-optimizations/public-run-bun-smoke.json)
- [public-run-comparison.json](./_resources/261012-verify-priority-complexity-optimizations/public-run-comparison.json)
- [public-run-interleaved-controls.json](./_resources/261012-verify-priority-complexity-optimizations/public-run-interleaved-controls.json)
- [public-run-node-smoke.json](./_resources/261012-verify-priority-complexity-optimizations/public-run-node-smoke.json)
- [public-run-operation-count-comparison.json](./_resources/261012-verify-priority-complexity-optimizations/public-run-operation-count-comparison.json)
- [public-run-snapshot-lifecycle.json](./_resources/261012-verify-priority-complexity-optimizations/public-run-snapshot-lifecycle.json)
- [restore-measured-scripts.patch](./_resources/261012-verify-priority-complexity-optimizations/restore-measured-scripts.patch)
- [style-review-verification.json](./_resources/261012-verify-priority-complexity-optimizations/style-review-verification.json)
- [temporary-cleanup.json](./_resources/261012-verify-priority-complexity-optimizations/temporary-cleanup.json)
