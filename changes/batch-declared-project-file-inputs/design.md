# Design

本设计把 project-file selection 建模为 ordinary Check 的标准声明式输入，并在每次 invocation 的 effective selection 与 Scheduler author work 之间增加一次批量输入准备。

## Context

- [`project-files.md`](../../docs/development/project-files.md) 当前拥有 source/include/exclude、候选枚举、exact membership 和 package Check 使用方式；跨 Check 尚无共同 invocation input view。
- [`architecture.md`](../../docs/development/architecture.md) 当前的 Run 顺序是 Definition/graph validation、invocation-wide flag selection、Scheduler admission 和 task-local preflight/execution。Definition validation 必须继续不执行 workspace I/O。
- [`batch-declared-project-file-inputs-at-invocation-boundary.md`](../../docs/decisions/batch-declared-project-file-inputs-at-invocation-boundary.md) 已确定未来方向：Check 自含声明，Product 在 effective selection 后批量准备路径输入。
- [`keep-format-aware-check-capabilities-independent.md`](../../docs/decisions/keep-format-aware-check-capabilities-independent.md) 仍要求每项格式/风险能力独立拥有 eligibility、权限、解析、Finding 和结算。本 Change 只共享路径 selection/acquisition，不建立 generic scanner 或 Project-wide domain policy。
- Project Gate 四项 repository-quality Check 当前共有 11 份 filesystem selection。合并候选取得会减少目录读取；`git-worktree` 场景才会直接减少重复 Git process。

## Goals / Non-Goals

### Goals

- 让 Check 完整、低样板地声明自己的项目文件输入，并让 Product 对本次有效声明做 source-level batch acquisition。
- 保持完整 `ProjectFileSelection`、唯一 glob matcher、稳定排序去重、source failure 与公开 one-shot helper。
- 给路径 membership 定义每次 invocation 的明确 input cut，不把它扩大为内容原子快照或跨 Run cache。

### Non-Goals

- 不把 area、eligibility、bounded read、secret handling、scanner result、Finding 或 changed-path selection policy 移入通用输入层。

## Decisions

### Intended Change

1. **Check 声明。** 扩展 ordinary executable Check grammar，增加可选 `projectFiles` 字段。字段是从 Check-local slot name 到完整 `ProjectFileSelection` 的非空映射；它在 container 上非法且不可继承。
2. **定义身份。** Definition validation 以 descriptor-safe 方式校验并快照该字段，normalization 将其编入 Check declaration、declarative snapshot 和 fingerprint。Product 只解释 slot/selection 通用结构，不按 Check ID 或 options shape 寻找配置。
3. **随包构造器。** 随包 file-reading Check constructor 保留现有低样板输入，但在返回的 ordinary Check 上形成标准 `projectFiles`。area-based Check 使用 area ID 或内部稳定 slot 恢复 membership，Product 不赋予 slot 领域含义。
4. **调用边界。** 将 effective Check selection 收敛为 invocation 内可复用的纯结果。在静态 graph validation、root/controls 冻结和所有 pre-selection preparation 完成后形成 effective IDs，再进入 project-file input preparation barrier；Definition/graph 锁定本身不读取 workspace。
5. **命中即物化。** barrier 只聚合 effective Checks 的 selections，按 normalized source/include/exclude 去重并编译 matcher plans，同时保留每个 plan 的 Check ID/slot subscribers。每个 source 执行一次 candidate acquisition；每条 candidate 被观察时立即运行该 source 的 distinct matcher plans，并将命中直接追加到对应 subscribers 的 membership。barrier 最终只冻结、排序、去重已物化的 Check ID/slot path map；分发、context lookup 与 callback 不得重新执行 matcher，也不把全量 candidates 延迟到消费侧过滤。并行或未声明文件的 Checks 不获得其它 Check 的输入。
6. **Check 局部上下文。** 扩展 Product-owned Check context，仅向当前 Check 暴露已声明 slots 的排序去重 relative paths。这些路径不是 Check fact、dependency handoff、RunResult、machine output 或可持久 cache payload。
7. **来源失败。** acquisition failure 使声明该 source 的 effective Checks 在 author work 前以 Product-owned reason 结算 unavailable，其它 Checks 继续。取消在 barrier 之前、之中与之后的优先级需与现有 Run branch/Core closure 对齐。
8. **路径快照。** invocation path membership 在 barrier 完成时固定，每次 Run 重新收集。之后新增的路径不属于本轮，已选路径后续消失/不可读仍由 owning Check 结算；Product 不保证后续内容读取与 path acquisition 位于同一原子时刻。
9. **动态 consumer。** 需要消费同一 Run 内生成/修改后文件的 Check 在 prerequisite 结算后由 execution 调用命令式 `collectProjectFiles(...)`，不声明 invocation-bound `projectFiles`。该场景保持一个明确的动态收集阶段。
10. **Git 来源。** `git-worktree` batch 共享本 invocation 的 candidate 与收集所必需的最小 provenance，但不提供通用 `gitInfo`。changed-path facts 若影响 effective selection，必须在本 barrier 之前由 Project 根 change preparation 形成。
11. **性能证据。** 保留 Gate filesystem 与等价 git-worktree workload 的设计期 baseline；实施后重测结果集合、directory reads、Git commands、wall time、保留路径与 cancellation/failure 语义。

### Resulting Impacts

- `Check`、`defineCheck`、Definition parser/normalizer、declarative fingerprint 与 callback context 会扩展标准 file-input contract；public declarations、API mechanics、Project Definition/Run 文档和 custom Check 示例必须同步。
- 随包 file-reading constructors 需将已有公开 files/area authoring 投影到新字段，并使 execution 改用 Product-prepared paths。必须审阅 ordinary object composition 修改 `options` 后如何避免 selection 声明漂移。
- Invocation 流程会增加一个在 Scheduler author work 前的 Product-owned barrier，并需要将 effective selection、分 source failure settlement、diagnostics/progress 和 cancellation 与现有 Core/Scheduler 实现重新划界。
- `src/package-checks/project-files/**` 需从 package-check sibling helper 重划为中立输入机制 owner，但 eligibility、exact-input acceptance、各 scanner adapter 与 Check result owner 不移动。
- 测试需证明只收集 effective declarations、每 source 每 Run 一份 observation、相同 normalized selection 只执行一份 matcher plan、命中当场进入正确 Check/slot membership、context lookup 不再次调用 matcher、slot 隔离、不同 Run 重新取得、运行中新文件不扩大本轮 membership，并保持安全剪枝、Git submodule、source failure、取消、input rejection 与 scanner exact paths。

## Risks / Trade-offs

- 输入 barrier 是全局时间切点；为了不让早启动的 Check 改变收集结果，未声明文件的 Checks 也不能在 barrier 完成前开始 author work。这会增加首个 Check 的启动延迟。
- barrier 可能为后续因 dependency failure 而不会运行的 Check 提前收集输入；这是换取 source-level batch 复用的成本。
- 路径 membership 快照不防止外部进程在 Run 中修改 bytes。需要原子内容的 consumer 必须使用调用方提供的稳定 candidate/checkout，或在未来为内容快照形成独立的安全、内存与 eligibility 契约。
- distinct matcher plan 数仍随本次有效 selection 语义增加；预处理消除的是重复 plan 与消费时重跑，不承诺用一个正则表达全部 selection。实施基准必须同时记录 candidate 数、distinct plans 与 matcher evaluations，避免只用 directory/Git 调用次数掩盖 CPU 成本。
- 标准字段扩大 Core authoring grammar；若它继续只服务随包 Checks 而没有 custom Check consumer，则不应过早公开泛型类型参数或更广的 `inputs` registry。

## Open Questions

- `projectFiles` 的精确 type/slot grammar，以及 callback 是使用冻结 record、`get(slot)` 还是保留 key inference 的 typed view。
- 随包 constructor 的旧 `options.files`/`codeAreas[id].files` 在 materialized ordinary Check 上如何保持可组合且不与标准字段漂移。
- project-input failure 在 Core session 建立、flag-control settlement、progress 和 cancellation 之间的精确事件/结算顺序。
- matcher plan 的 canonical key 与内部 membership 表示（例如 subscriber list、整数索引或 bitset）应由 representative-large benchmark 决定；无论表示为何，均须满足命中时物化、消费时零 matcher 的外部不变量。
- 未来若有足够的同 Run 多阶段 consumer，是否新建显式 acquisition-epoch 契约，而不扩张初始 `projectFiles` 字段。

## Implementation Observations

### 2026-09-10 current repository baseline

环境为 WSL2 Linux x86_64、Bun 1.3.14、Git 2.53.0。Workload 使用 Project Gate 四项 repository-quality Check 的 11 份实际 selection，在同一 Bun process 中交错重复 7 次。current 保持四个 Check 各自 collection；batched 使用一次现有 private batch collection，并逐项 `deepEqual` 结果。

| Source | Current | Batched | Observation |
| --- | --- | --- | --- |
| filesystem | 680 次 `readdirSync`，median 261.851ms | 170 次 `readdirSync`，median 247.970ms | 目录读取降为四分之一；本机 wall time 减少约 13.9ms。 |
| `git-worktree` | 12 个逻辑 Git command，median 322.017ms | 3 个逻辑 Git command，median 258.336ms | 每组逻辑 command 为 `ls-files`、`rev-parse HEAD`、`ls-tree`。 |

这些数据是设计期 observation，不是 budget 或自动门禁。实施重测保持相同 selection/result assertion，并补 representative-large、submodule、source failure 与 cancellation workload；同时报告 distinct matcher plan 和 matcher evaluation 数，证明 callback/context 消费只查询已物化 membership。
