---
title: 为严格 JSON 文档边界采用 Momoa
status: active
alignment: aligned
createdAt: 2026-08-24T14:20:04Z
purpose: 让严格 JSON Check 在 Bun 中可靠拒绝 decoded duplicate key，而不由 Product 自行实现完整 JSON parser。
background: 原生 JSON.parse 很轻但会丢失重复成员证据；更小候选要么不满足严格 grammar，要么需要额外双解析与事件状态机。
decision: 在 jsonValidation Check 的私有 strict document boundary 中采用 Momoa，并接受其单入口约 92 KB 的代码面以换取直接可审计的 AST 语义。
tags:
  - dependency-policy
  - product-contract
relations: []
---

## 目的

- 让 `jsonValidation` 能在 object materialization 前，以 decoded property name 稳定发现所有 duplicate key，并保持严格 JSON document 行为。
- 把 parser 的选择限制在 package-private document boundary，避免形成 public parser、AST 或通用 validation framework contract。

## 背景

- `jsonValidation` Check 的 strict document boundary 要求 fatal UTF-8、BOM、完整 JSON grammar、trailing content 与所有 decoded duplicate key 都得到可审计的结果；原生 `JSON.parse` 无法恢复已覆盖的成员。
- `@humanwhocodes/momoa@3.3.12` 默认 strict JSON mode 可保留 object members、decoded string value 和 location，且没有 production dependency；Bun 使用、license 和 artifact 是本决策标记为 aligned 前必须由实际 consumer 验收的证据。
- 尺寸更小的候选并非等价：`lossless-json` 会接受值相同的 duplicate，`json-dup-key-validator` 不满足严格 grammar，Clarinet 必须与原生 parser 双解析并由 adapter 自行维护事件状态与 private types。

## 决策

- 采用: 在 `jsonValidation` Check 的 package-private strict document boundary 中采用 `@humanwhocodes/momoa@3.3.12`，使用其 strict JSON parse 和 object-member AST 观察 decoded duplicate key。
- 采用: 接受其 root ESM entry 约 92 KB 的直接代码面和每个 document 的 AST materialization，以换取比自写 parser 或双解析 streaming adapter 更直接、可审计的语义；它不是 production dependency tree 的体积，Momoa 本身没有 production dependencies。
- 采用: adapter 继续拥有 fatal UTF-8、explicit BOM、bounded read、closed reason、safe Record data、pointer/location 是否公开以及错误归一化；不得公开 Momoa AST、parser type、native Error、原始 JSON 或 source excerpt。
- 采用: 只有在 Bun import、strict error matrix、decoded direct/nested duplicate、license、production dependency closure、candidate artifact 与 isolated consumer 都通过后，才把本决策标为 aligned。
- 不采用: 为节省几十 KB 而引入不能证明 strict document semantics 的小型 parser，或把 Momoa 的 tokenizer/printer/traverse 变成公开 Product capability。
