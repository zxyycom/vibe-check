# Change 执行依赖与 Worktree 协调

本文是同时推进多个当前 Change 时的协调入口，维护日常 `main` 工作区、跨 Change 前置关系、执行顺序与共享 owner 冲突；不保存已完成 Change 的副本或形成时证据。发布分支、双工作区、冻结 source、同一 tarball 验收、Git tag 与发布后交接时序由 [Package release](../tooling/package-release.md#发布工作区冻结源与交接) 完整定义。

本文不拥有 Change 的 stage、任务状态、实施授权或恢复条件。成员与动态状态以
`bun run change-plan -- list changes` 和目标 `changes/<change>/` artifacts 为准；本文与目标 artifacts 不一致时，先按当前事实更新本文，不得用协调摘要覆盖 Change 自身的约束。

## 使用步骤

每次开始或恢复 Change 工作前依次执行：

1. 运行 `bun run change-plan -- list changes`，确认目标仍是当前直接成员，并读取其 stage、任务进度和 Plan 距离。
2. 读取目标 Change 的 `proposal.md`、`design.md` 和存在时的 `tasks.md`，确认 Outcome、开放问题、Resume Conditions 与 Readiness。
3. 确认日常工作区位于 `main`，且硬前置的稳定提交已包含在当前实施基线中；发现其它分支时先核对授权，不沿用它继续普通 Change 工作。
4. 检查同批任务是否修改相同源码 owner、lockfile、Gate、Case 账本或稳定文档 owner；有重叠时串行实施和提交，保留其它任务的改动。
5. 在当前 `main` 上限定本次写入范围与验证对象。前置变化后，下游先重新复核；发布工作区另按[发布流程](../tooling/package-release.md#发布工作区冻结源与交接)准备。

## 当前 Change 协调

完整当前集合由 `bun run change-plan -- list changes` 查询。本节让执行者恢复三项协调信息：下一项工作、
跨 Change 前置和共享 owner 的执行顺序。目标 Change 的 stage、Readiness、开放问题和实施授权仍由其
artifacts 决定。

### 当前主队列

当前材料入口、变更选择和 Markdown lint adoption 已由
[Project Gate](../tooling/project-gate.md) 与
[repository-material owner](../tooling/repository-material-validation.md) 承接；已交付的精确 Finding waiver
由 [Markdown lint](../checks/markdown-lint.md#精确-finding-waiver)与
[Finding waiver 指南](../guides/finding-waivers.md#为-markdown-lint-声明精确例外)承接。
[构建项目 Gate](../guides/building-project-gate.md)已承接 consumer 的多场景构建路径；change region 的完整 `patterns` 列表由[API 机制](../api-mechanics.md#按文件变化选择-check)拥有。
下列条目按各自已获授权的范围推进；前置能力交付不自动授权其它候选。

| 优先级 | 当前 Change | 进入条件与完成出口 |
| --- | --- | --- |
| P1 | [`add-composable-feature-config-packages`](../../changes/add-composable-feature-config-packages/proposal.md) | 以真实 Gate 组合与 building guide 证明重复成本为前提，再固定 fragment grammar、冲突规则与 Gate projection；指南交付本身不证明需要新抽象。 |

Waiver 可省略实现由[公开指南](../guides/finding-waivers.md#输入与默认值)承接；
[`audit-public-authoring-optional-fields`](../../changes/audit-public-authoring-optional-fields/proposal.md)保留其独立验收与结项入口。

### 有界性能优化交接

以下三个切面分别保留实施计划与独立调查证据。当前工作按各自 Plan 交接、验收和提交；
共享 Gate 配置、知识索引与本页串行维护，其它性能候选仍按各自进入条件处理。

| 当前 Change | 写入与验收边界 |
| --- | --- |
| [`optimize-project-file-selection-cost`](../../changes/optimize-project-file-selection-cost/proposal.md) | 共同文件收集的 operation-local membership；保留原生列表语义、默认排除、路径身份与访问失败边界。 |
| [`optimize-run-projection-cost`](../../changes/optimize-run-projection-cost/proposal.md) | 共同 Run 的重复投影；保留 immutable context、声明顺序、measurement、取消与 drain，不改变策略。 |
| [`bound-function-metrics-tokenization-cost`](../../changes/bound-function-metrics-tokenization-cost/proposal.md) | private Lizard port 的有界尾部防护；独立 Decision、来源偏差与完整 tokenizer/lifecycle 证据共同约束采用，维持现有 Worker 取消协议。 |

三个源码 owner 不重叠，可在隔离写入范围内实施；性能计时串行独占，不与行为测试、profile、构建或 Gate 混跑。
Case 账本、来源映射、知识索引与本协调页由主线程串行协调；package candidate 准备、required 与 complete Gate 统一在源码稳定后执行。
每项收益与语义分别验收，共同 Gate 只证明组合验收。提交与 Change 结项删除分别按当前任务授权执行。

### 按需上下文与准备事实优化

本轮三个 Change 各自拥有独立 Outcome；局部 exact-key membership 与 Markdown component cursor 改动
按各自源码 owner 直接验收，不扩张旧性能 Plan。Git 提交与 Change 结项删除分别由当前任务明确授权；
已启用 hook 的受限自动推送遵循[工作区提交规则](../tooling/workspace.md#local-post-commit-auto-push)。

| 当前 Change | 写入与验收边界 |
| --- | --- |
| [`declare-scheduler-context-needs`](../../changes/declare-scheduler-context-needs/proposal.md) | Scheduler 消费者可选需求声明、阶段内 union 与按需投影；旧回调保留 full context，terminal delivery 与 measurement demand 分离。 |
| [`reuse-invocation-prepared-facts`](../../changes/reuse-invocation-prepared-facts/proposal.md) | 单次 Run 已验证 Definition 与 prepared graph 的私有交接；不跨 Run 缓存，不改变取消、Git、prepare 或 flag-control 顺序。 |
| [`isolate-duplicate-scan-cache-identity`](../../changes/isolate-duplicate-scan-cache-identity/proposal.md) | Duplicate 扫描输入与 cache-only identity 分离；cache-off/no-work 不取得无消费者的身份，保留 scanner 与缓存验收。 |

三者不存在互相交付后才能成立的硬前置。需求声明与准备事实复用触及 Definition、Invocation 和 Scheduler
相同文件，先审阅 handoff 接口，再由准备事实切面完成共享入口写入、冻结局部 diff 后交给需求声明切面；
这是共享 owner 的串行写入约束，不以未提交改动解除硬前置。各自设计与不重叠的局部实现可以并行。
Duplicate 的实现范围独立，但共享 Case、知识索引、稳定文档和本页由主线程安排唯一写入者。
正式计时继续独占串行；公共 API、package material 和完整 Gate 在全部输入稳定后统一验收。

### Scheduler Core 补完与 Markdown 缓存提醒

以下两项 Change 各自验收独立 Outcome，没有互相交付才能成立的硬前置；它们不扩张旧性能 Plan。

| 当前 Change | 写入与验收边界 |
| --- | --- |
| [`warn-markdown-link-cache-capacity`](../../changes/warn-markdown-link-cache-capacity/proposal.md) | Markdown 专属可配置容量提醒，只消费首次 restore 已读 bytes；保留显式 cache、退化、Findings、Records 与 settlement。 |
| [`unify-scheduler-core-state-queries`](../../changes/unify-scheduler-core-state-queries/proposal.md) | 真实执行与推演共用 Core 状态、判断和查询，移除 Shell 镜像与重复 seed；保留合法投影差异、hard guards、forced effects 与按需 instrumentation。 |

源码 owner 相互独立；Case 账本、派生知识索引和本页共享，分别安排唯一写入者。文档与代码审查按文件范围隔离；
独立反查仍须以实际实现 diff 核对公开和内部 owner。历史报告仅修正 Decision 移位后的链接，保留形成时结论。
公共材料及完整 Gate 在全部输入稳定后统一验收，Git 提交与 Change 结项删除分别依当前任务授权执行。
Scheduler 补完落实现有 immutable state 与需求声明方向，不启动旧
[`optimize-learned-admission-strategy`](../../changes/optimize-learned-admission-strategy/proposal.md)，也不改变默认策略。

### Scheduler frontier 与 Gate 测试成本

以下两项在当前 `main` 基线独立实施，分别验收 Core 消费成本和测试成本；它们不改变策略或公共契约。

| 当前 Change | 写入与验收边界 |
| --- | --- |
| [`optimize-scheduler-frontier-consumption`](../../changes/optimize-scheduler-frontier-consumption/proposal.md) | Core 约束分组、静态 frontier 消费与动态 mutex facts；保留策略层级、公开完整投影和不可变分支。 |
| [`reduce-gate-test-fixture-and-probe-cost`](../../changes/reduce-gate-test-fixture-and-probe-cost/proposal.md) | 隔离 probe sequence 与 workspace adapter 路由证据；保留真实 CLI/validator 证明、Check 粒度和工程门槛。 |

两个源码 owner 可并行；Case 账本和本页串行维护，性能采样独占且不与测试、profile 或 Gate 混跑。
全部输入稳定后统一 candidate-backed 验收；提交与 Change 结项删除分别按当前任务授权执行。

### 并行与提交边界

调查和 Plan 收敛可以并行。代码、Case 账本、Gate manifest、lockfile、package material 和稳定文档共享
owner 时，实施与提交必须串行。

| 轨道 | 可并行工作 | 实施前置与共享边界 |
| --- | --- | --- |
| Public authoring optional fields | config package 设计讨论、scheduler 证据 | 实现已由当前基线继承；独立结项与其它字段不自动进入发布，后续改动按公共声明、工具 owner、Case 与 package material 的实际重叠串行。 |
| Config packages | scheduler 证据、公开 API 使用调查 | 需要真实组合成本证据，且会改变 package authoring/Definition owner。 |
| Scheduler evidence queue | 文档和独立 corpus 调查 | 若改 scheduler/runtime，按以下证据队列内部顺序串行。 |

每个 Change 仍须按自身 artifacts、测试和用户授权实施；新的 blocking policy 或公共抽象须有独立证据。

### 文件关系与 change flag 调试

文件轨道已交付三项能力：

- [文件收集](../guides/collecting-project-files.md)拥有纯磁盘范围、统一 patterns 与默认防呆，
  内部机制归[Project files](../development/project-files.md)。
- [Core 索引](../guides/file-region-index.md)拥有已取得值数据的合并、追加重建与只读双向关系。
- [change flag 调试](../guides/debugging-change-flags.md)组合公共收集与 Core，展示当前所选全集的逐文件和按 token 映射。

长期取舍由[文件范围决策](../decisions/unify-file-selection-with-default-excludes.md)与
[索引决策](../decisions/provide-readonly-file-region-index.md)承接；本节不保留完成 Change 的阶段和验收副本。
后续触及共同 matcher、Run 接线、包材料、Case 或文档 owner 时，仍按实际重叠串行实施与提交。
函数指标的来源、计量和读取边界各由对应 owner 拥有；后续是否复用关系索引按具体结果与责任判断，不由本轨道交付自动触发。

### Lizard 升级与 TypeScript 修复

固定 `1.24.1` 来源、Rust 真实 match-arm 贡献和 Kotlin 正文位置由
[Function Metrics](../checks/function-metrics.md)、[Scanner dependencies](../development/scanner-dependencies.md)
及[来源映射维护](../tooling/source-mapping.md)拥有；形成时验收见
[实施调查](../investigations/verify-lizard-1-24-1-implementation.md)。本节不保留已交付升级的 Change 链接或阶段副本。

显式返回类型函数的真实边界与 `??` 单 token/短路计量由
[Function Metrics](../checks/function-metrics.md)及[有界偏差 owner](../development/scanner-dependencies.md#typescript-函数指标的有界偏差)承接；
[短路口径 Decision](../decisions/align-nullish-coalescing-with-short-circuit-function-metrics.md)已与完整方向对齐，形成时验收见
[TypeScript 修复调查](../investigations/verify-typescript-metrics-implementation.md)。本节不保留修复 Change 的阶段或恢复副本。
共享 analyzer、来源账本、Case 与包材料的后续变更仍串行实施和提交，已交付能力不自动授权扩大其它 owner 的范围。

### 函数指标读取优化

逐非空 chunk 的 `setImmediate`、协作取消与资源/完整输入边界由
[内部 owner](../development/scanner-dependencies.md#package-maintenance-evidence)和
[Function Metrics](../checks/function-metrics.md)承接；同条件精确安装对照与完整验收见
[读取优化实施调查](../investigations/verify-function-metrics-admission-implementation.md)。本节不保留已完成 Change 的链接或阶段副本。
共享 measurement、测试、Case 或包 owner 的后续变更仍串行实施和提交；来源升级、指标修复与读取策略分别验收。

### 全局声明式上下文与 Scheduler 底层重构

声明式上下文与底层状态重构均已交付；当前契约由 [API 机制](../api-mechanics.md#声明式-callback-context)、
[调度指南](../guides/scheduling.md)与 [Scheduler owner](../development/scheduler.md)拥有。
本节不保留已结项 Change 的阶段、计划或性能证据副本。

共享 Scheduler、Definition、Invocation、公开类型、Case 和稳定文档的写入与提交串行协调。
底层项优化已请求数据的维护和计算，不重新打开已交付上下文 API 或把需求开关迁移混入性能结论。

### Scheduler 证据队列

以下策略证据队列与已交付的底层状态重构独立验收；共用 Scheduler owner 的源码和 Case 写入串行，性能采样使用独占窗口。
策略队列继续前，以当前 Scheduler 数据模型与观察输入重新核对其输入和验收基线。

Scheduler 的当前行为由 runtime、Architecture、API mechanics、
[统一 Invocation 策略生命周期 Decision](../decisions/keep-invocation-lifecycle-free-of-learned-special-cases.md)
和[虚拟评估 Decision](../decisions/evaluate-admission-heuristics-with-seeded-virtual-workloads.md)承接。以下队列只协调
当前 Change 的证据顺序：

1. [`add-scheduler-performance-reference`](../../changes/add-scheduler-performance-reference/proposal.md) 现在可以完成
   consumer 价值、measurement sufficiency 与命名门禁。
2. [`adapt-admission-optimization-to-effective-opportunity`](../../changes/adapt-admission-optimization-to-effective-opportunity/proposal.md)
   以当前 [Project Definition](../development/project-definition.md#flag-enabled-checks) 已拥有的 effective selection，建立分层 workload、opportunity facts、算法成本和
   adoption/non-regression 门槛。Performance reference 只在具有独立判断价值时进入该证据。
3. [`optimize-learned-admission-strategy`](../../changes/optimize-learned-admission-strategy/proposal.md) 保持暂停；上一步
   收敛后，根据新证据重写、拆分或以 not-adopt 结束旧 Plan。

[`add-invocation-fail-fast-policy`](../../changes/add-invocation-fail-fast-policy/proposal.md) 取得真实 workload，并闭合
pending outcome、observer 与 drain 语义后才能激活。若它先激活，应在新的 Scheduler corpus、terminal evidence
与 timing baseline 冻结前完成，因为这些结果会成为后续比较的新输入。

### 等待恢复条件

下列 Change 当前只进行解除恢复条件所需的有界调查：

| 当前 Change | 恢复条件 |
| --- | --- |
| [`add-html-link-validation`](../../changes/add-html-link-validation/proposal.md) | 命名 consumer 与 corpus 已明确 source kinds、supported attributes、parser 和本地 target 语义。 |
| [`add-network-link-validation`](../../changes/add-network-link-validation/proposal.md) | 命名 consumer、安全 input acquisition、显式网络授权和 hermetic SSRF/redirect/DNS 证据齐备；恢复时重新形成 Plan。 |
| [`decide-file-metrics-public-scc-expansion`](../../changes/decide-file-metrics-public-scc-expansion/proposal.md) | 出现当前 executable-only contract 无法满足的具体 consumer outcome，再评审独立 public contract。 |
| [`refine-agent-document-routing`](../../changes/refine-agent-document-routing/proposal.md) | 用户明确恢复后，以代表性任务重新评估 AGENTS、导航和领域 owner 的路由边界。 |

### 普查后的语义保持成本优化

下列 Change 分别验收声明处理、文件匹配、调度、learned helper 与工具链的重复成本。
无效声明的提前配置失败由独立 Decision 约束；其余切面保持既有行为，旧 learned backfill 实验仍按前述证据队列进入条件处理：

| 当前 Change | 写入与验收边界 |
| --- | --- |
| [`bound-check-tree-processing-cost`](../../changes/bound-check-tree-processing-cost/proposal.md) | 声明解析与继承集合；重复 executable ID 提前配置失败由[独立决策](../decisions/reject-duplicate-executable-checks-before-expansion.md)约束，合法树行为不变。 |
| [`reduce-project-file-matching-work`](../../changes/reduce-project-file-matching-work/proposal.md) | 深路径前缀与窄 literal selection；原生 pattern fallback、默认排除、文件身份与授权保持。 |
| [`reduce-scheduler-repeated-work`](../../changes/reduce-scheduler-repeated-work/proposal.md) | 图验证、Shell membership 与精确 measurement 的局部重复工作；不改变结算顺序、浮点累加顺序和 immutable 分支。 |
| [`reduce-learned-strategy-computation`](../../changes/reduce-learned-strategy-computation/proposal.md) | 私有候选计算与 fallback 索引；保留层序、comparator、first-only wait 和公开 callable 回调保证。 |
| [`reduce-tooling-repeated-work`](../../changes/reduce-tooling-repeated-work/proposal.md) | 文档、package、Gate、workbench 和验证工具的局部索引与一次拼接；不跳过完整性或安全验收。 |

源码写入按 owner 互斥；共享 Case Topic、知识索引与本页安排唯一写入者。性能计时独占，
与测试、计数、构建和 Gate 分开；输入稳定后统一运行 candidate-backed required 与 complete Gate，并由非实施代理
按实际 diff 反查行为和文档。Analyzer、缓存容量管理、schema 跨 binding 快照、默认 timeout 与安全探测在这些 Change 范围之外。
提交与结项分别遵循下文[Worktree 与合入规则](#worktree-与合入规则)和当前任务授权。

## Worktree 与合入规则

1. **日常开发与提交只在 `main` 进行。** 普通 Change 是范围与验收单位，不创建对应分支或另设合入阶段。创建、切换或使用其它分支须有用户明确授权；已有分支的存在不构成使用授权，删除或重命名也须另行授权。
2. **发布分支遵循独立发布流程。** [Package release](../tooling/package-release.md#发布工作区冻结源与交接)保留发布分支、实现工作区和 detached 冻结工作区的职责及授权要求；该例外不扩展到普通 Change。显式获准的分支按[命名规则](../decisions/use-unprefixed-project-branch-names.md)命名。
3. **写入所有权互斥。** 不让两个执行者同时修改同一 Change 目录或共享 owner；只读调查及写入范围不重叠的任务可在 `main` 工作区并行。发布冻结工作区不维护活动 Change 记录，但 `S` 的快照可以包含已提交的 Change 文件。
4. **按当前基线中的稳定提交解除依赖。** 未提交 working tree、测试结果或基线以外的提交不足以解除依赖。
5. **共享 owner 串行提交。** package、Gate、Case、lockfile 或稳定文档的交叉改动按任务隔离、复核和提交，不包含其它任务的未完成改动。
6. **先语义复核，再刷新 Plan。** Git 距离非零本身不要求机械重写 `baseCommit`；确认当前 Plan 仍成立后再运行 `plan`。
7. **每项 Change 独立验收和提交。** owner 交接、验证与任务闭合后，只有取得当前任务的明确删除授权才运行 `finalize`。
8. **前置变化后复核下游。** 上游在 `main` 更新后，下游重新确认假设并运行受影响验证。正式发布的 source/tag 与发布后修正、交接合回 `main` 的特殊顺序，以 [Package release](../tooling/package-release.md#发布工作区冻结源与交接) 为准。

## 维护与验证

当前 Change 新增、退出、stage 或 Outcome 改变，硬前置完成，条件分支激活，或实际冲突改变并行边界时更新本文：

1. 运行 `bun run change-plan -- list changes` 和 `bun run change-plan -- check-all changes`。
2. 读取发生变化的目标 artifacts，只维护当前依赖、允许工作、轨道和执行顺序；不复制动态任务计数或已完成材料。
3. 运行 `bun run validate -- materials`、`bun run decisions -- check` 和 `git diff --check`。
