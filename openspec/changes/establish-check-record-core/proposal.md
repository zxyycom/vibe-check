> **核心句：**本 change 建立彼此独立的 Check 与 Record 产品核心：Check 表达一次检查及其执行和质量结论，Record 表达该检查逐条提交的最终领域数据，决策与输出只消费两者的最终快照。

## Why

当前产品把内置 measurement capability、warning 生成、整体完整性和固定 gate channel 绑定在同一条 pipeline 中，新增 Markdown、JSON 或项目自定义检查时仍需让 Core 理解领域结果。Vibe Check 要成为可扩展的项目检查系统，必须先把“检查是否正常执行并得到什么结论”与“检查发现了哪些具体数据”拆成稳定、通用且可独立消费的产品对象。

## What Changes

- 新增冻结的 resolved Check catalog；可序列化 `CheckDefinition` 与 private `CheckExecutionBinding` 一对一分离，二者可由内置来源以及后续受信任 project definition 贡献，本 change 不加载 TypeScript module 或第三方代码。
- 新增独立的 Check 管理边界：binding 产生 Core 不解释的 `CheckExecutionContribution`，coordinator 返回穷尽 terminal `ExecutionReport`；current `CheckRunner` 只是 direct binding adapter。Core 通过受控 record sink 和 incremental domain-work acknowledgement port 创建并 finalize `CheckRun`，执行失败与 `passed | failed | not-applicable` 质量 verdict 不再混为一个状态。
- 在 execution 前冻结 selection 与 applicability：skipped 和 not-applicable 不进入 coordinator，applicable zero-work 仍由 binding 执行并返回领域结果。
- 新增独立的 Record 管理边界：runner 通过绑定所属 check/run 的 sink 逐条提交 final `QualityRecord`；Core 验证公共 envelope 与 resolved catalog，但不重新判断领域 level、message、typed data 或 comparison relation。
- 让 record commit 与 check completion 相互独立；后续 runner、work 或普通 record protocol failure 不撤销此前 valid records。同 ID 同 body 提交幂等，同 ID 不同 body 成为 arrival-neutral integrity conflict 并阻止可信 artifact publication。
- 为后续全局任务编排保留一次性 opaque contribution batch handoff；本 change 不定义 `TaskPlan`、依赖图、并发、资源互斥、取消或 drain，也不允许执行中注册 check 或让 Task identity 成为 public coverage。
- 保留一个 closed normalized `DecisionPolicy` evaluator，以声明式 query/reducer/acceptance/view/gate 组合 immutable Check 与 Record snapshots；public TypeScript authoring 由后续 project-definition/config change 拥有。
- **BREAKING:** 现有 file metrics、function metrics 与 duplicate detection 迁移为 built-in Checks，并删除旧 capability result、overall completeness、warning/channel 与固定 gate reducer。
- **BREAKING:** machine contract hard cut 为同源的 `run.json`、`records.ndjson` 和 `report.md`，CLI gate 只选择 resolved named policy；不保留 machine v1、warning stream、旧 channel 或 alias。
- 后续 project-definition、task-orchestration 及 Markdown/JSON/network 等 feature changes 必须在实施前以本 contract 为依赖重新收敛；本 change 不替这些尚未实施的能力固定领域字段、算法或测试矩阵。

## Capabilities

### New Capabilities

- `quality-checks`: public `CheckDefinition` catalog、private execution binding/contribution、`ExecutionReport`、incremental acknowledgement、`CheckRun`、`CheckResult` 与 manager ownership。
- `quality-records`: `QualityRecord` envelope、record type catalog、逐条 sink commit、稳定 identity、归属关系和 canonical ordering。
- `quality-decision-policy`: 对 Check/Record snapshots 执行 acceptance、named views、closed reducers 与 gate decision 的 normalized declarative contract。

### Modified Capabilities

- `scan-completeness`: 将旧 capability/overall reducer 改为 invocation-wide terminal CheckRun set 与 lossless coverage summary owner，不产生 overall 质量 verdict。
- `quality-metrics`: 现有 file/function/duplication 行为改为 built-in CheckRunner 与 final records，不再拥有 warning channels 或 gate reducer。
- `structural-scanning`: function scanner adapter 改为 built-in check 的私有 dependency，并向其 runner 返回领域输入而不是 public capability result。
- `duplicate-scanning`: duplicate adapter 改为 built-in check 的私有 dependency，并向其 runner 返回领域输入而不是 public capability result。
- `scan-scope`: 一次 normalized inventory 为内置 checks 构造 resolved inputs；scope owner 不承担动态 definition 或任务编排。
- `scanner-dependencies`: backend failure 归一化为所属 CheckRun 的 execution diagnostic，并保留此前 committed records。
- `output-contract`: console、machine、report 与 annotation 从同一 CheckRun/CheckResult/QualityRecord/decision snapshot 投影 current v2 contract。
- `cli-contract`: `--gate` 选择 resolved named policy，process exit 区分质量 decision、check execution data 与 Product/output failure。
- `test-fixtures`: acceptance、canonical examples、schema drift 与 consumer handoff 迁移到 Check/Record/Decision contract。

## Impact

- Product Core：新增 CheckManager、RecordManager、public catalog/private binding resolution、opaque contribution/report seam、incremental acknowledgement、bound record sink、run finalization 与 decision evaluator。
- Existing checks/adapters：file、function、duplicate 的领域判断和结果生产边界迁移，底层 scanner dependency 继续保持私有。
- Public output：runtime schemas、DTO、serializer、validator、report、console 和 annotation consumer 统一迁移到 machine v2。
- CLI 与 dogfood：`--gate`、reference planning、help、artifact paths 与 exit mapping 同步迁移；仓库 `quality:gate` 继续选择 built-in `regressions` policy。
- Active OpenSpec：task orchestration 与 TypeScript project definition 作为直接 follow-up；其它未实施 feature changes 只需声明依赖并在各自实现前细化。
