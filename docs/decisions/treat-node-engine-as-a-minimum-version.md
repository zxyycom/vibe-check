---
title: 将 Node package engine 作为最低版本约束
id: 260906-treat-node-engine-as-a-minimum-version
status: active
alignment: aligned
createdAt: 2026-09-06T13:15:40Z
purpose: 让 package 声明最低 Node 能力要求，不以未经证实的主版本上限阻止 consumer。
background: 实际验收版本与兼容范围是不同事实；现有 Node 25 上限没有已确认的不兼容依据。
decision: Node-only package 使用 `>=24.18`；验收单独记录实际 runtime，版本排除必须依据兼容证据。
tags:
  - product-contract
  - product-priority
relations:
  - type: 修订
    target: 260906-support-node-as-the-package-host
---

## 目的

- 让 package manifest 表达 Product 所需的最低 Node 运行条件，同时允许更高 Node 版本参与消费和后续验收。
- 将声明的最低版本与当前实际执行的 acceptance runtime 分开记录，避免从一条测试基线推导未经证明的最高版本。

## 背景

- 当前 Product 只支持 Node host，repository scripts、test runner、Test Evidence、Project Gate 和 package build/install tooling 仍可由 Bun 执行；这些既有责任边界不因 engine range 调整而改变。
- 当前 exact installed-candidate acceptance 实际使用 mise 锁定的 Node 24.18.0，并在结果中记录 `process.version` 与 null Bun version。
- `>=24.18 <25` 同时表达最低能力要求和 Node 25 排除，但当前没有 Node 25 或更高版本的不兼容证据支持该排除。
- 把 manifest 精确锁定为 24.18.0 会阻止 consumer 使用后续补丁版本；把实际验收版本冒充完整兼容集合也不能提高证据强度。

## 决策

- 采用: 公开 package 的唯一受支持宿主继续是 Node，generated manifest 的 `engines.node` 使用最低版本范围 `>=24.18`，不设置未经兼容证据支持的最高版本。
- 采用: Exact installed-candidate acceptance 必须继续记录并校验实际 Node runtime；当前锁定的 24.18.0 只证明该执行基线，不声称所有更高版本都已经运行过同一验收。
- 采用: Consumer documentation、formal receipt、artifact audit 和测试材料必须区分“最低版本要求”与“实际验证版本”，不得把 engine range 描述成穷尽测试矩阵。
- 采用: 若未来版本出现可复现的不兼容，先以实际失败和 owner 分析确定影响范围，再通过新的 Decision 与验证证据增加有界排除；不预防性封闭未来 Node major。
- 采用: Product production runtime、Bun repository tooling、Worker acceptance 和平台缺陷处理继续遵守现有 Node host successor 的其余边界。
