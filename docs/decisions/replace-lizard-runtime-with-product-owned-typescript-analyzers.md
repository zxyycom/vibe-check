---
title: 以产品自有 TypeScript 分析器完整替换 Lizard runtime
status: active
alignment: aligned
createdAt: 2026-09-02T08:10:10Z
purpose: 让 functionMetrics 在保持完整函数测量能力的同时移除 Python、Lizard command 与公开 executable 配置。
background: 产品 owner 已确认完整 reader 迁移与后续维护；TypeScript hard cut、package/legal closure 与 required/full Gate 已验证。
decision: 以固定 Lizard 1.24.0 为当前 oracle，维持 source-aligned analyzer closure 与无外部 runtime hard cut。
tags:
  - configuration
  - dependency-policy
  - product-contract
  - product-priority
relations:
  - type: 归并
    target: defer-lizard-until-after-check-foundations.md
  - type: 归并
    target: let-function-metrics-adapter-own-lizard-cli-protocol.md
---

## 目的

- 让 Bun consumer 使用 `functionMetrics` 时不再准备 Python、Lizard package、外部 command 或 CSV protocol。
- 保持完整受支持语言和函数测量结果，而不是用只覆盖常见语言的局部实现交换分发便利。
- 让首轮实现可逐项对照上游并便于后续同步，不因迁移同时引入未经证明的 parser 优化或新公共抽象。

## 背景

- Check/Record、Project Definition、Check execution 和 owner-local scanner 边界已经形成，原先要求后置迁移的基础条件已经满足。
- 实施前 `functionMetrics` 公开 `scanner.executable` 并执行 Lizard version probe 与 CSV subprocess；当前 source tree 已由产品自有 analyzer 替换该路径，public options、runtime validation、environment/Gate 注入与 stable docs 均不再提供该配置。
- 产品 owner 已确认完整移除 Python/Lizard runtime，接受拥有当前 27 readers / 55 extensions 的迁移与维护成本，并偏好接近上游结构和行为的翻译以降低兼容风险。
- Python 与 TypeScript 的运行模型不同，逐字符或逐行对应不能代替可执行的语义兼容；必要的宿主、类型、资源和安全差异必须显式记录和验证。
- candidate/installed evidence、workspace required/full Gate 与 stable owner docs 已共同验证完整 hard cut。详细每次运行证据属于 active Change 的 verification task；本记录只说明长期方向已成为当前事实。

## 决策

- 采用: 首轮 hard cut 曾以 pinned Lizard 1.23 source revision 完成；当前 baseline 由独立 Change 固定为 Lizard 1.24.0 tag `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`，继续以当前 public `functionMetrics` contract 覆盖全部当前 reader 与 extension。后续升级仍不得混入该首次 backend hard cut。
- 采用: TypeScript analyzer 保留 in-range module/class/function/field/state/processor lifecycle：先完成 core、shared reader dependencies 与 internal extension protocol，再对 reader/family 进行 fidelity review。启用 reader 时保持 upstream tokenization、function boundary、名称、范围、NLOC、CCN 与参数计数语义；不以性能、简化或统一为由主动改变语义。
- 采用: 每个上游 source/range 建立 target 或 exclusion 的可审计映射，状态只可为 `translated`、`deferred-extension-body` 或 `excluded-entry-surface`。19 个明确列出的 optional concrete extension body 仅可 deferred 且默认不注册；CLI/file/output/version 外围 surface 仅按明确 range excluded。因语言类型系统、Bun runtime、取消、资源安全或公共 contract 必须产生的差异逐项进入 deviation ledger 并有 differential evidence，不用“等比翻译”掩盖差异。
- 采用: source tree 使用 Product-owned backend，并删除 Python/Lizard dependency、probe/process/CSV adapter、production fallback 与 public `scanner.executable`。candidate、installed-consumer 与 workspace Gate 共同证明这项 hard cut 的交付，不恢复外部 backend 或 fallback。
- 采用: public option 删除在下一预稳定 `0.0.x` 版本以 types、runtime validation、文档、release note 与 consumer acceptance 完整表达；不保留 deprecation、compatibility shim、dual backend、public parser 或 backend/plugin selection。
- 采用: analyzer 只消费 owning Check 已批准的 exact paths，并在普通 Check settlement、Record、Finding waiver、final data 与取消边界内工作；翻译上游内部结构不建立 Product-wide scanner framework。
