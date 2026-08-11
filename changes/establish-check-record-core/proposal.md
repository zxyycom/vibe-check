# Proposal

本 Change 计划把当前 capability、warning 与固定 gate pipeline 重建为彼此独立的 Check 与 QualityRecord 产品核心；在进入 implementation 前，proposal 仍可随同一目标的事实核对而修订。

## Why

当前产品以 `CapabilityResult`、`QualityMetrics`、warning channels 和固定 gate reducer 串联 file、function 与 duplicate measurement。新增内置或项目自定义检查时，Core 仍需理解每项检查的领域数据、warning 和完整性分支，且“执行失败”“领域判断失败”“逐条证据已产生”无法独立表达。Vibe Check 需要先建立通用 Check/Record 边界，后续 Project Definition、TaskPlan 和格式检查才能只接入各自拥有的实现与记录语义。

## Outcome

一次 invocation 在执行前形成冻结的公共 Check/record-type catalog 与一对一私有 execution bindings。`CheckRun`、`CheckResult` 和逐条 `QualityRecord` 分别由 CheckManager 与 RecordManager 管理；已有效提交的记录不会因稍后的 runner failure 被撤销。声明式 `DecisionPolicy`、CLI、machine output、report 和 annotation 只消费同一最终快照，不再依赖旧 capability、warning channel 或 machine-v1 事实源。

## Scope

纳入范围：

- resolved `CheckDefinition` / record-type catalog、私有 `CheckExecutionBinding`、selection、applicability、domain-work handles、execution contribution/report 和 CheckManager finalization；
- `QualityRecord` envelope、bound sink、稳定 identity、幂等提交、冲突处理、canonical ordering 和 RecordManager snapshot；
- closed declarative `DecisionPolicy`、显式 named reference handoff 与可审计的 `GateResult`；
- 将 file metrics、function metrics 和 duplicate detection 迁移成 built-in Checks，并一次性迁移 CLI、machine artifacts、report、console、annotation、schemas、examples 与 fixtures；
- 同步当前 owner 文档和测试证据，使后续 Change 只能通过冻结 catalog、私有 binding、record sink 与最终 snapshot 接入。

非目标：加载 TypeScript Project Definition；定义 TaskPlan、并发、资源、取消或动态任务注册；实现后续 Markdown、JSON、path、secret 或 network Checks；提供旧 machine/warning/capability 的双写、alias 或兼容 reader。

## Success Criteria

- 公共 catalog 只含可序列化 metadata，私有 binding 与 executable payload 不进入 fingerprint、policy 或 output；每个 resolved Check 恰有一个 binding。
- `CheckResult.verdict` 是 closed `passed | failed | not-applicable`；`not-applicable` 只由 pre-work applicability 产生，applicable execution 只能返回 `passed | failed`。`skipped` / `failed` run 的 `result = null`，`completed` run 恰有一个 result；quality `failed` 仍是 lifecycle-complete，不等同于 execution failure。Coverage 只来自冻结的 domain-work handles 与 manager-owned acknowledgements。
- RecordManager 绑定 check/run provenance，使用不依赖当前位置的领域 identity；等价重复提交幂等，same-ID/different-body 冲突不采用 arrival winner，并阻止可信 publication。
- `file-metrics`、`function-metrics`、`duplicate-detection` 及其 record types 经新 Core 产生结果；旧 capability/completeness、warning channels 和 machine v1 路径不可达。
- 一个经验证的最终 Check/Record/policy snapshot 同时驱动 gate、machine `run.json` / `records.ndjson`、report、console 和 annotation，且所有 public schema/example 与实际 bytes 一致。
- 目标模型、迁移矩阵、失败组合、deterministic ordering、CLI exit 和 consumer handoff 均有测试证据；项目规定的 product、docs、decision、test-evidence 与 workspace 验证通过。

## Affected Owners

- `docs/architecture.md`、`docs/quality-metrics.md`、`docs/output.md` 与 `docs/cli.md`：Core、决策、输出和进程状态的当前稳定 owner。
- `docs/scan-scope.md`、`docs/scanner-dependencies.md` 与 `docs/configuration.md`：exact inputs、私有 backend 以及迁移期间 current config 到 resolved catalog/policy 的边界。
- `src/product/**`：唯一产品 runtime owner，包括 model、execution、scanner adapters、output、CLI、schemas 和 public shallow exports。
- `docs/testing.md`、`docs/testing/cases/**`、`docs/schemas/**`、`docs/examples/**` 与相关 product/consumer tests：语义证明和发布材料。
