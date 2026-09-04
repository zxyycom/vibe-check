---
title: 以 owner 协议发布结构化 process Check Records
status: active
alignment: aligned
createdAt: 2026-09-04T14:17:43Z
purpose: 让有稳定工具协议的 Gate process Check 发布逐项安全 Records，同时保留未知或不可信 child failure 的通用 transcript fallback。
background: 通用失败 Record 缺少逐问题定位，直接传播 child text 又会越过持久化安全边界。
decision: 仅让工具 owner 投影经完整验证的 safe Records；不能证明的输出继续保留 transcript 与通用 failure。
tags:
  - configuration
  - workflow-policy
relations: []
---

## 目的
- 让维护者在 Core 的统一 Record presentation 中看到可安全定位的 lint 与 format failures，而不必从 child transcript 中手动筛选每一个问题。
- 保持 Process Check 的单次执行、完整 transcript、four-state outcome 与安全持久化边界，不以更详细的诊断扩大 child output 的公开范围。

## 背景
- Gate 的 generic process adapter 已提供 command、exit/signal 与 invocation-relative transcript reference，但它不拥有 oxlint、oxfmt、Bun、tsgo、Git 或 ast-grep 各自的 failure 语义。
- oxlint 的 JSON 与 oxfmt 的 list-different 是当前安装工具提供的可验证输出协议；Bun JUnit、tsgo、Git diff check 与 ast-grep rule tests 在当前范围内没有无需新依赖或人读文本解析即可安全采用的等价协议。
- supplemental Record 会进入 machine artifacts 与 Core human output，因此 raw message、help、snippet、absolute path、args 与 stdout/stderr 不能成为 Record 或 message 内容。

## 决策
- 采用: 只允许明确的工具 owner 选择并完整验证自己的 structured failure protocol。当前实现范围仅有 oxlint JSON diagnostics 与 oxfmt list-different paths；其它 Gate process Check 没有由本 Decision 授权的 structured projection。
- 采用: owner Record 的 identity 与 data 只能使用固定 `kind`、closed severity、validated location、occurrence、owner-approved canonical relative path 和 rule。path 只允许 ASCII 字母、数字、`.`、`_`、`-`、`/`；rule 只允许 lowercase identifier、最多一段 `/` 与一层 parenthesized identifier。`:`、`@`、`?`、`#`、`=` 等 free-text 或 credential 风险字符必须拒绝。
- 采用: shared process base 始终先建立 settled transcript。只有 nonzero exit 的**整个** owner projection 都能通过验证时，才发布逐项 Records；任一 parse、schema、path、identity 或 safety boundary 失败时不得发布 partial owner Records，而是保留唯一 generic `command-failure` Record。
- 采用: Core 是唯一的 Record preview owner。工具 adapter 不复制或重新实现 preview；raw child output、tool message/help/snippet、absolute root、command arguments、credential URL 与 digest 只留在 private transcript。
- 不采用: 依据 command/argv 在 generic adapter 内猜测工具；解析 human-oriented tsgo、Git、ast-grep 或 Bun 输出；为本 Change 新增 XML parser；或为了结构化输出替换必要子进程。
