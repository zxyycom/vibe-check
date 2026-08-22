---
title: 网络 Check 使用 Check-owned 显式授权
status: active
alignment: unaligned
createdAt: 2026-08-22T05:52:32Z
purpose: 让 Product-owned 网络 Check 只在普通 Check 的显式、可审阅 opt-in 配置下运行，并保持安全边界和 Run 结论分层。
background: 网络权限应由 Check options 显式表达；Product 不提供共享输入或选择层，结论只来自显式 aggregation。
decision: 网络 capability 由 Check-owned opt-in options 授权；Check 返回四态事实，调用方按 explicit aggregation 决定多 Check 结论。
tags:
  - product-contract
relations:
  - type: 修订
    target: require-explicit-network-check-authorization.md
---

## 目的

- 让 Product-owned 网络 Check 在 project author 明确选择并可审阅的普通 Check 配置下才有网络权限，默认和缺失 opt-in 都保持离线。
- 保留网络 target、credential propagation、request resource 与失败处理的安全边界，而不把它们提升为所有 Check 的共享 Run capability。
- 让网络 Check 的领域结论、Run 的多 Check aggregation 与 Project Gate 的 exit mapping 各自保持独立 owner。

## 背景

- DNS、HTTP、redirect 和环境网络状态会引入 SSRF、ambient credentials、临时故障与不可复现结果。
- 当前 Project Definition 只组合普通 Checks；Product 没有 shared baseline/reference channel 或 selection layer，而 Check 已拥有自己的 closed options 和 execution dependencies。
- 一个网络 Check 的正常领域结论、其自身不可用原因和 Gate 对多 Check 的结论不是同一事实；Run aggregation 只消费 selected settled Check statuses。

## 决策

- 采用：未来 Product-owned 网络 Check 必须把网络 opt-in 表达为自己的 closed Check-owned options；neutral/default composition 以及缺失、无效或未启用的 opt-in 均不得发起网络请求。CLI profile、Gate 名称、环境变量或 Check registration 不得隐式提升该权限。
- 采用：网络 Check 自己拥有目标限制、凭据传播和请求资源的安全 transport boundary；精确 allowlist、redirect、timeout 和诊断字段只在出现实际 Check consumer 时作为该 Check 的独立设计细化。
- 采用：producing Check 以当前四态 result 结算自己的网络工作，并仅提交安全的 supplemental Records；transport、依赖或执行不确定性按 owning Check 的 `unavailable` semantics 表达，不伪造 normal result。
- 采用：需要一个多 Check conclusion 的项目调用方明确配置 `RunControls.checkAggregation` 并消费 `RunResult.aggregate`；aggregation 只从 selected settled Check statuses 得出结果，不读取网络 Record data 或代替 Check 的安全判断。
- 采用：此授权只约束 Product-owned 网络 implementation。项目 author 自己编写的 Check function 仍处于可信 project-code execution boundary，不因其出现在 Project Definition 中而获得 Product sandbox 或网络 authorization 断言。
- 不采用：shared network authorization channel、Product-wide selection layer、普通离线链接 Check 自动访问网络，或由 Core/Record completeness/实时公共站点结果推断质量结论。
