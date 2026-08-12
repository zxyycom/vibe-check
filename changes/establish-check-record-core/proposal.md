# Proposal

本 Change 通过一次 single-active hard cut 建立运行时解析的 Check / QualityRecord 产品核心；四个内部检查点只控制实施顺序和证据，不形成可发布的中间状态。

## Why

本 Change 启动时的产品基线以 `CapabilityResult`、`QualityMetrics`、warning channels 和固定 gate reducer 串联 file、function 与 duplicate measurement。该基线要求 Core 理解每项检查的领域数据、warning 和完整性分支，且“执行失败”“领域判断失败”“逐条证据已产生”无法独立表达，因此需要建立通用 Check / Record 边界。当前稳定产品事实已由本 Change 同步到下列 owner；本段只保存开展 Change 的形成时理由，不描述现行 runtime。

## Outcome

一次 invocation 在 work 前验证并冻结公共 Check / record-type catalog、一对一私有 execution bindings、selection、applicability、domain work、named references 与 selected policy。私有 execution 只通过 manager-owned ports 产生最终 Core snapshot：CheckManager 拥有每个 `CheckRun` / `CheckResult` 与 coverage，RecordManager 拥有逐条 `QualityRecord`、稳定 identity 和 integrity；已有效提交的 records 不会因稍后的 runner failure 被撤销。Named reference identities / facts 与该 snapshot 分离；`DecisionPolicy` 同时消费两者并产生 decision evidence 与 `GateResult`。Output 再把 snapshot、reference inputs 和 decision evidence 组合成一个 validated publication model，供 CLI、machine output、report、console 和 annotation 投影。

实施依次锁定 foundation contract 与 policy / reference contract，以 `file-metrics` 打通真实纵向路径，再迁移其余 built-ins 与 policy；publication contract 锁定后执行 public hard cut。完成时，所有正式 consumer 只依赖新的 Core / publication facts，旧 capability、warning channel 和 machine-v1 路径全部退出。

## Scope

纳入范围：

- resolved `CheckDefinition` / record-type catalog、私有 `CheckExecutionBinding`、selection、applicability、domain-work handles、execution contribution / terminal report 和 CheckManager finalization；
- `QualityRecord` envelope、bound sink、稳定 `recordId`、幂等提交、冲突处理、canonical ordering 和 RecordManager snapshot；
- frozen named-reference handoff、closed declarative `DecisionPolicy`、acceptance / views / ordered readiness / `blockWhen` 与可审计 `GateResult`；
- 将 file metrics、function metrics 和 duplicate detection 迁移成 built-in Checks，并保持 current / baseline exact-input、source-scoped result、scanner-private payload / failure、cache 和 backend identity 边界；
- 将当前 `all`、`changed`、`regressions` gate intents 单向适配为 named policies，并把显式 `--baseline` 输入冻结为迁移期 named reference；
- 按 foundation contract、policy / reference contract、`file-metrics` walking skeleton、其余 built-ins / policy、publication contract 与 public hard cut 的顺序实施；前三个检查点只产生局部测试和审查证据，不是可发布或长期支持的产品状态；
- 在最终出口一次性切换 machine artifacts、report、console、annotation、CLI outcome、schemas、examples、fixtures、dogfood consumer、稳定 owner 文档和测试证据。

保持不变的相邻行为包括正式 `scan` / `init` routing、现有 scan flags 与 profile intent、显式 baseline 的 pre-work validation、`--verification-output` 只改变 accepted-record-aware 人读状态 / preview、process outcome 到 exit `0 | 1 | 2` 及 usage / config exit `3` 的映射，以及 `raw/**` 的 scanner-private diagnostic 定位。非目标包括：加载 TypeScript Project Definition；定义 TaskPlan、并发、资源、取消或动态任务注册；实现后续 Markdown、JSON、path、secret 或 network Checks；提供旧 machine / warning / capability 的双写、alias、兼容 reader 或 runtime rollback path。

## Success Criteria

- 公共 catalog 只含可序列化 metadata，私有 binding、runner、Task、scanner payload 和 executable material 不进入 catalog fingerprint、policy 或 output；每个 resolved Check 恰有一个 binding。
- `CheckResult.verdict` 是 closed `passed | failed | not-applicable`。`not-applicable` 只由 pre-work applicability 产生；`skipped` / `failed` run 的 `result = null`，`completed` run 恰有一个 result。Quality `failed` 是 lifecycle-complete，不等同于 execution failure；coverage 只来自冻结 domain-work handles 与 manager-owned acknowledgements。
- RecordManager 绑定 check / run provenance，使用不依赖当前位置的领域 identity；等价 duplicate submission 幂等，same-ID / different-body conflict 不采用 arrival winner。Invalid candidate、identity conflict 与 runner failure 的 retention、run failure 和 publication behavior 都由确定性 manager 规则及目标测试固定。
- `file-metrics` 内部纵向检查点证明 approved exact inputs、private binding、source-scope acceptance、CheckManager、RecordManager 与 in-memory final Core snapshot 能在一条真实路径上协作；该检查点不新增 public output、compatibility layer 或独立完成声明。
- `file-metrics`、`function-metrics`、`duplicate-detection` 及五个 record types 经新 Core 产生结果。每个 scanner-backed Check 只消费 Product-approved exact inputs；越界 source path 使对应 adapter result batch 在 Record conversion 前 fail closed，但不撤销此前已经独立验证并提交的 records。
- 当前 `all`、`changed`、`regressions` gate intent、acceptance、显式 baseline prerequisite、`GateResult` 的 `disabled | passed | failed | not-evaluated` 语义和 CLI exit mapping 在新 closed policy evaluator 上保持；Core 不保留固定 warning channel reducer。
- `Quality check status` 继续把 incomplete current snapshot 表达为 `failed`、no eligible current work 或任一 completed Check 的 quality `failed` verdict 表达为 `warning`、其余表达为 `passed`；`Quality verification status` 只把未被 acceptance 覆盖的 `all`-view records 计入 warning。`--verification-output` 不改变 snapshot、artifacts、GateResult、completion message 或 process outcome。
- Machine v2 以 `run.json` 与 `records.ndjson` 作为唯一 canonical machine set；`report.md`、console 和 annotation 使用同一 validated publication model，`raw/**` 仍不属于 public machine set。Runtime schemas 是 exact field owner，published schemas / examples 与实际 bytes 一致；artifact work开始后的 handled validation / publication failure清理 v2 canonical files、`report.md`、owned temps和同目录退休的 machine-v1 canonical files，不发布看似可信的部分 set。
- 目标模型、三道 contract lock、迁移矩阵、失败组合、deterministic ordering、CLI / readable output 和 consumer handoff 均有测试证据；项目规定的 product、docs、decision、test-evidence 与 workspace 验证通过。

## Affected Owners

- `docs/architecture.md`、`docs/quality-metrics.md`、`docs/output.md` 与 `docs/cli.md`：Core、决策、输出、publication evidence 和进程状态的当前稳定 owner。
- `docs/scan-scope.md`、`docs/scanner-dependencies.md` 与 `docs/configuration.md`：exact inputs、source-scoped handoff、私有 backend 以及迁移期 config / gate / reference adapter 边界。
- `src/product/quality-core/**`、`src/product/config*.ts`、`src/product/scan.ts`、`src/product/cli.ts`、`src/product/machine-output.ts` 与 `src/product/scanner-dependencies.ts`：唯一产品 runtime、public shallow boundary 和本 Change 的实施面。
- `scripts/quality/**` 与 `quality:*` package scripts：只消费正式产品入口或 validated machine set 的 dogfood / annotation boundary。
- `docs/testing.md`、`docs/testing/cases/**`、`docs/schemas/**`、`docs/examples/**` 与相关 product / consumer tests：语义证明、schema / example acceptance 和发布材料。
