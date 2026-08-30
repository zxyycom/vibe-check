---
title: 让选中文件与 Check eligibility 完整对账
status: active
alignment: aligned
createdAt: 2026-08-30T15:52:43Z
purpose: 让文件型 Check 对每个已选路径明确形成接受输入或非阻断拒绝 Finding。
background: 形成决策时，三项 Check 在 files selection 后静默过滤不支持的文件类型，调用方无法观察输入未被处理。
decision: 从通用文件基线派生 Check-specific 默认范围，并让所有 Check-owned eligibility filter 完整发布 rejected input facts。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: publish-composable-default-project-file-selection.md
---

## 目的

- 让调用方能确认自己通过 owning Check 的 files policy 选中的每个路径是否真正进入领域处理。
- 让默认配置以精准输入范围降低噪声，同时不因显式输入数量较大而隐藏任何拒绝事实。
- 保持文件类型资格、Record 与终态语义由 producing Check 拥有，不建立 Product-wide 文件语言判断。

## 背景

- `source/include/exclude` 只确定 selected paths；function-metrics、JSON validation 与 Markdown Link 随后分别按受支持 extension 再次过滤。
- 形成决策时，这些 rejected paths 不产生 Record、message 或 final count，因而与从未被调用方选中无法区分。
- 公开 `defaultProjectFileSelection` 的通用 `include: ["**/*"]` 适合显式组合基线，但每项 Check 原样物化该 include 会把无关文件类型隐式选中；降噪应改进默认匹配，不应省略已选拒绝事实。
- duplicate/file metrics 会把 Product 接受的 exact paths 交给 scanner，JSON Schema files 是声明路径授权范围；scanner 是否省略 output 与 Check-owned eligibility rejection 是不同问题。

## 决策

- 采用：继续公开深冻结、可组合的 `defaultProjectFileSelection` 及其通用 source/include/exclude；它不是所有 Check 必须原样采用的完整 work set。package-provided Check 可以从其 source/exclude 派生与自身 eligibility 一致的默认 include，且不发布重复的公共默认对象。
- 采用：files policy 形成 selected paths 后，任何 Check-owned supported-file filter 必须把完整集合确定性对账为 accepted 与 rejected；两者不相交且并集等于 selected，不能静默丢弃 rejected path。
- 采用：每个 rejected path 由 owning Check 发布一条稳定、non-blocking `input-rejected` Finding 和汇总 warning；显式宽泛 include 的全部拒绝必须保留，调用方通过更精准的 include/exclude 降噪。
- 采用：Record 字段、final count、area 关系与 passed/failed settlement 保持 Check-owned。all-rejected 是已完成分类并产生非阻断 Finding 的正常 completed result；真正 zero selected 才是 `not-applicable`。
- 采用：当前规则适用于 function-metrics、JSON validation 与 Markdown Link 的 Product-owned eligibility filter。已经交给外部 backend 的 exact input 是否产生 output 需要 backend-specific 事实，不能由本规则推断为 rejection。
- 不采用：Product-wide file type registry、静默抑制开关、只报首项或总数而不保留 per-path Record、把拒绝升级为 blocking，或读取内容猜测文件类型。
