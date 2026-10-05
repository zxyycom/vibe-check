# Design

在 waiver materialization 的唯一入口提供空数组默认，保留完整 Finding reconciliation 与原有失败语义。

## Context

- 用户在字段精简建议后要求直接实施；本次范围为 `reconcileFindingWaivers(...).waivers`，其它候选不联动。
- [调查清单](inventory.md)记录实施前 required 类型与 runtime probe；这些形成时证据不是实施后的规范。
- [活动 waiver 判断](../../docs/decisions/provide-generic-finding-waiver-reconciliation.md)要求完整候选集、canonical identity 和可审计结果，不要求通过必填空数组表达无豁免。
- 实施起点工作树干净，Test Evidence 为 670 entities / 161 Cases；这些是形成时观察。现有 helper 相邻测试覆盖非空 waiver、冻结与 malformed 边界。
- 当前授权包括整理 Git 提交及照常执行已配置的自动推送 hook；正式发布与 Change 结项删除仍需另行授权。

## Goals / Non-Goals

目标：无豁免时免写空数组，原有显式数组行为不变；默认值只由 helper 拥有，调用方不需要自行分支或绕过 identity 校验。

非目标：放宽 findings/identify、改变其它 API 或 shared selection、增加配置框架、改变输出、持久化或扫描能力；正式发布与 Change 结项另行处理。

## Decisions

### Intended Change

1. authoring `waivers` 接受省略与显式 `undefined`，两者等同 `[]`；声明在 exactOptionalPropertyTypes 下显式包含 undefined，支持直接转交可选配置值。
2. private materialization 参数采用空数组默认，再复用现有 canonical array validation。`null` 和其它非法显式值不使用默认；内部 materialized waivers 始终是完整冻结数组。
3. 无 waiver 仍遍历 Finding 并验证每项 canonical identity，保留顺序与原引用。不得通过提前返回原 findings 绕过 reconciliation。
4. 公共指南说明 default、invalid 和结果边界；保持现有非空示例，并给出无豁免调用形态。内部 owner 只说明默认化责任并引用公开契约。

### Resulting Impacts

- 类型：已填写数组的调用无需修改；读取 `ReconcileFindingWaiversOptions["waivers"]` 的 consumer 会新增 undefined 分支。installed type fixture 同时验证 named input、泛型推断、undefined 与必填字段/非法 null 的拒绝。
- 行为：最窄测试证明 omission/undefined/[] 的 independent expected output、identity 调用、原引用与冻结；非法输入矩阵保留失败；现有非空 tests 继续回归。
- 验收：复用既有 isolated consumer 的一次 types/runtime 入口，不新建 runner。完整 Gate 证明 package artifact、安装后声明和行为；Case 证明内容与实体映射同步。
- 验收模块归属：consumer fixture 的 tsconfig 与 public-import source 由既有 `typecheck-fixture.ts` 构造，`type-acceptance.ts` 保留依赖隔离、写入与执行验收。具体模块职责见[包生命周期](../../docs/tooling/package-lifecycle.md#候选包安装与外部使用方验收)。
- 文档：用户指南、JSDoc、changelog 与内部 owner 同步；无需新增导出、README 路由、投影 region 或 machine schema。非实施代理基于实际 diff 反查。

## Risks / Trade-offs

- helper 接受 undefined 是本 API 的便捷传值约定，不修改 `changes.flags.*.exclude` 的自有 undefined 拒绝规则；不从同形字段推导全局默认政策。
- 不能用 `?? []` 将 null 悄悄变成无豁免，也不能因为无 waiver 而跳过非法 Finding identity。
- 其它候选的授权、默认范围和版本 pin 取舍不构成本次完成条件；未来按各 owner 独立决定。

## Open Questions

无阻塞本次实施的问题。collector、area files 和 bundled catalog 保留现状，后续建议与形成时依据留在 [inventory](inventory.md)。

## Implementation Observations

### 文档优化前的实施与验证记录

以下记录来自本轮 AI-ready 文档优化前的交付，证明当时的 tree/candidate；优化后需重新验证，任务进度见 [tasks](tasks.md)。

- 已落实可省略 waivers、显式 undefined 默认及非法值拒绝，同步 public JSDoc、用户指南、内部 owner、changelog、既有 Case 和安装后 fixture；没有新增公共导出或输出 schema。
- 新增 omission 矩阵在实施前失败，实施后锁定 Bun 的相邻回归 5/5 通过；consumer fixture profile 回归 1/1 通过。Case 从 670 增为 671 entities，仍由 161 Cases 闭合。
- Product/scripts typecheck、lint、899 文件格式检查、docs:api、validate（92 JSON、5 schemas、4 report examples、486 Markdown）、13/13 Change 与 353 Decision 检查通过。
- 首轮全 Gate 42/43 的唯一失败是 `type-acceptance.ts` 达到 503 code lines。纯 fixture 构造随后移入既有 fixture owner，迁移前后 template bytes 相同；未提高阈值或增加 waiver。readonly-array 类型负例改为写入 `length`，避免错误元素类型掩盖可变性回归。
- 复验 `bun run check -- --all` 对 exact local candidate `0.0.0-local.8e0a3c58ea59` 通过 43/43，包含 installed artifact/types/documentation/runtime，失败/not-applicable/unavailable 均为 0。证据目录：`.log/project-gate/2026-10-05T09-39-54.587Z-1090440-2f220bf7-2835-4c0f-a5d8-47082c7bad54/`。
- 非实施代理独立反查默认、非法值、声明、Case、文档及 fixture 迁移，未发现阻断，并复跑相邻回归与 Case 闭合。该交付时尚未 Git 暂存/提交、远端写入、正式发布或 Change 结项；此观察不限制后续已获授权的提交与 hook。

该次 Gate 有非阻断耗时告警（mean 2088.0ms > 2000ms，p95 5199.1ms > 5000ms）；本次范围不扩展为性能优化。

### 本轮规范优化与复验

- 按 ai-ready-docs 区分当前结果、未采纳候选与形成时观察；指南以“输入与默认值”提供稳定入口，内部 owner 只保留责任与引用，清单收敛重复说明和失效复现命令，安全、identity、授权与 catalog pin 边界保留。
- 按完整编码规范复核本次代码，未以近邻写法作为例外。私有 materialization 入口以 `unknown` 表达原始输入校验责任；测试同时断言 `TypeError` 与原 Finding 引用。公开行为和实体身份不变，fixture 构造与执行职责保持分离。
- 最窄 helper 与 installed types/runtime 回归 8/8、独立 helper 回归 5/5、layout target 1/1、Product/scripts typecheck 与 lint、format、docs:api、材料和 Case 检查通过。非实施代理基于实际 diff 复核完整规范，并用仅持公开指南或 Change 的读取任务确认默认、范围、授权与证据时点可恢复，无阻断或规范例外。
- 优化后的 `bun run check -- --all` 对 exact local candidate `0.0.0-local.260208b298af` 通过 43/43，33.2 秒，失败/not-applicable/unavailable 均为 0，包含 artifact、installed types/documentation/runtime；本次未触发耗时告警。证据目录：`.log/project-gate/2026-10-05T09-58-45.511Z-1139413-ae6aba3b-3f21-4cb8-a718-67229b6083e1/`。
- 提交按两个语义单元组织：先迁移类型 fixture 构造，再交付 waiver 可省略行为、证明与文档。现有 main 自动推送 hook 按用户确认正常执行；正式发布和 Change 结项不在本次授权内。
