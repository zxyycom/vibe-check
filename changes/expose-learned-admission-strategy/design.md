# Design

以现有 public prepared strategy 承接学习策略，把学习行为与调度执行责任分开。

## Context

用户已明确批准导出可配置策略工厂、删除专用 learned kind，并要求本仓使用相同公共接口。当前 provider 从 normalized checks/options/flags 构造 identity，使用私有 admission observer 与 learned diagnostic channel；public prepared author 已有 graph、decide context 和 terminal measurement。直接相关 owner 为 Project Definition、Architecture、Project Run 及 learned/private lifecycle 决策。

## Goals / Non-Goals

目标是普通调用方能以显式 import 和 hook 接线完整使用 learned 功能。非目标为算法 backfill、性能收益承诺、日志文件名调整、发布 manifest 静态化、旧产物清理或正式发布。

## Decisions

### Intended Change

- 工厂返回现有 prepared strategy shape，由 caller 放入 custom policy；不新增一种特殊 authoring grammar。
- history identity 通过 caller-owned 输入或投影显式提供，不从 Invocation 偷取 flags/options；存储和参数由 helper 自己验证。
- 准备、同步选择和终态记录只消费现有 public context；纯模型实现可复用，但不能获得调度控制或额外 lifecycle 权限。
- optional observation 由 helper/caller 拥有，观察失败不得改变 Check 结算；移除 Product 专有 learned diagnostic channel。
- 默认算法语义保持，少量模型参数以当前实际用途选取并由类型、文档、测试闭合。

### Resulting Impacts

- 删除旧 kind 会改变 declarative identity 与用户写法，采用用户已批准的无兼容迁移。
- 删除专有 diagnostic channel 必须同步 readback types、测试、文档与消费者，不静默保留 disabled 空壳。
- 转为 public custom path 会承受该路径已有测量开销；本次验证功能与边界，不把它宣称为原 private 性能基线。
- 既有优化 Plan 的 private seam、旧 callback shape 与 frozen baseline 不再能直接用于采用判断，需明确重新基线条件。
- 实施代理与文档代理分离文件所有权；主代理审查实际 diff，并统一 Case、决策、计划与最终完整验收。

## Risks / Trade-offs

public context 与旧 private inputs 不等价，identity、measurement 与 diagnostic 的遗漏会产生表面去特例而实质丢行为。参数增加应限定在真实模型用途。当前运行策略拒绝了 decisions list 和 change-plan list，计划生命周期与决策集合维护能否执行仍需实际验证，不以手改索引或 metadata 绕过。

## Open Questions

契约已收敛为 `createLearnedCriticalPathStrategy(options)`：必填 absolute `stateDirectory` 与
`identityForTask(publicTask)`，可选 `sampleWindow`（1–32，默认 32）、`maxHistorySeries`
（1–4096，默认 4096）、正有限 `coldStartDurationMs`（默认 1）和 caller-owned `observe`。
参数错误在 factory throw；identity/setup failure 回退 static；history read failure 为 cold history；
record/write failure 不改变 Run facts。observer 是不等待且包含 throw/rejection 的 best-effort sink，
`selection-proposed` 只表示提议，不表示 Scheduler 已接受 admission。core flags 诊断统一保留摘要，
不再通过 learned kind 特判保护。完整契约由 scheduling guide 拥有。

当前无产品方向性待决事项；没有旧 kind 兼容或发布授权。治理工具被拒绝执行，Change 保持 draft，
新决策保持 candidate；它们不是已生效长期决策集合，实施授权来自本次用户明确批准。
