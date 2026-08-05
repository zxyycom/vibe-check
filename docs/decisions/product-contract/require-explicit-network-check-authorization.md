---
title: 网络 Check 必须获得显式声明式授权
status: active
alignment: unaligned
createdAt: 2026-08-05T11:15:25Z
purpose: 防止 Product-owned 网络检查被隐式启用，并保持网络安全、结果和执行失败语义可审阅。
background: Project Definition 可以组合 Check，但网络访问仍有 SSRF、环境权限、临时故障和不可复现风险。
decision: 中性定义保持离线；只有已验证 Project Definition 的声明式政策可授权网络 Check，结果由 CheckRun、QualityRecord 和 selected policy 表达。
relations:
  - type: 修订
    target: product-contract/require-explicit-network-link-checking.md
---

## 目的
- 让用户只在明确、可审阅的项目政策下启用 Product-owned 网络链接检查。
- 区分稳定的链接质量记录、网络执行不确定性和最终门禁选择，不建立隐式全局完整性结论。

## 背景
- DNS、HTTP、redirect 和环境网络状态会引入 SSRF、ambient credentials、临时故障与不可复现结果。
- TypeScript Project Definition 是新的 authoring owner，但 executable composition 本身不能代替对 Product-owned 网络能力的声明式授权。
- 网络执行失败与 Check 正常完成后产生的链接质量结论不是同一事实。

## 决策
- 采用: Product neutral definition 和缺失授权都保持离线；只有成功验证并冻结的 Project Definition 声明式 policy 可以显式授权对应网络 Check，CLI profile、gate 名称、环境变量或 Check 注册不得自动提升该权限。
- 采用: Product-owned 网络 Check 必须使用限制目标、凭据传播和请求资源的安全 transport boundary；精确算法与状态在该 feature 进入实现前重新细化。
- 采用: Producing Check 拥有网络结果的领域判断并输出 `CheckResult` 与安全的 `QualityRecord`；执行、依赖或 transport 不确定性由所属 `CheckRun` 如实表达，selected `DecisionPolicy` 决定是否阻断。
- 采用: 此授权只约束 Product-owned 网络 Check；受信任 custom runner 的网络权限遵循 Project Definition 代码执行边界，不能被误述为已由该政策 sandbox。
- 不采用: 普通离线链接检查直接访问网络，或由 Core 通过 overall completeness、固定 channel 或实时公共站点结果推断质量 verdict。
