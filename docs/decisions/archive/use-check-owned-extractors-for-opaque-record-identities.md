---
title: 使用 Check-owned extractor 生成 opaque Record identity
status: archived
alignment: unaligned
createdAt: 2026-08-21T03:35:54Z
purpose: 让 Record identity 跨运行稳定且不依赖源码位置，同时不要求 machine consumer 重放 private Check 逻辑。
background: Consumer 只需要 stable ID；公开 identity fields 并重算 hash 不能证明 artifact authenticity。
decision: Check 从 typed fields 提取 identity text，Product 生成 opaque ID；Core 与 machine 不保留其输入。
tags:
  - configuration
  - product-contract
relations:
  - type: 替代
    target: use-location-independent-record-identities.md
---

## 目的

- 让同一语义 Record 在无关 location、message 与 arrival order 变化时保持 stable identity、comparison、acceptance 与 reference 结果。
- 让 producing Check 明确拥有领域 identity semantics，同时由 Product 统一提供 namespace、normalization、hash grammar 与 conflict handling。
- 让 machine consumer 把 `recordId` 作为 opaque stable reference，而不是依赖无法序列化的 Check function 或完整 field contract。

## 背景

- 当前 identity 由 catalog `identityFields` 选择 Record fields，runtime 与 machine 据此重算 `recordId`；这把 field selector 升级成 public contract。
- Comparison、acceptance、reference、policy evidence 与 annotation 实际只需要 stable、unique `recordId`，不需要知道它由哪些 fields 产生。
- Machine artifacts 没有 signature；能从公开 fields 重算 ID 与 fingerprint 只能证明内部一致，不能证明来源真实性，修改者也能重算二者。
- Check execution 本来就是 trusted Project code。Typed extractor 可以直接表达领域 identity，而 Product 仍可拒绝本次 throw、非法返回与 conflict。

## 决策

- 采用：每个 authored Record type 提供 private `identify(fields) => string` 等效 extractor；其参数由对应 Check-owned Record generic 进行 contextual typing。Function 只保留在 normalized execution binding，不进入 Core Check、catalog fingerprint 或 machine artifact。
- 采用：Product 对 frozen canonical JSON fields snapshot 调用 extractor，拒绝 throw、non-string 或 empty string，按固定规则 normalize identity text，再与 `checkId`、`recordTypeId` 和 normalized `semanticSubject` 生成新的 versioned opaque `recordId`。
- 采用：Product 只把 fields snapshot 作为 extractor 参数，不提供 Record location、message 或 arrival order。Trusted function 仍可能读取 closure state；producing Check 负责保持它跨运行 deterministic，并把不兼容变化作为 `recordTypeId` compatibility 变化或显式迁移处理。
- 采用：需要区分同一 semantic subject 下多个领域事实时，Check 从 typed fields 返回确定文本；只依赖 semantic subject 的 Record type 可以使用显式 non-empty constant extractor。
- 采用：Report 与 reference 使用同一 extractor。Reference input 可以在 invocation memory 中携带 typed fields，但 final facts 只保留 resolved `recordId` 与必要 reference/relation metadata，不公开 identity text。
- 采用：Core 与 machine 把 `recordId` 视为 opaque identity。Validator 只检查 versioned grammar、唯一性、Check/Record type ownership、canonical order、references 与 Records set fingerprint，不从 fields 重算 ID。
- 采用：当前源码 location 继续独立服务展示与导航；path 或其它领域值只有在 producing Check 明确把相应 typed field 用于 extractor 时才影响 identity。
- 不采用：`identityFields`、public selector grammar、serialized function、author-provided final `recordId`，或以可重算性冒充 artifact authenticity。
