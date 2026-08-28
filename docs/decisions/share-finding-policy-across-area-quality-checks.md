---
title: 在区域质量 Check 间共享 Finding 阻断政策
status: active
alignment: aligned
createdAt: 2026-08-28T11:14:38Z
purpose: 让三个基于 area 的质量 Check 完整保留 findings，并用同一 policy 决定哪些 finding 使 owning Check failed。
background: 三个 Check 都产生 area-owned quality findings，但只有 function metrics 能将 finding 保留为 non-blocking 证据。
decision: 三个 Check 共用 blocking/non-blocking、overlap 与计数规则；Core 不建立 Finding 模型。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让项目用同一 policy 取值决定三个主要代码质量 Check 的 findings 是阻断结论还是只保留证据。
- 让所有可信 findings 都形成完整 Records 和稳定计数，不把 non-blocking 误解为忽略或遇到首项后停止。
- 在真实共享语义所在的 package code-quality 层复用规则，同时保持 arbitrary custom Check 的领域自由。

## 背景

- `duplicateDetection`、`fileMetrics` 与 `functionMetrics` 都以 code areas 组织文件选择和领域阈值，并将超限或重复结果发布为 supplemental Records。
- function metrics 已有顶层默认值、area override、任一 matching area blocking、完整 Record 和 `blockingFindingCount`；file metrics 与 duplicate detection 在实施前会让任一 finding 直接使 Check failed。
- Core Record data 是 Check-owned arbitrary canonical object，Record 是否存在或包含何种字段不决定 terminal status。preflight block、Check failed 与 Gate process exit 也属于不同责任层。

## 决策

- 采用: package code-quality owner 提供共享 `FindingPolicy = "blocking" | "non-blocking"`、默认值、合法值校验、matching-area 合并和 Finding 计数能力；不把这些字段加入 ordinary Core Check grammar。
- 采用: 三个 constructor 都接受可省略的顶层 `findingPolicy`，默认 `blocking`；每个显式 code area 可以省略并继承顶层值，resolved area 物化自己的有效 policy。
- 采用: 一个 finding 涉及多个 matching areas 时，只要任一 area 的有效 policy 是 `blocking`，该 finding 就是 blocking；authoring order、最严格 threshold 来源与 scanner 返回顺序不改变该判断。
- 采用: 可信 findings 无论 policy 都完整发布 supplemental Record，每条 Record 明确保存 `blocking`；扫描、conversion 与后续 Record 不因首个 blocking finding 短路。
- 采用: 三个 Check 的正常 final data 恰为 `{ findingCount, blockingFindingCount }`。blocking count 非零时 outcome 为 `failed`，否则为 `passed`；zero input 与执行不可用仍分别使用 `not-applicable` 与 `unavailable`。
- 采用: shared code 只拥有上述稳定政策与汇总，不拥有各 Check 的 threshold、scanner protocol、candidate shape、Record identity、其它 Record fields 或 unavailable vocabulary。
- 不采用: Product-wide Finding registry、从 arbitrary Records 反推 Check status、用 `blocking` 停止 scheduler、把 preflight `action: "block"` 与 normal failed outcome 合并，或让 Finding policy 隐式决定 Gate aggregation 与 process exit。
