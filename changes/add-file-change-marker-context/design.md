# Design

本设计将采集、可发布事实、execution composition 与派生查询索引分层，保留非侵入式接线并把未决公共语义留在 Draft 收敛。

## Context

- **Long-term direction:** [`provide-file-change-marker-context.md`](../../docs/decisions/provide-file-change-marker-context.md) 承接本 Change 的方向，并遵守已对齐的 [`drive-run-from-check-owned-inputs-and-explicit-providers.md`](../../docs/decisions/drive-run-from-check-owned-inputs-and-explicit-providers.md)：changed-file facts 属于显式 producing Check。
- **Reusable composition:** [`check-dependencies.md`](../../docs/guides/check-dependencies.md) 已定义 ordinary typed provider、direct `dependsOn`、`dependencies.get` 与 synchronous parser；[`extending-check-lifecycle.md`](../../docs/guides/extending-check-lifecycle.md)拥有 Product callback context、preflight 和 execution failure 边界。
- **Facts boundary:** [`api-mechanics.md`](../../docs/api-mechanics.md#terminal-resultrecords-与-messages)与 [`check-results.md`](../../docs/development/check-results.md)要求 canonical final data 只保存可发布 JSON facts。Dependency view 从 settled facts 读取数据，但 public contract 不保证多个 consumer 可依赖同一 object identity。
- **Consumer operations:** 本 Change 承接 marker 判断、按 marker/kind 列出变更、按路径查询，以及多个 dependent 读取同一 provider。Provider 拥有 source、baseline 与 marker matching；dependent execution 拥有是否执行领域工作及其终态。

## Goals / Non-Goals

### Goals

- 一次可信采集形成 typed、versioned、稳定排序且可发布的文件变更事实。
- 以普通 execution wrapper 提供类型精确、冻结且只读的 `change` 查询工具，同时保持 relation 与 Check lifecycle 显式。
- 用查询抽象隔离索引布局，并在代表性 workload 上先建立 baseline，再决定 lazy index、memoization 与性能 guard。
- 让 package consumer 仅凭随包文档、声明和示例即可选择 provider、声明依赖、处理失败并查询变更。

### Non-Goals / Responsibility Boundaries

| Owner | 本 Change 中的责任 |
| --- | --- |
| Provider Check | 采集并规范化文件变更，解释 source、baseline、marker rules、取消与可信失败。 |
| Canonical data | 作为唯一可发布事实，保存 normalized changes 与紧凑 `changedMarkers`。 |
| Wrapper | 读取并解析 provider data，构造冻结 query，再调用实际 execution。 |
| Dependent Check | 显式声明 `dependsOn`，拥有 preflight、适用性判断、领域工作、终态与 aggregation。 |
| Private query/index | 加速读取但不进入 Core、Run Controls、Product callback context 或 machine schema；cache miss 不改变结果。 |
| Performance evidence | 先定义并运行可复现 baseline，再决定索引、缓存和 guard；Draft 不预设 wall-clock budget。 |

## Decisions

### Intended Change

1. **Provider and facts.** 从 package root 导出 file-change marker constructor（工作名 `fileChangeMarkers(...)`）及必要 types。它返回带 synchronous `parseData` 的 ordinary Check；options 显式声明 source、baseline 与 marker rules。Versioned data 保存稳定排序、去重的 normalized `changes` 及其 `changedMarkers` 并集。可信的零变更为 `passed`；无法取得或验证 source/baseline 时为带稳定 reason 的 `unavailable`。
2. **Execution composition.** 从 package root 导出工作名 `withFileChanges(provider, execution)`，返回 ordinary `CheckExecution`。Wrapper 从 `context.dependencies` 读取 provider、调用 parser、构造 query，并把冻结的 `{ ...context, change }` 交给实际 execution；caller 在外围 Check 显式写 `dependsOn: [provider.checkId]`。
3. **Failure ownership.** Wrapper 只捕获 dependency read、provider parse 与 query construction 失败，并在这些情况下不调用实际 execution。实际 execution 位于 catch 之外；preflight、throw/reject、malformed result、Records 与 messages 保持现有 owner 和结算语义。
4. **Query and index.** 查询候选覆盖 `any()`、`hasMarker(marker)`、`files({ markers?, kinds? })`、`forPath(path)`、`markers()` 与 `count()`；进入 Plan 前用类型化 authoring cases 冻结名称、filter 和返回 shape。公共 query 与返回数组冻结，`Set`/`Map` 留在 package-private closure。实现可惰性建立详细索引，并以 canonical dependency object 为 `WeakMap` key 机会式复用；cache miss 只影响成本。
5. **Performance readiness.** 在选择索引前，以同一 harness 比较 linear scan、per-consumer eager index 和 lazy/memoized candidates。Workload 固定 runtime/profile、fixture generator、warm/cold 规则与采样方式，覆盖 zero/small/representative-large/stress changes、marker fan-out、consumer count 及 has/list/path/mixed queries。证据分别记录 provider normalization、settlement canonicalization、dependency parse、index/query、峰值或保留内存与 machine bytes/time。
6. **Adoption and delivery.** 先判断候选收益是否超过测量噪声，再选择 timing budget、结构性 build-count guard 或可复跑 observation。实施时同步 package exports/JSDoc、README/navigation、dependency 与 custom-Check guides、API mechanics、architecture/project-definition/check-results owners、changelog、package material、installed-consumer example 及实际受影响的 schema/evidence。

### Resulting Impacts

- **Public contract and acquisition:** constructor options、marker inference、data version、query types、reason codes 与 wrapper signature 成为兼容面。Producing owner 需完整定义 tracked/untracked/staged/working-tree、outside-root、rename/delete、path normalization、symlink、I/O failure 与 cancellation。
- **Dependency lifecycle:** helper 继续受 normalized direct relation authorization；未声明 relation 时返回确定的 unavailable。Provider non-passed 时，现有 Scheduler 可以在 wrapper 前阻止 dependent author work。
- **Facts and performance:** Core、RunResult 与 machine publication 只消费 canonical data；`changedMarkers` 必须与 normalized facts 一致。Baseline 同时计算 serialized size、canonicalization、cache lifecycle、fan-out 与 memory retention，派生索引不增加 schema 字段或第二 facts store。
- **Documentation and evidence:** 用户材料需覆盖 provider 配置、显式 `dependsOn`、wrapper、query、zero-change/unavailable、取消、安全与性能边界；维护者材料说明 owner 分工。Type/runtime/installed-consumer tests 与 Semantic Cases 证明 inference、normalization、四态、failure containment、preflight order、query、ordering、publication 和 workload identity。

## Risks / Trade-offs

- `changedMarkers` 复制 per-change marker 的并集，但直接服务最常见的 should-run 查询；parser 验证一致性，baseline 核对其查询收益与额外 bytes。
- Lazy index 降低 has-only consumer 成本，却会让首个详细查询承担冷启动；eager index 相反。只有真实查询组合能决定默认策略。
- `WeakMap` 可在当前同引用路径上减少重复解析，但不是稳定共享保证；把它升级为保证会需要新的 invocation-private handoff 或 facts-store 责任，本 Change 不隐式引入。
- 一个过宽 query surface 会冻结未经使用的操作；一个只返回数组的过窄 surface 又会把索引选择泄漏给 consumer，因此进入 Plan 前必须用代表性 authoring cases 收敛方法与 filter 语义。

## Open Questions

| Topic | 进入 Plan 前必须确定 |
| --- | --- |
| Source and baseline | 选择封闭 Git/filesystem 配置、受信 source callback 或可辨别 union；定义无 Git 仓库、staged/unstaged/untracked 与 filesystem-only changes。 |
| Path and rename | 定义 root、case、separator、outside-root、symlink、old/new path，以及 `forPath` 对 rename 的匹配规则。 |
| Marker rules | 选择 glob/include-exclude、受信 callback 或封闭声明式 grammar，并定义 rule 合并、顺序、重复与无 marker change。 |
| Query contract | 定义多 marker 的 union/intersection、每项 markers、`kind` 词汇及 query/reason 的最终公共命名。 |
| Performance gate | 固定 representative-large 规模、host/profile 与采样协议；依据 baseline 选择 timing/memory budget、结构性 guard 或 observation。 |
