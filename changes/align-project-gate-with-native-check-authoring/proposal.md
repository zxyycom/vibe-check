# Proposal

本 Draft 在 repository hard cutover 后优化权威 Project Gate 的 authoring model：让 Gate catalog 组合普通 public `Check` values，并把 process execution 降级为可选项目 helper。它保持已经切换的 root/CI bindings，不恢复 legacy verifier。

## Why

当前 Gate 运行、候选 identity、profile/tag eligibility、progress、transcript 与 exit closure 已经通过验收，但 `ProjectGateCheckDescriptor` 又定义了一套只适合 command/args 的项目私有 Check shape。所有 catalog entries 都必须先写成 process descriptor，再由 `createProcessCheck()` 转成 public `Check`；Gate 因而没有真实 dogfood 自定义 execution、typed options、多 Record types 与普通 Check composition。

process runner、取消和 transcript mapping 具有明确复用价值，但不应成为 Gate 唯一 authoring surface。初建期间用于锁定迁移快照的 `20 / 14 / 19` runtime cardinality checks 也已被 focused tests、structural validation 和 required/full acceptance 取代；继续保留只会把派生数量误作永久门禁规则。

## Outcome

完成后，Project Gate catalog 的每个 entry 直接持有一个普通 public `Check` 及 Gate-owned profile/tag selection metadata。普通命令可以通过返回 `Check` 的 local `processCheck()` helper 保留现有 cancellation/transcript/failure semantics，自定义 Check 可以直接使用完整 public authoring surface。Gate 不再强制固定 catalog/profile 数量；项目内提供一条简短、可定位的添加路径，并在 typed Record、首版 result presentation 与 package API documentation 收敛后写出绑定当前 exact artifact 的 <code>gate-optimization-handoff.md</code>，供公开发布使用。
